from fastapi.testclient import TestClient
from app.main import app


def test_shell_health_does_not_claim_generation():
    with TestClient(app) as client:
        for path in ("/health/live", "/health/ready"):
            response = client.get(path, headers={"X-Request-ID": "untrusted"})
            assert response.status_code == 200
            assert response.json()["capabilities"] == ["health-only"]
            assert response.headers["X-Request-ID"] != "untrusted"
        assert client.post("/generate", json={"prompt": "example"}).status_code == 404
        assert "/generate" not in client.get("/openapi.json").json()["paths"]
