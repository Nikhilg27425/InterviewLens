from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/interviewlens"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    JUDGE0_URL: str = "https://ce.judge0.com"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    ENV: str = "development"

    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URI: str = "http://localhost:5173/auth/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Email (candidate invites). Leave SMTP_HOST empty to write emails to
    # EMAIL_OUTBOX_DIR instead of sending them — handy for local development.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True          # STARTTLS on 587; set False and use port 465 for implicit SSL
    EMAIL_FROM: str = "InterviewLens <no-reply@interviewlens.local>"
    EMAIL_OUTBOX_DIR: str = "outbox"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
