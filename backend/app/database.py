import os
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DEFAULT_SQLITE = f"sqlite:///{Path(__file__).resolve().parent.parent / 'tasks.db'}"


def normalize_database_url(url: str) -> str:
    """Pin the PostgreSQL driver to psycopg2 (the one in requirements.txt).

    Hosts hand out "postgres://" or "postgresql://" URLs; SQLAlchemy rejects the first and picks
    a version-dependent default driver for the second (psycopg 3 since SQLAlchemy 2.1).
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix):]
    return url


DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", DEFAULT_SQLITE))

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]
