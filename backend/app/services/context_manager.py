TOKEN_LIMIT = 8_000
MAX_RECENT  = 10


def estimate_tokens(text: str) -> int:
    """4글자 = 1토큰 근사"""
    return max(1, len(text) // 4)


class ContextManager:

    def needs_compression(self, histories: list) -> bool:
        return sum(h.token_count for h in histories) > TOKEN_LIMIT

    def build_context(self, game, histories: list) -> list:
        """Claude에 보낼 messages 배열 구성"""
        messages = []

        if self.needs_compression(histories):
            summary = game.summary or "게임 시작"
            messages.append({"role": "user",      "content": f"[이전 기록 요약]\n{summary}"})
            messages.append({"role": "assistant",  "content": "이전 기록을 기억하겠습니다."})
            histories = list(histories)[-MAX_RECENT:]

        for h in histories:
            messages.append({
                "role":    "user" if h.role == "player" else "assistant",
                "content": h.content,
            })

        # API requires first message to be user — preserve opening by prepending a marker
        if messages and messages[0]["role"] == "assistant":
            messages.insert(0, {"role": "user", "content": "[게임 시작]"})

        return messages

    async def compress_if_needed(self, game, histories: list, db, async_client) -> None:
        """토큰 초과 시 요약 생성 후 game.summary 업데이트 (non-blocking)"""
        if not self.needs_compression(histories):
            return

        old_histories = list(histories)[:-MAX_RECENT]
        old_content = "\n".join(
            f"{'플레이어' if h.role == 'player' else 'GM'}: {h.content[:300]}"
            for h in old_histories
        )
        summary_prompt = f"다음 RPG 게임 기록을 3~5문장으로 요약하세요:\n\n{old_content}"

        try:
            response = await async_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                max_tokens=512,
                messages=[{"role": "user", "content": summary_prompt}],
            )
            game.summary = response.choices[0].message.content
            db.commit()
        except Exception:
            pass  # 요약 실패해도 게임 진행은 유지


context_mgr = ContextManager()
