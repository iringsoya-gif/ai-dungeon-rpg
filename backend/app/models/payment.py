from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    polar_order_id = Column(String, unique=True)
    status         = Column(String)   # paid | refunded
    created_at     = Column(DateTime, default=datetime.utcnow)
