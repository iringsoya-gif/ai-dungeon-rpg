import os
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")
SECRET_KEY           = os.getenv("SECRET_KEY")
DATABASE_URL         = os.getenv("DATABASE_URL")
GROQ_API_KEY         = os.getenv("GROQ_API_KEY")

POLAR_ACCESS_TOKEN   = os.getenv("POLAR_ACCESS_TOKEN")
POLAR_PRODUCT_ID     = os.getenv("POLAR_PRODUCT_ID")
POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET")

ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY 환경변수가 설정되지 않았습니다")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다")
