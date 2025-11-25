"""
Load testing script for AI Gateway using Locust
"""
import json
import random
import time
from locust import HttpUser, task, between, events
from locust.stats import stats_printer, stats_history
import gevent

class AIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Called when a user starts"""
        # Login and get token
        response = self.client.post("/api/v1/auth/login", json={
            "username": "user",
            "password": "user123"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            self.token = None
            self.headers = {}
    
    @task(3)
    def analyze_estimate(self):
        """Test estimate analysis endpoint"""
        if not self.token:
            return
            
        # Generate realistic estimate data
        estimate_data = {
            "estimate_id": f"load-test-{int(time.time())}-{random.randint(1000, 9999)}",
            "estimate_data": {
                "name": f"Тестовая смета {random.randint(1, 100)}",
                "total_cost": random.randint(500000, 5000000),
                "items": [
                    {
                        "name": "Демонтажные работы",
                        "cost": random.randint(50000, 200000),
                        "unit": "м2",
                        "quantity": random.randint(50, 200)
                    },
                    {
                        "name": "Черновая отделка",
                        "cost": random.randint(300000, 800000),
                        "unit": "м2",
                        "quantity": random.randint(50, 200)
                    },
                    {
                        "name": "Чистовая отделка",
                        "cost": random.randint(400000, 1000000),
                        "unit": "м2",
                        "quantity": random.randint(50, 200)
                    }
                ]
            },
            "options": {
                "check_risks": True,
                "optimize_costs": True,
                "market_comparison": random.choice([True, False])
            }
        }
        
        with self.client.post(
            "/api/v1/estimates/analyze",
            json=estimate_data,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/estimates/analyze"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(2)
    def chat_assistant(self):
        """Test chat assistant endpoint"""
        if not self.token:
            return
            
        # Sample construction questions
        questions = [
            "Как рассчитать стоимость фундамента для дома 10x10?",
            "Какие материалы лучше использовать для ванной комнаты?",
            "Какие основные риски при строительстве загородного дома?",
            "Как оптимизировать расходы на строительные материалы?",
            "Как проверить качество строительных работ?",
            "Какие документы нужны для начала строительства?",
            "Как выбрать подрядчика для ремонта?",
            "Как спланировать график строительных работ?"
        ]
        
        chat_data = {
            "message": random.choice(questions),
            "context": {
                "user_role": random.choice(["project_manager", "foreman", "client"]),
                "project_type": random.choice(["residential", "commercial", "renovation"])
            }
        }
        
        with self.client.post(
            "/api/v1/chat/assistant",
            json=chat_data,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/chat/assistant"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(1)
    def vision_analysis(self):
        """Test vision analysis endpoint"""
        if not self.token:
            return
            
        # Mock base64 image data (small sample)
        mock_image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        vision_data = {
            "image_base64": mock_image_data,
            "analysis_type": random.choice(["defect_detection", "quality_check", "progress_monitoring"])
        }
        
        with self.client.post(
            "/api/v1/vision/analyze",
            json=vision_data,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/vision/analyze"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(1)
    def health_check(self):
        """Test health check endpoint"""
        self.client.get("/health", name="/health")
    
    @task(1)
    def get_user_info(self):
        """Test user info endpoint"""
        if not self.token:
            return
            
        self.client.get("/api/v1/auth/me", headers=self.headers, name="/api/v1/auth/me")

class AdminUser(HttpUser):
    wait_time = between(2, 5)
    weight = 1  # Less frequent than regular users
    
    def on_start(self):
        """Called when admin user starts"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            self.token = None
            self.headers = {}
    
    @task
    def admin_only_endpoint(self):
        """Test admin-only endpoint"""
        if not self.token:
            return
            
        self.client.get("/api/v1/auth/admin-only", headers=self.headers, name="/api/v1/auth/admin-only")

# Event handlers for custom metrics
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Custom event handler for request metrics"""
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response_time > 5000:  # Log slow requests
        print(f"Slow request: {name} took {response_time}ms")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("Load test starting...")
    print(f"Target host: {environment.host}")
    print(f"Number of users: {environment.parsed_options.num_users}")
    print(f"Hatch rate: {environment.parsed_options.hatch_rate}")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("Load test completed!")
    
    # Print summary statistics
    stats = environment.stats
    print(f"\n=== Load Test Summary ===")
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Median response time: {stats.total.median_response_time:.2f}ms")
    print(f"95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}")
    
    # Print endpoint breakdown
    print(f"\n=== Endpoint Breakdown ===")
    for name, stats_obj in stats.stats.items():
        if stats_obj.num_requests > 0:
            print(f"{name}:")
            print(f"  Requests: {stats_obj.num_requests}")
            print(f"  Failures: {stats_obj.num_failures}")
            print(f"  Avg time: {stats_obj.avg_response_time:.2f}ms")
            print(f"  95th percentile: {stats_obj.get_response_time_percentile(0.95):.2f}ms")
