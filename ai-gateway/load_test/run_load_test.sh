#!/bin/bash

# Load testing script for AI Gateway
# Usage: ./run_load_test.sh [users] [hatch_rate] [duration]

set -e

# Default parameters
USERS=${1:-100}
HATCH_RATE=${2:-10}
DURATION=${3:-300}  # 5 minutes default
HOST=${4:-http://localhost:8000}

echo "🚀 Starting AI Gateway Load Test"
echo "📊 Parameters:"
echo "   Users: $USERS"
echo "   Hatch Rate: $HATCH_RATE users/sec"
echo "   Duration: $DURATION seconds"
echo "   Target Host: $HOST"
echo ""

# Install dependencies
echo "📦 Installing load test dependencies..."
pip install -r requirements.txt

# Create development users for testing
echo "👥 Creating test users..."
curl -X POST "$HOST/api/v1/auth/dev/create-user?username=user1&role=user" || true
curl -X POST "$HOST/api/v1/auth/dev/create-user?username=user2&role=user" || true
curl -X POST "$HOST/api/v1/auth/dev/create-user?username=user3&role=premium" || true

echo ""
echo "🧪 Running load test..."
echo "📈 Web UI will be available at: http://localhost:8089"
echo "📊 Test will run for $DURATION seconds"
echo ""

# Run Locust
locust -f locustfile.py \
       --host=$HOST \
       --users=$USERS \
       --hatch-rate=$HATCH_RATE \
       --run-time=${DURATION}s \
       --html=load_test_report.html \
       --csv=load_test_stats \
       --headless \
       --loglevel=INFO

echo ""
echo "✅ Load test completed!"
echo "📄 Reports generated:"
echo "   - HTML Report: load_test_report.html"
echo "   - CSV Stats: load_test_stats_stats.csv"
echo "   - CSV History: load_test_stats_history.csv"
echo ""
echo "📊 Key metrics:"
if [ -f "load_test_stats_stats.csv" ]; then
    echo "   Total Requests: $(tail -n 1 load_test_stats_stats.csv | cut -d',' -f2)"
    echo "   Failures: $(tail -n 1 load_test_stats_stats.csv | cut -d',' -f3)"
    echo "   Median Response Time: $(tail -n 1 load_test_stats_stats.csv | cut -d',' -f7)ms"
    echo "   95th Percentile: $(tail -n 1 load_test_stats_stats.csv | cut -d',' -f9)ms"
fi

echo ""
echo "🎯 Performance Targets:"
echo "   ✅ Target: < 200ms response time (95th percentile)"
echo "   ✅ Target: < 1% failure rate"
echo "   ✅ Target: > 50 requests/second"
echo ""
echo "📈 Open report: open load_test_report.html"
