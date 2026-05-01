from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import httpx, hmac, hashlib, json

from app.core.database import get_db
from app.core.config import (
    POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID,
    POLAR_WEBHOOK_SECRET, FRONTEND_URL,
)
from app.api.deps import get_current_user
from app.models.user import User
from app.models.payment import Payment

router = APIRouter()
POLAR_API_URL = "https://api.polar.sh/v1"


@router.post("/checkout")
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.plan == "paid":
        raise HTTPException(400, "이미 결제하셨습니다")

    if not POLAR_ACCESS_TOKEN or not POLAR_PRODUCT_ID:
        raise HTTPException(503, "결제 설정이 완료되지 않았습니다. 관리자에게 문의하세요.")

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            f"{POLAR_API_URL}/checkouts/",
            headers={
                "Authorization": f"Bearer {POLAR_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "product_id":     POLAR_PRODUCT_ID,
                "success_url":    f"{FRONTEND_URL}/payment/success",
                "customer_email": current_user.email,
                "metadata":       {"user_id": str(current_user.id)},
            },
        )

    if res.status_code not in (200, 201):
        raise HTTPException(
            502,
            f"결제 페이지 생성 실패 (Polar {res.status_code}): {res.text[:300]}"
        )

    data = res.json()
    checkout_url = data.get("url") or data.get("checkout_url")
    if not checkout_url:
        raise HTTPException(502, f"Polar 응답에 URL 없음: {data}")
    return {"checkout_url": checkout_url}


@router.post("/webhook")
async def polar_webhook(request: Request, db: Session = Depends(get_db)):
    body      = await request.body()
    signature = request.headers.get("webhook-signature", "")

    if not POLAR_WEBHOOK_SECRET:
        raise HTTPException(500, "웹훅 시크릿이 설정되지 않았습니다")

    expected  = hmac.new(POLAR_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(f"sha256={expected}", signature):
        raise HTTPException(400, "서명 검증 실패")

    event      = json.loads(body)
    event_type = event.get("type")
    data       = event.get("data", {})

    if event_type in ["order.paid", "subscription.active"]:
        email = data.get("customer", {}).get("email")
        user  = db.query(User).filter(User.email == email).first()
        if not user:
            user_id = data.get("metadata", {}).get("user_id")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = "paid"
            db.add(Payment(
                user_id=user.id,
                polar_order_id=data.get("id"),
                status="paid",
            ))
            db.commit()

    elif event_type == "order.refunded":
        payment = db.query(Payment).filter(
            Payment.polar_order_id == data.get("id")
        ).first()
        if payment:
            payment.status = "refunded"
            user = db.query(User).filter(User.id == payment.user_id).first()
            if user:
                user.plan = "free"
            db.commit()

    return {"status": "ok"}


@router.post("/verify")
async def verify_checkout(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """결제 성공 페이지에서 checkout_id로 직접 검증 후 플랜 업그레이드"""
    checkout_id = body.get("checkout_id")
    if not checkout_id:
        raise HTTPException(400, "checkout_id 없음")
    if current_user.plan == "paid":
        return {"plan": "paid", "upgraded": False}

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"{POLAR_API_URL}/checkouts/{checkout_id}",
            headers={"Authorization": f"Bearer {POLAR_ACCESS_TOKEN}"},
        )

    if res.status_code != 200:
        raise HTTPException(502, f"Polar 검증 실패: {res.text[:200]}")

    data   = res.json()
    status = data.get("status", "")

    PAID_STATUSES = {"confirmed", "succeeded", "paid", "complete", "completed"}
    if status.lower() in PAID_STATUSES:
        current_user.plan = "paid"
        existing = db.query(Payment).filter(
            Payment.polar_order_id == checkout_id
        ).first()
        if not existing:
            db.add(Payment(
                user_id=current_user.id,
                polar_order_id=checkout_id,
                status="paid",
            ))
        db.commit()
        return {"plan": "paid", "upgraded": True}

    return {"plan": current_user.plan, "upgraded": False, "checkout_status": status}


@router.post("/sync")
async def sync_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Polar 주문 내역으로 플랜 동기화 (결제 후 플랜 미반영 시 수동 복구용)"""
    if current_user.plan == "paid":
        return {"plan": "paid", "upgraded": False}

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"{POLAR_API_URL}/orders/",
            headers={"Authorization": f"Bearer {POLAR_ACCESS_TOKEN}"},
            params={"customer_email": current_user.email, "product_id": POLAR_PRODUCT_ID},
        )

    if res.status_code != 200:
        raise HTTPException(502, f"Polar 조회 실패: {res.text[:200]}")

    orders = res.json().get("items", [])
    paid_order = next(
        (o for o in orders if o.get("status") in {"paid", "succeeded", "confirmed", "complete"}),
        None,
    )

    if paid_order:
        current_user.plan = "paid"
        existing = db.query(Payment).filter(
            Payment.polar_order_id == paid_order.get("id")
        ).first()
        if not existing:
            db.add(Payment(
                user_id=current_user.id,
                polar_order_id=paid_order.get("id"),
                status="paid",
            ))
        db.commit()
        return {"plan": "paid", "upgraded": True}

    return {"plan": "free", "upgraded": False, "orders_found": len(orders)}


@router.get("/status")
def payment_status(current_user: User = Depends(get_current_user)):
    return {"plan": current_user.plan, "is_paid": current_user.plan == "paid"}
