from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database - SQLite for dev, PostgreSQL for prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./wteo.db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Wing Tsun & Escrima School Management"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
