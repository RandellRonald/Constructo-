"""
Coverage engine service – checks geofencing boundaries for booking locations across Kerala hubs.
"""
import math
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class CoverageService:
    """Service to handle geofence coverage checking for construction hubs in Kerala."""

    # Active hubs with center coordinates and coverage radius (in kilometers)
    HUBS = {
        "Ernakulam": {"name": "Kochi Metro Hub", "lat": 9.9816, "lon": 76.2999, "radius_km": 35.0},
        "Trivandrum": {"name": "Trivandrum Central Hub", "lat": 8.5241, "lon": 76.9366, "radius_km": 25.0},
        "Kozhikode": {"name": "Kozhikode Malabar Hub", "lat": 11.2588, "lon": 75.7804, "radius_km": 25.0},
        "Thrissur": {"name": "Thrissur Cultural Hub", "lat": 10.5276, "lon": 76.2144, "radius_km": 25.0},
        "Kottayam": {"name": "Kottayam Rubber Hub", "lat": 9.5916, "lon": 76.5222, "radius_km": 20.0},
    }

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great-circle distance between two points in kilometers."""
        # Radius of the Earth in km
        R = 6371.0
        
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    @staticmethod
    def verify_coverage(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """
        Verifies if a coordinate falls within any active service hubs.
        Returns the matching hub information if covered, else None.
        """
        for district, hub in CoverageService.HUBS.items():
            dist = CoverageService.haversine_distance(latitude, longitude, hub["lat"], hub["lon"])
            if dist <= hub["radius_km"]:
                logger.info(f"Location ({latitude}, {longitude}) is covered by {hub['name']} in {district} (distance: {dist:.2f} km)")
                return {
                    "district": district,
                    "hub_name": hub["name"],
                    "distance_km": round(dist, 2)
                }
        
        logger.warning(f"Location ({latitude}, {longitude}) is outside all active coverage boundaries.")
        return None
