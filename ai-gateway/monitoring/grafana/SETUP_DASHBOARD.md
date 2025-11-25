# 📊 Grafana Dashboard Setup Guide

## 🎯 **Overview**

После deployment AI Gateway в Kubernetes, нужно создать Grafana dashboard для мониторинга производительности и метрик.

**Когда выполнять:** После успешного deployment в production  
**Время выполнения:** 15-20 минут  
**Сложность:** Средняя

---

## 🚀 **Step 1: Access Grafana**

### **Production Environment**
```bash
# Get Grafana URL
kubectl get ingress -n stroy-control

# Port forward for local access
kubectl port-forward service/grafana-service 3000:3000 -n stroy-control
```

**URL:** `http://localhost:3000`  
**Default credentials:** `admin / admin` (изменить при первом входе)

---

## 📊 **Step 2: Add Prometheus Data Source**

1. **Login в Grafana**
2. **Configuration → Data Sources → Add data source**
3. **Выбрать Prometheus**
4. **Настроить connection:**
   ```
   Name: Prometheus
   URL: http://prometheus-service:9090
   Access: Server (default)
   ```
5. **Test connection** - должен показать "Data source is working"
6. **Save & Test**

---

## 📈 **Step 3: Create AI Gateway Dashboard**

### **Dashboard Settings**
- **Name:** "AI Gateway Production Dashboard"
- **Tags:** `ai-gateway`, `production`, `stroy-control`
- **Time range:** Last 1 hour
- **Refresh:** 5s

### **Panel 1: Request Rate (req/s)**
```
Visualization: Graph
Title: Request Rate (req/s)
Metrics:
  - sum(rate(http_requests_total[5m])) by (endpoint)
Legend: {{endpoint}}
Y-axis format: reqps
```

### **Panel 2: Response Time (percentiles)**
```
Visualization: Graph
Title: Response Time (percentiles)
Metrics:
  - histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
  - histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
  - histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
Legend: 
  - 50th percentile - {{endpoint}}
  - 95th percentile - {{endpoint}}
  - 99th percentile - {{endpoint}}
Y-axis format: s (seconds)
Thresholds:
  - Warning: > 0.5s (yellow)
  - Critical: > 2.0s (red)
```

### **Panel 3: Error Rate (%)**
```
Visualization: Graph
Title: Error Rate (%)
Metrics:
  - sum(rate(http_requests_total{status=~"4.."}[5m])) by (endpoint) / sum(rate(http_requests_total[5m])) by (endpoint)
  - sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint) / sum(rate(http_requests_total[5m])) by (endpoint)
Legend:
  - 4xx errors - {{endpoint}}
  - 5xx errors - {{endpoint}}
Y-axis format: percent (0-100)
Thresholds:
  - Warning: > 1% (yellow)
  - Critical: > 5% (red)
```

### **Panel 4: OpenAI API Usage**
```
Visualization: Graph
Title: OpenAI API Usage
Metrics:
  - rate(openai_requests_total[5m])
  - rate(openai_tokens_used_total[5m])
Legend:
  - OpenAI requests/sec
  - OpenAI tokens/sec
Y-axis format: reqps
```

### **Panel 5: Redis Cache Performance**
```
Visualization: Graph
Title: Redis Cache Performance
Metrics:
  - redis_cache_hit_rate
  - rate(redis_cache_hits_total[5m])
  - rate(redis_cache_misses_total[5m])
Legend:
  - Cache hit rate
  - Cache hits/sec
  - Cache misses/sec
Y-axis format: percent (0-100)
Thresholds:
  - Warning: < 70% (yellow)
```

### **Panel 6: Resource Usage**
```
Visualization: Graph
Title: Resource Usage
Metrics:
  - rate(container_cpu_usage_seconds_total[5m]) * 100
  - container_memory_usage_bytes / container_spec_memory_limit_bytes * 100
Legend:
  - {{pod}} - CPU
  - {{pod}} - Memory
Y-axis format: percent (0-100)
Thresholds:
  - Warning: > 80% (yellow)
  - Critical: > 95% (red)
```

### **Panel 7: OpenAI API Cost**
```
Visualization: Graph
Title: OpenAI API Cost ($/hour)
Metrics:
  - increase(openai_api_cost_total[1h])
Legend: Cost per hour ($)
Y-axis format: USD
Thresholds:
  - Warning: > $50/hour (yellow)
```

### **Panel 8: AI Feature Usage**
```
Visualization: Graph
Title: AI Feature Usage
Metrics:
  - rate(ai_feature_usage_total[5m])
Legend: {{feature}} usage rate
Y-axis format: reqps
```

---

## 🎨 **Step 4: Dashboard Layout**

### **Recommended Layout (2x4 grid):**
```
┌─────────────────┬─────────────────┐
│ Request Rate    │ Response Time   │
├─────────────────┼─────────────────┤
│ Error Rate      │ OpenAI Usage    │
├─────────────────┼─────────────────┤
│ Cache Performance│ Resource Usage  │
├─────────────────┼─────────────────┤
│ API Cost        │ Feature Usage   │
└─────────────────┴─────────────────┘
```

### **Dashboard Settings:**
- **Time range:** Last 1 hour
- **Refresh:** Every 5 seconds
- **Timezone:** UTC
- **Annotations:** Enable Prometheus annotations

---

## 🔧 **Step 5: Configure Alerts**

### **High Response Time Alert**
```
Metric: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
Condition: > 0.5s for 2m
Severity: Warning
Notification: Slack #ai-gateway-alerts
```

### **Critical Response Time Alert**
```
Metric: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))
Condition: > 2.0s for 1m
Severity: Critical
Notification: Slack + Email
```

### **High Error Rate Alert**
```
Metric: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
Condition: > 0.01 for 2m
Severity: Warning
Notification: Slack #ai-gateway-alerts
```

### **Low Cache Hit Rate Alert**
```
Metric: redis_cache_hit_rate
Condition: < 0.7 for 5m
Severity: Warning
Notification: Slack #ai-gateway-alerts
```

### **High Resource Usage Alert**
```
Metric: rate(container_cpu_usage_seconds_total[5m]) * 100
Condition: > 80% for 5m
Severity: Warning
Notification: Slack #ai-gateway-alerts
```

---

## 💾 **Step 6: Export Dashboard**

После настройки dashboard:

1. **Dashboard → Share → Export**
2. **Save to JSON file**
3. **Сохранить в:** `monitoring/grafana/dashboards/ai-gateway-dashboard.json`
4. **Добавить в Git** для future deployments

---

## 🧪 **Step 7: Test Dashboard**

### **Generate Test Traffic**
```bash
# Запустить load testing для генерации метрик
cd load_test
./run_load_test.sh 10 5 60
```

### **Verify Metrics**
- **Request Rate** должен показывать 10+ req/s
- **Response Time** должен быть < 200ms
- **Cache Hit Rate** должен расти со временем
- **OpenAI Usage** должен показывать API вызовы

---

## 🔍 **Troubleshooting**

### **No Data in Panels**
```bash
# Check Prometheus targets
kubectl get pods -n stroy-control
kubectl logs prometheus-server -n stroy-control

# Check metrics endpoint
curl http://localhost:9090/metrics | grep http_requests
```

### **Connection Issues**
```bash
# Test Prometheus connection from Grafana pod
kubectl exec -it deployment/grafana -n stroy-control -- \
  curl http://prometheus-service:9090/api/v1/query?query=up
```

### **Missing Metrics**
```bash
# Check if AI Gateway metrics are exposed
kubectl port-forward service/ai-gateway-service 9090:9090 -n stroy-control
curl http://localhost:9090/metrics
```

---

## 📋 **Checklist**

### **Pre-Setup**
- [ ] Grafana deployed и доступен
- [ ] Prometheus deployed и собирает метрики
- [ ] AI Gateway deployed и работает
- [ ] Network connectivity между сервисами

### **Dashboard Setup**
- [ ] Prometheus data source добавлен
- [ ] All 8 panels созданы
- [ ] Thresholds настроены
- [ ] Layout оптимизирован
- [ ] Dashboard сохранен

### **Alerting Setup**
- [ ] Notification channels настроены
- [ ] Alert rules созданы
- [ ] Test alerts отправлены
- [ ] Alert documentation готова

### **Post-Setup**
- [ ] Dashboard экспортирован в JSON
- [ ] Load testing выполнен
- [ ] Metrics отображаются правильно
- [ ] Команда обучена использованию

---

## 📞 **Support**

### **Useful Commands**
```bash
# Grafana logs
kubectl logs deployment/grafana -n stroy-control

# Prometheus logs
kubectl logs deployment/prometheus -n stroy-control

# Check metrics
curl http://localhost:3000/api/datasources/proxy/1/api/v1/query?query=up
```

### **Documentation**
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/)
- [AI Gateway Metrics](../prometheus.yml)

---

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Dashboard отображает все 8 метрик
- [ ] Real-time обновление работает
- [ ] Thresholds и alerts работают
- [ ] Export/import функциональность работает

### **Performance Requirements**
- [ ] Dashboard загружается < 3 секунды
- [ ] Real-time обновление без лагов
- [ ] Alert notifications < 1 минута

### **Usability Requirements**
- [ ] Интуитивный interface для команды
- [ ] Clear visualization проблем
- [ ] Actionable alerts с инструкциями

---

*Last Updated: 25 ноября 2025*  
*Next Review: After first production deployment*
