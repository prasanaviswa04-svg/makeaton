import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "Brightloop Subscription Management System"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brightloop-super-secure-secret-key-2026-odoo-hackathon")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/brightloop.db")

settings = Settings()
