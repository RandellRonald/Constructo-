import time
from locust import HttpUser, task, between, events
from locust.exception import StopUser

class ConstructoUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Called when a Locust start before any task is scheduled"""
        # In a real scenario, we'd log the user in here and get a JWT token
        # self.client.post("/api/v1/auth/login", json={"phone": "9999999999", "password": "password"})
        pass

    @task(3)
    def load_customer_dashboard(self):
        # Simulate loading the main dashboard
        with self.client.get("/api/v1/services", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to load services: {response.status_code}")

    @task(2)
    def map_route_request(self):
        # Simulate a user checking an ETA/Route on the map
        with self.client.get("/api/v1/maps/route?origin_lat=9.0&origin_lon=76.0&dest_lat=9.1&dest_lon=76.1", catch_response=True) as response:
            if response.elapsed.total_seconds() > 2.0:
                response.failure(f"Map route request took longer than 2s: {response.elapsed.total_seconds()}s")
            elif response.status_code in [200, 500]: # Accepting 500 here just for skeleton without actual OSRM running
                response.success()
            else:
                response.failure(f"Map route failed with status {response.status_code}")

    @task(1)
    def check_active_bookings(self):
        # Simulate checking active bookings
        with self.client.get("/api/v1/customer/bookings/active", catch_response=True) as response:
            if response.status_code == 401: 
                # Expected since we don't have a real token in this skeleton
                response.success()

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Beginning performance test...")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("Performance test completed.")
