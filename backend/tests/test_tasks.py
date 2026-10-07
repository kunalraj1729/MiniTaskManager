import pytest


def make(client, **overrides):
    body = {"title": "Write report", "priority": "Medium", **overrides}
    return client.post("/api/tasks", json=body)


def test_create_defaults_to_pending(client):
    r = make(client, description="  details  ", due_date="2030-01-31")
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "Pending"
    assert data["description"] == "details"
    assert data["due_date"] == "2030-01-31"


def test_create_without_optionals(client):
    r = make(client)
    assert r.status_code == 201
    assert r.json()["description"] is None and r.json()["due_date"] is None


@pytest.mark.parametrize(
    "overrides",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "ab"},
        {"title": "x" * 101},
        {"priority": "Urgent"},
        {"due_date": "not-a-date"},
        {"due_date": "2030-02-30"},
        {"status": "Completed"},
    ],
)
def test_create_validation(client, overrides):
    r = make(client, **overrides)
    assert r.status_code == 422
    assert r.json()["errors"]


def test_missing_priority_rejected(client):
    assert client.post("/api/tasks", json={"title": "Hello"}).status_code == 422


def test_title_boundaries(client):
    assert make(client, title="abc").status_code == 201
    assert make(client, title="x" * 100).status_code == 201


def test_list_ordered_newest_first(client):
    ids = [make(client, title=f"Task {i}").json()["id"] for i in range(3)]
    got = [t["id"] for t in client.get("/api/tasks").json()]
    assert got == ids[::-1]


def test_get_update_keeps_created_at(client):
    created = make(client).json()
    r = client.put(
        f"/api/tasks/{created['id']}",
        json={"title": "New title", "priority": "High", "description": None, "due_date": "2031-05-05"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "New title" and data["priority"] == "High"
    assert data["created_at"] == created["created_at"]
    assert data["status"] == "Pending"
    assert client.get(f"/api/tasks/{created['id']}").json()["title"] == "New title"


def test_update_validation(client):
    created = make(client).json()
    r = client.put(f"/api/tasks/{created['id']}", json={"title": "x", "priority": "Low"})
    assert r.status_code == 422


def test_complete(client):
    t = make(client).json()
    r = client.patch(f"/api/tasks/{t['id']}/complete")
    assert r.status_code == 200 and r.json()["status"] == "Completed"
    assert client.patch(f"/api/tasks/{t['id']}/complete").status_code == 409


def test_delete(client):
    t = make(client).json()
    assert client.delete(f"/api/tasks/{t['id']}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404


@pytest.mark.parametrize(
    "call",
    [
        lambda c: c.get("/api/tasks/999"),
        lambda c: c.put("/api/tasks/999", json={"title": "Valid", "priority": "Low"}),
        lambda c: c.patch("/api/tasks/999/complete"),
        lambda c: c.delete("/api/tasks/999"),
    ],
)
def test_not_found(client, call):
    r = call(client)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"]


def test_search_and_filters_combined(client):
    make(client, title="Buy milk", priority="Low")
    b = make(client, title="Buy bread", priority="High").json()
    make(client, title="Write code", priority="High")
    client.patch(f"/api/tasks/{b['id']}/complete")

    titles = lambda **p: sorted(t["title"] for t in client.get("/api/tasks", params=p).json())
    assert titles(search="BUY") == ["Buy bread", "Buy milk"]
    assert titles(priority="High") == ["Buy bread", "Write code"]
    assert titles(status="Completed") == ["Buy bread"]
    assert titles(search="buy", priority="High", status="Completed") == ["Buy bread"]
    assert titles(search="buy", priority="High", status="Pending") == []
    assert titles(search="%") == []
    assert client.get("/api/tasks", params={"status": "Done"}).status_code == 422
