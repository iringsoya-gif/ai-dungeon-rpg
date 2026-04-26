import uuid
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.core.database import get_db


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "로그인이 필요합니다")
    token = authorization[len("Bearer "):]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "유효하지 않은 토큰입니다")
    # User 모델은 순환참조 방지를 위해 지연 import
    from app.models.user import User
    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(401, "유효하지 않은 토큰입니다")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "유저를 찾을 수 없습니다")
    return user
