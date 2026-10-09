import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "QuickCommerce AI Service"
    PORT: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()