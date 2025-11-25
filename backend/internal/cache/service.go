package cache

import (
	"encoding/json"
	"fmt"
	"time"

	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
)

// CacheService provides caching functionality using Redis
type CacheService struct {
	redis *redis.RedisService
}

// CacheOptions represents cache configuration options
type CacheOptions struct {
	TTL time.Duration // Time to live for cached data
}

// CacheResult represents the result of a cache operation
type CacheResult struct {
	Data    interface{} `json:"data"`
	Cached  bool        `json:"cached"`
	Expired bool        `json:"expired"`
}

// NewCacheService creates a new cache service
func NewCacheService(redisService *redis.RedisService) *CacheService {
	return &CacheService{
		redis: redisService,
	}
}

// CacheResult caches the result of a function
func (c *CacheService) CacheResult(key string, fn func() (interface{}, error), opts *CacheOptions) (interface{}, error) {
	if opts == nil {
		opts = &CacheOptions{TTL: 15 * time.Minute} // Default 15 minutes
	}

	// Try to get from cache first
	if cached, err := c.Get(key); err == nil {
		return &CacheResult{
			Data:   cached,
			Cached: true,
		}, nil
	}

	// Execute function and cache the result
	result, err := fn()
	if err != nil {
		return nil, err
	}

	// Store in cache
	if err := c.Set(key, result, opts.TTL); err != nil {
		return nil, err
	}

	return &CacheResult{
		Data:   result,
		Cached: false,
	}, nil
}

// Get retrieves data from cache
func (c *CacheService) Get(key string) (interface{}, error) {
	client := c.redis.GetClient()

	val, err := client.Get(nil, key).Result()
	if err != nil {
		return nil, err
	}

	var data interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, err
	}

	return data, nil
}

// Set stores data in cache with TTL
func (c *CacheService) Set(key string, value interface{}, ttl time.Duration) error {
	client := c.redis.GetClient()

	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return client.Set(nil, key, string(data), ttl).Err()
}

// Delete removes data from cache
func (c *CacheService) Delete(key string) error {
	client := c.redis.GetClient()
	return client.Del(nil, key).Err()
}

// InvalidateByPattern removes all keys matching a pattern
func (c *CacheService) InvalidateByPattern(pattern string) error {
	client := c.redis.GetClient()

	// Get all keys matching the pattern
	keys, err := client.Keys(nil, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return client.Del(nil, keys...).Err()
	}

	return nil
}

// Middleware provides caching middleware for Gin
func (c *CacheService) Middleware(ttl time.Duration) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// Only cache GET requests
		if ctx.Request.Method != "GET" {
			ctx.Next()
			return
		}

		// Generate cache key from URL and query parameters
		cacheKey := fmt.Sprintf("api:%s", ctx.Request.URL.String())

		// Try to get from cache
		if cached, err := c.Get(cacheKey); err == nil {
			ctx.JSON(200, gin.H{
				"data":    cached,
				"cached":  true,
				"message": "Response served from cache",
			})
			ctx.Abort()
			return
		}

		// Store original writer
		writer := ctx.Writer

		// Capture response
		cw := &CacheWriter{
			ResponseWriter: writer,
			statusCode:     200,
			body:           make([]byte, 0),
		}
		ctx.Writer = cw

		// Execute handler
		ctx.Next()

		// Cache successful responses only
		if cw.statusCode == 200 {
			// Parse response body (simplified)
			// In a real implementation, you'd want to properly parse JSON
			if err := c.Set(cacheKey, cw.body, ttl); err != nil {
				fmt.Printf("Failed to cache response: %v\n", err)
			}
		}
	}
}

// CacheWriter captures the HTTP response
type CacheWriter struct {
	gin.ResponseWriter
	statusCode int
	body       []byte
}

// Write writes the response and captures it for caching
func (w *CacheWriter) Write(b []byte) (int, error) {
	w.body = append(w.body, b...)
	return w.ResponseWriter.Write(b)
}

// WriteHeader writes the status code
func (w *CacheWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Specific cache services for different domains

// PaymentScheduleCache provides payment schedule specific caching
type PaymentScheduleCache struct {
	cache *CacheService
}

// NewPaymentScheduleCache creates a new payment schedule cache
func NewPaymentScheduleCache(cacheService *CacheService) *PaymentScheduleCache {
	return &PaymentScheduleCache{
		cache: cacheService,
	}
}

// GetPaymentSchedules caches payment schedules list
func (p *PaymentScheduleCache) GetPaymentSchedules(companyID string, page, limit int, fn func() (interface{}, error)) (interface{}, error) {
	key := fmt.Sprintf("payment_schedules:%s:%d:%d", companyID, page, limit)
	return p.cache.CacheResult(key, fn, &CacheOptions{TTL: 5 * time.Minute})
}

// GetPaymentSchedule caches individual payment schedule
func (p *PaymentScheduleCache) GetPaymentSchedule(companyID, scheduleID string, fn func() (interface{}, error)) (interface{}, error) {
	key := fmt.Sprintf("payment_schedule:%s:%s", companyID, scheduleID)
	return p.cache.CacheResult(key, fn, &CacheOptions{TTL: 10 * time.Minute})
}

// InvalidatePaymentSchedule invalidates payment schedule related caches
func (p *PaymentScheduleCache) InvalidatePaymentSchedule(companyID, scheduleID string) error {
	patterns := []string{
		fmt.Sprintf("payment_schedules:%s:*", companyID),
		fmt.Sprintf("payment_schedule:%s:%s", companyID, scheduleID),
		"payment_schedule_analytics:*",
		"payment_calendar:*",
	}

	for _, pattern := range patterns {
		if err := p.cache.InvalidateByPattern(pattern); err != nil {
			return err
		}
	}
	return nil
}

// FileCache provides file-related caching
type FileCache struct {
	cache *CacheService
}

// NewFileCache creates a new file cache
func NewFileCache(cacheService *CacheService) *FileCache {
	return &FileCache{
		cache: cacheService,
	}
}

// GetFiles caches file lists
func (f *FileCache) GetFiles(companyID, projectID, category string, page, limit int, fn func() (interface{}, error)) (interface{}, error) {
	key := fmt.Sprintf("files:%s:%s:%s:%d:%d", companyID, projectID, category, page, limit)
	return f.cache.CacheResult(key, fn, &CacheOptions{TTL: 2 * time.Minute})
}

// InvalidateFiles invalidates file-related caches
func (f *FileCache) InvalidateFiles(companyID, projectID string) error {
	patterns := []string{
		fmt.Sprintf("files:%s:*", companyID),
		fmt.Sprintf("files:%s:*", projectID),
	}

	for _, pattern := range patterns {
		if err := f.cache.InvalidateByPattern(pattern); err != nil {
			return err
		}
	}
	return nil
}

// AnalyticsCache provides analytics specific caching
type AnalyticsCache struct {
	cache *CacheService
}

// NewAnalyticsCache creates a new analytics cache
func NewAnalyticsCache(cacheService *CacheService) *AnalyticsCache {
	return &AnalyticsCache{
		cache: cacheService,
	}
}

// GetPaymentAnalytics caches payment analytics
func (a *AnalyticsCache) GetPaymentAnalytics(companyID string, fn func() (interface{}, error)) (interface{}, error) {
	key := fmt.Sprintf("payment_analytics:%s", companyID)
	return a.cache.CacheResult(key, fn, &CacheOptions{TTL: 15 * time.Minute})
}

// InvalidateAnalytics invalidates analytics caches
func (a *AnalyticsCache) InvalidateAnalytics(companyID string) error {
	patterns := []string{
		fmt.Sprintf("payment_analytics:%s", companyID),
		fmt.Sprintf("*_analytics:*"),
	}

	for _, pattern := range patterns {
		if err := a.cache.InvalidateByPattern(pattern); err != nil {
			return err
		}
	}
	return nil
}

// Utility functions
