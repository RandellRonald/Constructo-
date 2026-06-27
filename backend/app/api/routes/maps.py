"""
Maps API Router — exposes OSRM routing and Nominatim geocoding as REST endpoints.
"""
from fastapi import APIRouter, Query
from app.services.route_service import RouteService
from app.services.geocoding_service import GeocodingService

router = APIRouter()


@router.get("/route")
async def get_route(
    origin_lat: float = Query(..., description="Origin latitude"),
    origin_lon: float = Query(..., description="Origin longitude"),
    dest_lat: float = Query(..., description="Destination latitude"),
    dest_lon: float = Query(..., description="Destination longitude"),
):
    """Get driving route geometry, distance, and ETA via OSRM."""
    result = await RouteService.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "message": "Route calculation failed", "data": None}


@router.get("/eta")
async def get_eta(
    origin_lat: float = Query(...),
    origin_lon: float = Query(...),
    dest_lat: float = Query(...),
    dest_lon: float = Query(...),
):
    """Get estimated driving time in minutes via OSRM."""
    eta = await RouteService.get_eta(origin_lat, origin_lon, dest_lat, dest_lon)
    return {"success": True, "data": {"duration_min": eta}}


@router.get("/distance")
async def get_distance(
    origin_lat: float = Query(...),
    origin_lon: float = Query(...),
    dest_lat: float = Query(...),
    dest_lon: float = Query(...),
):
    """Get driving distance in km via OSRM."""
    dist = await RouteService.get_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    return {"success": True, "data": {"distance_km": dist}}


@router.get("/nearest")
async def snap_to_road(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """Snap coordinates to nearest drivable road via OSRM nearest service."""
    result = await RouteService.snap_to_road(lat, lon)
    if result:
        return {"success": True, "data": result}
    return {"success": False, "message": "Snap to road failed", "data": None}


@router.get("/search")
async def search_address(
    q: str = Query(..., min_length=2, description="Search query"),
):
    """Search for addresses and places via Nominatim."""
    results = await GeocodingService.search_address(q)
    return {"success": True, "data": results}


@router.get("/reverse-geocode")
async def reverse_geocode(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """Reverse geocode coordinates to address string via Nominatim."""
    address = await GeocodingService.reverse_geocode(lat, lon)
    if address:
        return {"success": True, "data": {"address": address}}
    return {"success": False, "message": "Reverse geocoding failed", "data": None}
