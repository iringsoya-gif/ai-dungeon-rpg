from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import FRONTEND_URL
from app.core.database import create_tables
from app.api.routes import auth, game, payment


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.models.user    # noqa: F401
    import app.models.game    # noqa: F401
    import app.models.history # noqa: F401
    import app.models.payment # noqa: F401
    create_tables()
    yield


application = FastAPI(title="AI Dungeon RPG API", lifespan=lifespan)

application.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

application.include_router(auth.router,    prefix="/api/v1/auth",    tags=["인증"])
application.include_router(game.router,    prefix="/api/v1/games",   tags=["게임"])
application.include_router(payment.router, prefix="/api/v1/payment", tags=["결제"])


@application.get("/")
def root():
    return {"status": "ok", "service": "AI Dungeon RPG"}


@application.get("/health")
def health():
    return {"status": "ok"}


app = application
