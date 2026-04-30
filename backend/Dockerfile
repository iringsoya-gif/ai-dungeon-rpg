FROM python:3.11-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev
COPY . .
COPY start.sh ./start.sh
RUN chmod +x start.sh
CMD ["./start.sh"]