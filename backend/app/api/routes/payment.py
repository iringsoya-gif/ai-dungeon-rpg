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

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{POLAR_API_URL}/checkouts/",
            headers={
                "Authorization": f"Bearer {POLAR_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "product_id":     POLAR_PRODUCT_ID,
                "success_url":    f"{FRONTEND_URL}/payment/success",
                "cancel_url":     f"{FRONTEND_URL}/pricing",
                "customer_email": current_user.email,
                "metadata":       {"user_id": str(current_user.id)},
            },
        )
    data = res.json()
    if res.status_code != 201:
        raise HTTPException(500, f"Polar 결제 생성 실패: {data}")
    return {"checkout_url": data["url"]}


@router.post("/webhook")
async def polar_webhook(request: Request, db: Session = Depends(get_db)):
    body      = await request.body()
    signature = request.headers.get("webhook-signature", "")
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


@router.get("/status")
def payment_status(current_user: User = Depends(get_current_user)):
    return {"plan": current_user.plan, "is_paid": current_user.plan == "paid"}
