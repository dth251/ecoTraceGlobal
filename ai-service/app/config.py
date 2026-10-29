from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Đọc .env theo đường dẫn tuyệt đối để chạy được từ thư mục bất kỳ (uvicorn, streamlit, scripts)
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    mock_mode: bool = False
    max_file_mb: int = 10
    review_threshold: float = 0.7
    cache_enabled: bool = True


settings = Settings()
