import logging
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models import Base

log = logging.getLogger("ai.database")

db_url = settings.database_url or "postgresql+psycopg2://postgres:postgres@localhost:5432/ecotrace_ai"

# Chuẩn hóa postgresql URL cho psycopg2
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Tự động tạo thư mục chứa file SQLite nếu chưa có
if db_url.startswith("sqlite:///"):
    sqlite_path = db_url.replace("sqlite:///", "")
    p = Path(sqlite_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Tạo tất cả các bảng CSDL nếu chưa tồn tại."""
    try:
        Base.metadata.create_all(bind=engine)
        log.info("AI Service PostgreSQL Database tables verified/created successfully.")
    except Exception as e:
        log.error("Failed to initialize database: %s", e)


def get_db() -> Generator[Session, None, None]:
    """Dependency cho FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
