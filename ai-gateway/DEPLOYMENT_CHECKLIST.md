# 🚀 AI Gateway Production Deployment Checklist

## 📅 **Deployment Date:** [Дата развертывания]
## 👤 **Deployed By:** [Имя ответственного]
## 🎯 **Environment:** Production

---

# ✅ **Pre-Deployment Checklist**

## **🔧 Infrastructure Readiness**
- [ ] **Kubernetes cluster** доступен и настроен
- [ ] **Docker registry** настроен (Docker Hub/AWS ECR/GCR)
- [ ] **DNS records** настроены для домена
- [ ] **SSL certificates** получены и установлены
- [ ] **Load Balancer** настроен
- [ ] **Storage classes** настроены (PVC для Redis)
- [ ] **Network policies** настроены
- [ ] **Resource quotas** установлены

## **🔐 Security Configuration**
- [ ] **Secrets** созданы и закодированы в base64
  - [ ] `OPENAI_API_KEY` - проверен и рабочий
  - [ ] `SECRET_KEY` - сгенерирован новый ключ
  - [ ] `DATABASE_URL` - проверена строка подключения
- [ ] **TLS/SSL** настроен для всех эндпоинтов
- [ ] **Firewall rules** настроены
- [ ] **RBAC** права настроены в Kubernetes
- [ ] **Pod Security Policies** применены

## **📊 Monitoring Setup**
- [ ] **Prometheus** развернут и настроен
- [ ] **Grafana** развернут и настроен
- [ ] **AlertManager** настроен
- [ ] **Alert rules** импортированы
- [ ] **Dashboard** импортирован (TODO: доделать!)
- [ ] **Notification channels** настроены (Slack/Email)
- [ ] **Log aggregation** (ELK stack) настроен

## **🧪 Testing Environment**
- [ ] **Staging environment** развернут
- [ ] **Load testing** выполнен (100+ concurrent users)
- [ ] **Security testing** выполнен
- [ ] **Integration testing** с Go backend выполнен
- [ ] **End-to-end testing** выполнен
- [ ] **Performance testing** выполнен

---

# 🚀 **Deployment Process**

## **Step 1: Preparation**
- [ ] **Backup** текущей конфигурации
- [ ] **Create namespace** `stroy-control`
- [ ] **Apply ConfigMaps** и **Secrets**
- [ ] **Verify environment variables**

## **Step 2: Database & Cache**
- [ ] **Deploy Redis** с persistent storage
- [ ] **Verify Redis connectivity**
- [ ] **Check Redis memory limits**
- [ ] **Test cache performance**

## **Step 3: Application Deployment**
- [ ] **Build Docker image** `stroy-control/ai-gateway:v1.0`
- [ ] **Push image to registry**
- [ ] **Deploy AI Gateway** (3 replicas)
- [ ] **Verify pod health** и readiness
- [ ] **Check resource usage**

## **Step 4: Networking**
- [ ] **Create services** (ClusterIP + LoadBalancer)
- [ ] **Setup Ingress** с SSL termination
- [ ] **Configure DNS** для `api.stroy-control.ru`
- [ ] **Test external connectivity**
- [ ] **Verify rate limiting** работает

## **Step 5: Autoscaling**
- [ ] **Deploy HPA** (Horizontal Pod Autoscaler)
- [ ] **Configure CPU thresholds** (70% scale up)
- [ ] **Configure memory thresholds** (80% scale up)
- [ ] **Test autoscaling** behavior

## **Step 6: Monitoring**
- [ ] **Verify Prometheus metrics** собираются
- [ ] **Check Grafana dashboards** отображаются
- [ ] **Test alerting** работает
- [ ] **Verify log aggregation**

---

# ✅ **Post-Deployment Verification**

## **🔍 Health Checks**
- [ ] **Health endpoint** `/health` возвращает 200 OK
- [ ] **All pods** в статусе `Running` и `Ready`
- [ ] **Services** доступны и отвечают
- [ ] **Ingress** работает и редиректит трафик
- [ ] **DNS** резолвит домен правильно

## **🧪 Functional Testing**
- [ ] **Authentication** `/api/v1/auth/login` работает
- [ ] **Estimate analysis** `/api/v1/estimates/analyze` работает
- [ ] **Chat assistant** `/api/v1/chat/assistant` работает
- [ ] **Vision analysis** `/api/v1/vision/analyze` работает
- [ ] **Rate limiting** работает и блокирует при превышении
- [ ] **Caching** работает (повторные запросы быстрее)

## **📊 Performance Testing**
- [ ] **Response time** < 200ms (95th percentile)
- [ ] **Throughput** > 50 requests/second
- [ ] **Error rate** < 0.1%
- [ ] **Cache hit rate** > 80%
- [ ] **OpenAI API latency** < 10s

## **🔐 Security Testing**
- [ ] **HTTPS** работает для всех эндпоинтов
- [ ] **JWT authentication** работает
- [ ] **Rate limiting** работает
- [ ] **CORS headers** настроены правильно
- [ ] **Security headers** присутствуют

## **📈 Monitoring Verification**
- [ ] **Prometheus metrics** собираются
- [ ] **Grafana dashboards** работают
- [ ] **Alerts** срабатывают при проблемах
- [ ] **Logs** собираются и анализируются
- [ ] **Business metrics** отслеживаются

---

# 📊 **Performance Baselines**

## **🎯 Target Metrics**
- **Response Time:** < 200ms (95th percentile)
- **Availability:** > 99.9%
- **Error Rate:** < 0.1%
- **Throughput:** > 50 req/s
- **Cache Hit Rate:** > 80%
- **CPU Usage:** < 70% (average)
- **Memory Usage:** < 80% (average)

## **📈 Current Metrics**
- **Response Time:** ___ ms
- **Availability:** ___ %
- **Error Rate:** ___ %
- **Throughput:** ___ req/s
- **Cache Hit Rate:** ___ %
- **CPU Usage:** ___ %
- **Memory Usage:** ___ %

---

# 🔧 **Rollback Plan**

## **🚨 When to Rollback**
- **Error rate** > 5% за 5 минут
- **Response time** > 2s за 5 минут
- **Availability** < 99% за 10 минут
- **Critical alerts** срабатывают
- **User complaints** > 10 за час

## **🔄 Rollback Steps**
1. **Identify issue** и корень проблемы
2. **Scale down** deployment до 0 replicas
3. **Revert** к предыдущей версии image
4. **Scale up** deployment
5. **Verify** функциональность
6. **Communicate** с командой

## **📞 Emergency Contacts**
- **DevOps Lead:** [Контакт]
- **Backend Lead:** [Контакт]
- **Product Manager:** [Контакт]
- **On-call Engineer:** [Контакт]

---

# 📋 **TODO List (Post-Deployment)**

## **🔧 Technical Tasks**
- [ ] **Complete Grafana dashboard** setup (в процессе)
- [ ] **Configure production alerts** thresholds
- [ ] **Setup automated backups** Redis
- [ ] **Implement log rotation**
- [ ] **Add distributed tracing** (Jaeger/Zipkin)
- [ ] **Setup chaos engineering** tests

## **🔐 Security Tasks**
- [ ] **Security audit** penetration testing
- [ ] **Implement JWT token blacklisting**
- [ ] **Add API key management** system
- [ ] **Setup WAF** (Web Application Firewall)
- [ ] **Implement PII detection** и фильтрация

## **📊 Business Tasks**
- [ ] **User training** documentation
- [ ] **API documentation** update
- [ ] **Performance monitoring** dashboard
- [ ] **Cost optimization** review
- [ ] **User feedback** collection system

## **🚀 Future Enhancements**
- [ ] **Multi-region deployment**
- [ ] **Advanced AI features** (Phase 2)
- [ ] **Mobile app integration**
- [ ] **Third-party integrations**
- [ ] **Enterprise features**

---

# 📞 **Support Information**

## **🔧 Access Information**
- **Kubernetes Dashboard:** [URL]
- **Grafana:** [URL] (admin/[password])
- **Prometheus:** [URL]
- **Application:** https://api.stroy-control.ru
- **API Documentation:** https://api.stroy-control.ru/docs

## **📊 Monitoring Links**
- **Health Dashboard:** [Grafana URL]
- **Performance Dashboard:** [Grafana URL]
- **Alert Manager:** [URL]
- **Log Search:** [Kibana URL]

## **🔍 Debug Commands**
```bash
# Check pod status
kubectl get pods -n stroy-control

# View logs
kubectl logs -f deployment/ai-gateway -n stroy-control

# Exec into pod
kubectl exec -it deployment/ai-gateway -n stroy-control -- bash

# Port forward for local testing
kubectl port-forward service/ai-gateway-service 8000:8000 -n stroy-control

# Check HPA status
kubectl get hpa -n stroy-control

# Check events
kubectl get events -n stroy-control --sort-by='.lastTimestamp'
```

---

## ✅ **Deployment Summary**

**Deployment Status:** ___ 
**Deployment Time:** ___ 
**Issues Found:** ___ 
**Rollback Required:** ___ 
**Next Review Date:** ___ 

**Sign-off:**
- **DevOps:** ___________________ Date: ___
- **Backend Lead:** ___________________ Date: ___
- **Product Manager:** ___________________ Date: ___

---

*Last Updated: 25 ноября 2025*
*Next Review: Weekly during first month*
