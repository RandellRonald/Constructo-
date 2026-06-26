import unittest
from app.services.coverage_service import CoverageService

class TestCoverageService(unittest.TestCase):
    def test_haversine_distance(self):
        # Coordinates of Ernakulam hub
        ekm_lat, ekm_lon = 9.9816, 76.2999
        # Coordinate of a point close to hub
        lat2, lon2 = 9.9820, 76.3005
        distance = CoverageService.haversine_distance(ekm_lat, ekm_lon, lat2, lon2)
        self.assertLess(distance, 1.0) # distance should be less than 1 km

    def test_verify_coverage_covered(self):
        # Trivandrum Central Hub is at (8.5241, 76.9366) with 25km radius
        # (8.525, 76.937) is very close, should match Trivandrum
        res = CoverageService.verify_coverage(8.525, 76.937)
        self.assertIsNotNone(res)
        self.assertEqual(res["district"], "Trivandrum")
        self.assertEqual(res["hub_name"], "Trivandrum Central Hub")

    def test_verify_coverage_not_covered(self):
        # A location in the middle of nowhere / other state, shouldn't match Kerala hubs
        res = CoverageService.verify_coverage(15.0, 75.0)
        self.assertIsNone(res)
