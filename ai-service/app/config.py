from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
DEFAULT_DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    mock_mode: bool = False
    max_file_mb: int = 10
    review_threshold: float = 0.7
    cache_enabled: bool = True
    # Ngưỡng cấp hộ chiếu xanh (đề xuất cho demo, chưa phải quy định chính thức, chỉnh qua biến môi trường)
    passport_min_actual_share: float = 0.8
    passport_min_score: int = 85
    passport_allocation_tolerance_pct: float = 1.0
    database_url: str = f"sqlite:///{DEFAULT_DATA_DIR.as_posix()}/ai_service.db"


settings = Settings()
