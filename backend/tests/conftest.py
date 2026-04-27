import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///./test.db"
engine_test = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(autouse=True)
def mock_ai_opening():
    """모든 테스트에서 generate_opening을 자동 모킹 — 실제 API 호출 방지"""
    mock_choice = MagicMock()
    mock_choice.message.content = "테스트 오프닝 텍스트입니다."
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    with patch("app.services.ai_gm.client.chat.completions.create", return_value=mock_resp):
        yield


@pytest.fixture(autouse=True)
def setup_db():
    # 테스트용 모델 import (메타데이터 등록)
    import app.models.user    # noqa: F401
    import app.models.game    # noqa: F401
    import app.models.history # noqa: F401
    import app.models.payment # noqa: F401
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()
