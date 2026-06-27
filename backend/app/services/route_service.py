"""
Route Service using OSRM APIs.
"""
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org"

class RouteService:
    """Wrapper service for OSRM routing, Snap to Road, and Distance Table calculations."""

    @staticmethod
    async def get_route(
        origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> Optional[Dict[str, Any]]:
        """Get driving route geometry and information using OSRM route service."""
        url = f"{OSRM_BASE_URL}/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        distance_m = route["distance"]
                        duration_sec = route["duration"]
                        geometry = route["geometry"]
                        
                        # Swap lon,lat to lat,lon for frontend mapping
                        coords = [[pt[1], pt[0]] for pt in geometry["coordinates"]]
                        
                        return {
                            "distance_km": round(distance_m / 1000.0, 2),
                            "duration_min": round(duration_sec / 60.0, 1),
                            "coordinates": coords
                        }
        except Exception as e:
            logger.error(f"OSRM routing query failed: {e}")
        return None

    @staticmethod
    async def get_alternative_routes(
        origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> List[Dict[str, Any]]:
        """Get alternative routes between origin and destination."""
        url = f"{OSRM_BASE_URL}/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true"
        }
        routes_list = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        for route in data["routes"]:
                            distance_m = route["distance"]
                            duration_sec = route["duration"]
                            geometry = route["geometry"]
                            coords = [[pt[1], pt[0]] for pt in geometry["coordinates"]]
                            routes_list.append({
                                "distance_km": round(distance_m / 1000.0, 2),
                                "duration_min": round(duration_sec / 60.0, 1),
                                "coordinates": coords
                            })
        except Exception as e:
            logger.error(f"OSRM alternatives query failed: {e}")
        return routes_list

    @staticmethod
    async def get_distance(
        origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> float:
        """Get driving distance in kilometers between two points."""
        route = await RouteService.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
        if route:
            return route["distance_km"]
        return 0.0

    @staticmethod
    async def get_eta(
        origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> float:
        """Get driving duration in minutes between two points."""
        route = await RouteService.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
        if route:
            return route["duration_min"]
        return 0.0

    @staticmethod
    async def get_provider_eta_matrix(
        customer_lat: float, customer_lon: float, provider_coords: List[Dict[str, float]]
    ) -> List[Dict[str, Any]]:
        """
        Rank providers by ETA using OSRM Table Service.
        provider_coords: List of {"id": int, "latitude": float, "longitude": float}
        """
        if not provider_coords:
            return []

        # Construction of OSRM Table URL: provider_1; provider_2; ... ; customer
        coords_str_list = []
        for p in provider_coords:
            coords_str_list.append(f"{p['longitude']},{p['latitude']}")
        coords_str_list.append(f"{customer_lon},{customer_lat}")

        coords_path = ";".join(coords_str_list)
        url = f"{OSRM_BASE_URL}/table/v1/driving/{coords_path}"
        
        # Sources are provider indices (0 to N-1), destination is customer index (N)
        n = len(provider_coords)
        sources = ";".join(str(i) for i in range(n))
        destinations = str(n)

        params = {
            "sources": sources,
            "destinations": destinations,
            "annotations": "duration,distance"
        }
        
        results = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and "durations" in data:
                        durations = data["durations"] # list of lists: [[dur1], [dur2], ...]
                        distances = data.get("distances", [[0] for _ in range(n)])
                        
                        for i, p in enumerate(provider_coords):
                            duration_sec = durations[i][0] if durations[i] else 0.0
                            distance_m = distances[i][0] if distances[i] else 0.0
                            results.append({
                                "provider_id": p["id"],
                                "distance_km": round((distance_m or 0.0) / 1000.0, 2),
                                "duration_min": round((duration_sec or 0.0) / 60.0, 1)
                            })
                        # Sort by duration
                        results.sort(key=lambda x: x["duration_min"])
                        return results
        except Exception as e:
            logger.error(f"OSRM table query failed: {e}")
            
        # Fallback to straight-line estimation if OSRM Table fails
        from app.services.map_service import haversine_distance
        for p in provider_coords:
            dist = haversine_distance(p["latitude"], p["longitude"], customer_lat, customer_lon)
            results.append({
                "provider_id": p["id"],
                "distance_km": round(dist * 1.15, 2),
                "duration_min": round((dist * 1.15 / 40.0) * 60.0, 1)
            })
        results.sort(key=lambda x: x["duration_min"])
        return results

    @staticmethod
    async def snap_to_road(lat: float, lon: float) -> Optional[Dict[str, float]]:
        """Snap coordinates to nearest drivable road using OSRM nearest service."""
        url = f"{OSRM_BASE_URL}/nearest/v1/driving/{lon},{lat}"
        params = {"number": 1}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("waypoints"):
                        wp = data["waypoints"][0]
                        pt = wp["location"]
                        return {
                            "latitude": pt[1],
                            "longitude": pt[0]
                        }
        except Exception as e:
            logger.error(f"OSRM nearest query failed: {e}")
        return None
