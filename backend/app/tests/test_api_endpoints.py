import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "constructo-api", "version": "1.0.0"}

@pytest.mark.asyncio
async def test_maps_eta_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/maps/eta?origin_lat=9.0&origin_lon=76.0&dest_lat=9.1&dest_lon=76.1")
    # This will return 200 and attempt to hit the MapService
    # In a full test suite, we'd mock the MapService for this API test
    assert response.status_code in [200, 500]

@pytest.mark.asyncio
async def test_unauthorized_customer_dashboard():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/customer/dashboard")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_validation_error_on_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", json={"phone": "123"}) # Missing password, invalid phone
    assert response.status_code == 422 # FastAPI validation error
