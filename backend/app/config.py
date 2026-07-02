from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path

DEFAULT_SECRET_KEY = "wteo-dev-secret-key-change-in-production"


class Settings(BaseSettings):
    # Database - SQLite for dev, PostgreSQL for prod
    DATABASE_URL: str = "sqlite+aiosqlite:///./wteo.db"

    # JWT - .env dosyasından okunur, varsayılan değer yalnızca dev içindir
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Wing Tsun & Escrima School Management"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"

    # Upload
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    # Mail (SMTP)
    MAIL_ENABLED: bool = False
    MAIL_HOST: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USER: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@yourschool.com"
    MAIL_FROM_NAME: str = "Wing Tsun & Escrima"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @model_validator(mode="after")
    def _validate_production_secret_key(self) -> "Settings":
        if self.is_production:
            if self.SECRET_KEY == DEFAULT_SECRET_KEY:
                raise ValueError(
                    "SECRET_KEY varsayilan degerde birakilmis. "
                    "Uretimde 'python -c \"import secrets; print(secrets.token_urlsafe(32))\"' "
                    "ile uretilen guclu bir deger kullanin."
                )
            if len(self.SECRET_KEY) < 32:
                raise ValueError(
                    f"SECRET_KEY en az 32 karakter olmalidir (su an {len(self.SECRET_KEY)})."
                )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
