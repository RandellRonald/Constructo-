"""
Map Service Abstraction for Geocoding, Routing, and Distance Matrix.
Uses OpenStreetMap (Nominatim + OSRM) with offline haversine fallback.
"""
import math
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class BaseMapProvider:
    """Base interface for Map Providers."""
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        raise NotImplementedError()

    async def get_route(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()

    async def get_distance_matrix(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()


class OpenStreetMapProvider(BaseMapProvider):
    """OSM/OSRM implementation — primary provider."""
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {"User-Agent": "ConstructoApp/1.0 (contact@constructo.in)"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("display_name")
        except Exception as e:
            logger.warning(f"OSM reverse geocode request failed: {e}")
        return None

    async def get_route(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict[str, Any]]:
        url = f"https://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        distance_m = route["distance"]
                        duration_sec = route["duration"]
                        geometry = route["geometry"]
                        
                        # Swap lon,lat to lat,lon for frontend
                        coords = [[pt[1], pt[0]] for pt in geometry["coordinates"]]
                        
                        return {
                            "provider": "osm",
                            "polyline": "",
                            "distance_km": round(distance_m / 1000.0, 2),
                            "duration_min": round(duration_sec / 60.0, 1),
                            "coordinates": coords
                        }
        except Exception as e:
            logger.warning(f"OSM get_route request failed: {e}")
        return None

    async def get_distance_matrix(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict[str, Any]]:
        url = f"https://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=false"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "distance_km": round(route["distance"] / 1000.0, 2),
                            "duration_min": round(route["duration"] / 60.0, 1)
                        }
        except Exception as e:
            logger.warning(f"OSM get_distance_matrix request failed: {e}")
        return None


class MapService:
    """Facade service supporting geocoding, routing, and matrix operations with automatic fallbacks."""
    
    @staticmethod
    def _get_providers() -> List[BaseMapProvider]:
        providers = []
        # OSM/OSRM (Primary)
        providers.append(OpenStreetMapProvider())
        return providers

    @classmethod
    async def reverse_geocode(cls, lat: float, lon: float) -> str:
        for provider in cls._get_providers():
            try:
                addr = await provider.reverse_geocode(lat, lon)
                if addr:
                    logger.info(f"Reverse geocode succeeded with provider {provider.__class__.__name__}")
                    return addr
            except Exception as e:
                logger.warning(f"Provider {provider.__class__.__name__} failed for reverse geocode: {e}")
        
        # Local offline math fallback
        return f"Unknown Address near ({lat:.4f}, {lon:.4f})"

    @classmethod
    async def get_route(cls, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Dict[str, Any]:
        for provider in cls._get_providers():
            try:
                route = await provider.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
                if route:
                    logger.info(f"Route acquisition succeeded with provider {provider.__class__.__name__}")
                    return route
            except Exception as e:
                logger.warning(f"Provider {provider.__class__.__name__} failed for routing: {e}")

        # Local straight line fallback
        dist = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        # Average speed of 30 km/h
        duration_min = (dist / 30.0) * 60.0
        return {
            "provider": "offline_fallback",
            "polyline": "",
            "distance_km": round(dist, 2),
            "duration_min": max(1.0, round(duration_min, 1)),
            "coordinates": [[origin_lat, origin_lon], [dest_lat, dest_lon]]
        }

    @classmethod
    async def get_distance_matrix(cls, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Dict[str, Any]:
        for provider in cls._get_providers():
            try:
                matrix = await provider.get_distance_matrix(origin_lat, origin_lon, dest_lat, dest_lon)
                if matrix:
                    logger.info(f"Distance matrix calculation succeeded with provider {provider.__class__.__name__}")
                    return matrix
            except Exception as e:
                logger.warning(f"Provider {provider.__class__.__name__} failed for distance matrix: {e}")

        # Local haversine fallback
        dist = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        duration_min = (dist / 30.0) * 60.0
        return {
            "distance_km": round(dist, 2),
            "duration_min": max(1.0, round(duration_min, 1))
        }
