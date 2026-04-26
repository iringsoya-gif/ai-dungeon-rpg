from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(String, unique=True, nullable=False)
    name       = Column(String)
    picture    = Column(String)
    google_id  = Column(String, unique=True)
    plan       = Column(String, default="free")  # free | paid
    created_at = Column(DateTime, default=datetime.utcnow)
