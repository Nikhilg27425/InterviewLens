from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List

DEV_SECRET_KEY = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/interviewlens"
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    JUDGE0_URL: str = "https://ce.judge0.com"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    ENV: str = "development"

    # Public base URL of the deployment. Render sets RENDER_EXTERNAL_URL
    # automatically; FRONTEND_URL and OAUTH_REDIRECT_URI default from it.
    RENDER_EXTERNAL_URL: str = ""

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

    # Directory holding the built frontend (served by FastAPI in production)
    STATIC_DIR: str = "static"

    @model_validator(mode="after")
    def _derive(self):
        # Hosting providers hand out postgres:// / postgresql:// URLs; SQLAlchemy's
        # async engine needs the asyncpg driver spelled out
        for prefix in ("postgres://", "postgresql://"):
            if self.DATABASE_URL.startswith(prefix):
                self.DATABASE_URL = "postgresql+asyncpg://" + self.DATABASE_URL[len(prefix):]

        public = self.RENDER_EXTERNAL_URL.rstrip("/")
        if public:
            if "FRONTEND_URL" not in self.model_fields_set:
                self.FRONTEND_URL = public
            if "OAUTH_REDIRECT_URI" not in self.model_fields_set:
                self.OAUTH_REDIRECT_URI = f"{public}/api/auth/oauth/callback"

        if self.ENV == "production" and self.SECRET_KEY == DEV_SECRET_KEY:
            raise ValueError("SECRET_KEY must be set in production")
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
