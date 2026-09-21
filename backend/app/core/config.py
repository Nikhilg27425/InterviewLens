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

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
