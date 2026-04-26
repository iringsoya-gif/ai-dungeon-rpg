from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class History(Base):
    __tablename__ = "histories"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id     = Column(UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"))
    turn        = Column(Integer, nullable=False)
    role        = Column(String, nullable=False)   # player | gm
    content     = Column(Text, nullable=False)
    state_diff  = Column(Text)
    token_count = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
