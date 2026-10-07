import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield Session
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def anon_client(session_factory):
    return TestClient(app)


@pytest.fixture()
def new_user_client(session_factory):
    """Factory returning a client signed in as a freshly registered user."""

    def factory(email="test@example.com", name="Test User", password="password123"):
        c = TestClient(app)
        r = c.post("/api/auth/signup", json={"name": name, "email": email, "password": password})
        assert r.status_code == 201, r.text
        c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        return c

    return factory


@pytest.fixture()
def client(new_user_client):
    return new_user_client()
