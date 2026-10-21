from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "QuickCommerce AI Service"
    PORT: int = 8000
    OPENAI_API_KEY: str = ""
    MONGO_URI: str = "mongodb://localhost:27017/quick-commerce"
    REDIS_URL: str = "redis://localhost:6379"
    # Comma-separated, e.g. "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Empty = auth off (local). Production mein value set karo.
    AI_API_KEY: str = ""
    RATE_LIMIT_PER_MINUTE: int = 60

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()