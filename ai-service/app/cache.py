"""Cache kết quả trích xuất theo SHA-256 của file, tránh gọi Gemini lặp lại khi demo."""
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

from app.config import settings

log = logging.getLogger("ai.cache")

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
# Tăng khi đổi prompt, schema hoặc hậu xử lý để bỏ qua cache cũ
PROMPT_VERSION = "v7"


def file_key(file_bytes: bytes, doc_type_hint: Optional[str]) -> str:
    h = hashlib.sha256(file_bytes).hexdigest()
    return f"{settings.gemini_model}_{PROMPT_VERSION}_{doc_type_hint or 'NA'}_{h}"


def get(key: str) -> Optional[dict]:
    if not settings.cache_enabled:
        return None
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
    return None


def put(key: str, value: dict) -> None:
    if not settings.cache_enabled:
        return
    try:
        CACHE_DIR.mkdir(exist_ok=True)
        (CACHE_DIR / f"{key}.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    except OSError as e:
        log.warning("Không ghi được cache: %s", e)
