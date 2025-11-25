package metrics

import (
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds all Prometheus metrics for the application
type Metrics struct {
	// HTTP request metrics
	httpDuration *prometheus.HistogramVec
	httpRequests *prometheus.CounterVec
	httpErrors   *prometheus.CounterVec

	// Business logic metrics
	aiRequests       prometheus.Counter
	aiDuration       prometheus.Histogram
	authAttempts     prometheus.Counter
	authFailures     prometheus.Counter
	dbOperations     prometheus.Counter
	dbDuration       prometheus.Histogram
	cacheHits        prometheus.Counter
	cacheMisses      prometheus.Counter
	websocketClients prometheus.Gauge
	websocketMsgs    prometheus.Counter
	uploadedFiles    prometheus.Counter

	// System metrics
	goroutines prometheus.Gauge
	memoryUsage prometheus.Gauge
}

var globalMetrics *Metrics

// NewMetrics creates and registers all application metrics
func NewMetrics() *Metrics {
	m := &Metrics{
		// HTTP metrics
		httpDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name: "http_request_duration_seconds",
				Help: "Duration of HTTP requests",
				Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
			},
			[]string{"method", "endpoint", "status_code"},
		),
		httpRequests: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests",
			},
			[]string{"method", "endpoint"},
		),
		httpErrors: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_errors_total",
				Help: "Total number of HTTP errors",
			},
			[]string{"method", "endpoint", "status_code"},
		),

		// Business metrics
		aiRequests: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "ai_requests_total",
				Help: "Total number of AI service requests",
			},
		),
		aiDuration: prometheus.NewHistogram(
			prometheus.HistogramOpts{
				Name: "ai_request_duration_seconds",
				Help: "Duration of AI service requests",
				Buckets: prometheus.ExponentialBuckets(0.1, 2, 10),
			},
		),
		authAttempts: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "auth_attempts_total",
				Help: "Total number of authentication attempts",
			},
		),
		authFailures: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "auth_failures_total",
				Help: "Total number of authentication failures",
			},
		),
		dbOperations: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "db_operations_total",
				Help: "Total number of database operations",
			},
		),
		dbDuration: prometheus.NewHistogram(
			prometheus.HistogramOpts{
				Name: "db_operation_duration_seconds",
				Help: "Duration of database operations",
				Buckets: prometheus.ExponentialBuckets(0.01, 2, 10),
			},
		),
		cacheHits: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "cache_hits_total",
				Help: "Total number of cache hits",
			},
		),
		cacheMisses: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "cache_misses_total",
				Help: "Total number of cache misses",
			},
		),
		websocketClients: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "websocket_active_clients",
				Help": "Number of active WebSocket clients",
			},
		),
		websocketMsgs: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "websocket_messages_total",
				Help: "Total number of WebSocket messages",
			},
		),
		uploadedFiles: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "files_uploaded_total",
				Help: "Total number of uploaded files",
			},
		),

		// System metrics
		goroutines: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "goroutines_count",
				Help: "Number of active goroutines",
			},
		),
		memoryUsage: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "memory_usage_bytes",
				Help: "Current memory usage in bytes",
			},
		),
	}

	// Register all metrics
	prometheus.MustRegister(
		m.httpDuration,
		m.httpRequests,
		m.httpErrors,
		m.aiRequests,
		m.aiDuration,
		m.authAttempts,
		m.authFailures,
		m.dbOperations,
		m.dbDuration,
		m.cacheHits,
		m.cacheMisses,
		m.websocketClients,
		m.websocketMsgs,
		m.uploadedFiles,
		m.goroutines,
		m.memoryUsage,
	)

	globalMetrics = m
	return m
}

// GetMetrics returns the global metrics instance
func GetMetrics() *Metrics {
	if globalMetrics == nil {
		return NewMetrics()
	}
	return globalMetrics
}

// GinMiddleware returns a Gin middleware for HTTP metrics collection
func (m *Metrics) GinMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		method := c.Request.Method
		endpoint := c.Request.URL.Path

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start).Seconds()
		statusCode := strconv.Itoa(c.Writer.Status())

		m.httpDuration.WithLabelValues(method, endpoint, statusCode).Observe(duration)
		m.httpRequests.WithLabelValues(method, endpoint).Inc()

		if c.Writer.Status() >= 400 {
			m.httpErrors.WithLabelValues(method, endpoint, statusCode).Inc()
		}
	})
}

// Handler returns the Prometheus metrics HTTP handler
func (m *Metrics) Handler() http.Handler {
	return promhttp.Handler()
}

// Business metric methods
func (m *Metrics) IncrementAIRequests() {
	m.aiRequests.Inc()
}

func (m *Metrics) RecordAIDuration(duration time.Duration) {
	m.aiDuration.Observe(duration.Seconds())
}

func (m *Metrics) IncrementAuthAttempts() {
	m.authAttempts.Inc()
}

func (m *Metrics) IncrementAuthFailures() {
	m.authFailures.Inc()
}

func (m *Metrics) IncrementDBOperations() {
	m.dbOperations.Inc()
}

func (m *Metrics) RecordDBDuration(duration time.Duration) {
	m.dbDuration.Observe(duration.Seconds())
}

func (m *Metrics) IncrementCacheHits() {
	m.cacheHits.Inc()
}

func (m *Metrics) IncrementCacheMisses() {
	m.cacheMisses.Inc()
}

func (m *Metrics) SetWebsocketClients(count float64) {
	m.websocketClients.Set(count)
}

func (m *Metrics) IncrementWebsocketMessages() {
	m.websocketMsgs.Inc()
}

func (m *Metrics) IncrementUploadedFiles() {
	m.uploadedFiles.Inc()
}

// System metric methods
func (m *Metrics) UpdateSystemMetrics() {
	// Update goroutine count
	m.goroutines.Set(float64(runtime.NumGoroutine()))

	// Update memory usage
	var stats runtime.MemStats
	runtime.ReadMemStats(&stats)
	m.memoryUsage.Set(float64(stats.Alloc))
}

// HTTPHandler creates a Gin handler for the /metrics endpoint
func (m *Metrics) HTTPHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Update system metrics before serving
		m.UpdateSystemMetrics()
		
		handler := promhttp.Handler()
		handler.ServeHTTP(c.Writer, c.Request)
	}
}