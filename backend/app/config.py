from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
from pathlib import Path
import secrets


class Settings(BaseSettings):
    # Database - SQLite for dev, PostgreSQL for prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./wteo.db"

    # JWT
    # Use an env-provided SECRET_KEY in production. For dev, a random key is
    # generated so the app runs out-of-the-box (not suitable for prod).
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Wing Tsun & Escrima School Management"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"

    # Upload
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
