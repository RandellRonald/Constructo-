"""
Geocoding Service using OpenStreetMap Nominatim API.
"""
import logging
from typing import Optional, List, Dict, Any
import httpx

logger = logging.getLogger(__name__)

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "ConstructoApp/1.0 (contact@constructo.in)"}

class GeocodingService:
    """Wrapper service for OSM Nominatim geocoding and search services."""

    @staticmethod
    async def reverse_geocode(lat: float, lon: float) -> Optional[str]:
        """Reverse geocode coordinates to get address string."""
        url = f"{NOMINATIM_BASE_URL}/reverse"
        params = {
            "format": "json",
            "lat": lat,
            "lon": lon,
            "addressdetails": 1
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params, headers=HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    # Return the full formatted address name or individual details if needed
                    return data.get("display_name")
        except Exception as e:
            logger.error(f"Nominatim reverse geocode failed: {e}")
        return None

    @staticmethod
    async def search_address(query: str) -> List[Dict[str, Any]]:
        """Search address or landmarks and return locations with coordinates."""
        url = f"{NOMINATIM_BASE_URL}/search"
        params = {
            "format": "json",
            "q": query,
            "limit": 10,
            "countrycodes": "in" # Constrain to India for Constructo
        }
        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params, headers=HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    for item in data:
                        results.append({
                            "address": item.get("display_name"),
                            "latitude": float(item.get("lat", 0)),
                            "longitude": float(item.get("lon", 0))
                        })
        except Exception as e:
            logger.error(f"Nominatim address search failed: {e}")
        return results
