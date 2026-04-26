from unittest.mock import MagicMock
from app.services.context_manager import ContextManager, estimate_tokens


def test_estimate_tokens():
    assert estimate_tokens("a" * 400) == 100
    assert estimate_tokens("") == 1  # 최솟값


def test_needs_compression_false():
    mgr = ContextManager()
    histories = [MagicMock(token_count=100) for _ in range(10)]  # 1000 토큰
    assert mgr.needs_compression(histories) is False


def test_needs_compression_true():
    mgr = ContextManager()
    histories = [MagicMock(token_count=500) for _ in range(20)]  # 10000 토큰
    assert mgr.needs_compression(histories) is True


def test_build_context_no_compression():
    mgr = ContextManager()
    histories = [
        MagicMock(role="player", content="동쪽으로 간다", token_count=10),
        MagicMock(role="gm",     content="당신은 숲에 도착했다", token_count=15),
    ]
    game = MagicMock(summary=None)
    messages = mgr.build_context(game, histories)
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


def test_build_context_with_compression():
    mgr = ContextManager()
    histories = [MagicMock(role="player", content=f"턴 {i}", token_count=500) for i in range(20)]
    game = MagicMock(summary="이전에 플레이어는 마을을 떠났다")
    messages = mgr.build_context(game, histories)
    # 요약 2개 + 최근 10턴 = 12개
    assert len(messages) == 12
    assert "이전에 플레이어는 마을을 떠났다" in messages[0]["content"]
