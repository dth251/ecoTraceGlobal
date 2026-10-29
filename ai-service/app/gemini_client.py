import logging
import time
from typing import Optional, Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

log = logging.getLogger("ai.gemini")
T = TypeVar("T", bound=BaseModel)


class GeminiError(Exception):
    pass


_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise GeminiError("Thiếu GEMINI_API_KEY")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def generate_structured(
    prompt: str,
    schema: Type[T],
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
    retries: int = 2,
) -> T:
    """Gọi Gemini và ép đầu ra theo schema pydantic."""
    contents: list = []
    if file_bytes is not None:
        contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
    contents.append(prompt)

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.1,
    )
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            resp = _get_client().models.generate_content(
                model=settings.gemini_model, contents=contents, config=config
            )
            if resp.parsed is not None:
                return resp.parsed
            return schema.model_validate_json(resp.text)
        except GeminiError:
            raise
        except Exception as e:  # lỗi mạng, quota, JSON hỏng
            last_err = e
            log.warning("Gemini lỗi lần %d: %s", attempt + 1, e)
            rate_limited = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            time.sleep((20 if rate_limited else 1.5) * (attempt + 1))
    raise GeminiError(f"Gemini thất bại: {last_err}")
