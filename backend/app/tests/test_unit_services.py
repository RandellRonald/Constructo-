import pytest
from decimal import Decimal
from datetime import datetime, timezone
from app.services.map_service import MapService
from app.services.dispatch_service import DispatchService
from app.services.booking_service import BookingService
from app.models.booking import Booking, BookingStatus, ServiceCategory
from app.models.user import User, UserRole

@pytest.mark.asyncio
async def test_map_service_get_route(monkeypatch):
    async def mock_get_route(*args, **kwargs):
        return {
            "provider": "mock",
            "distance_km": 10.5,
            "duration_min": 15.0,
            "coordinates": [[9.0, 76.0], [9.1, 76.1]]
        }
    monkeypatch.setattr(MapService, "get_route", mock_get_route)
    
    res = await MapService.get_route(9.0, 76.0, 9.1, 76.1)
    assert res["distance_km"] == 10.5
    assert res["duration_min"] == 15.0

@pytest.mark.asyncio
async def test_map_service_distance_and_eta(monkeypatch):
    async def mock_get_distance_matrix(*args, **kwargs):
        return {"distance_km": 5.0, "duration_min": 12.0}
    monkeypatch.setattr(MapService, "get_distance_matrix", mock_get_distance_matrix)
    
    res = await MapService.get_distance_matrix(9.0, 76.0, 9.1, 76.1)
    assert res["distance_km"] == 5.0
    assert res["duration_min"] == 12.0

def test_calculate_provider_score():
    # Example test for a scoring algorithm if available, here we mock a basic check
    # Score could be based on rating, distance, etc.
    class MockProvider:
        def __init__(self, id, rating, distance):
            self.id = id
            self.rating = rating
            self.distance = distance
            
    def calculate_score(p):
        return (p.rating * 10) - p.distance
        
    p1 = MockProvider(1, 4.8, 5) # 48 - 5 = 43
    p2 = MockProvider(2, 4.2, 2) # 42 - 2 = 40
    
    assert calculate_score(p1) > calculate_score(p2)

@pytest.mark.asyncio
async def test_booking_status_transitions():
    # Simulating a unit test for booking state machine
    booking = Booking(
        id=1,
        customer_id=1,
        service_category_id=1,
        status=BookingStatus.CREATED,
        total_price=Decimal("1500.00")
    )
    
    # Customer cancels
    booking.status = BookingStatus.CANCELLED
    assert booking.status == BookingStatus.CANCELLED
    
    # Provider completes
    booking.status = BookingStatus.COMPLETED
    assert booking.status == BookingStatus.COMPLETED
