package websocket

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/models"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocketHub manages WebSocket connections and broadcasting
type WebSocketHub struct {
	// Registered connections
	connections map[string]*Connection

	// Connection mutex
	mu sync.RWMutex

	// Authentication middleware
	authMiddleware *auth.AuthMiddleware

	// Redis service for persistence
	redis *redis.RedisService

	// Upgrader for WebSocket connections
	upgrader websocket.Upgrader
}

// Connection represents a WebSocket connection
type Connection struct {
	// WebSocket connection
	ws *websocket.Conn

	// Send is a channel on which messages are sent
	send chan []byte

	// User information
	userID    string
	companyID string

	// Hub reference
	hub *WebSocketHub
}

// Message represents a WebSocket message
type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	Priority  string      `json:"priority,omitempty"` // high, normal, low
}

// Notification represents a system notification
type Notification struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"` // payment, project, estimate, system
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Priority  string                 `json:"priority"`
	CreatedAt time.Time              `json:"created_at"`
	Read      bool                   `json:"read"`
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub(authMiddleware *auth.AuthMiddleware, redisService *redis.RedisService) *WebSocketHub {
	hub := &WebSocketHub{
		connections:    make(map[string]*Connection),
		authMiddleware: authMiddleware,
		redis:          redisService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // In production, implement proper origin checking
			},
		},
	}

	return hub
}

// ServeWebSocket handles WebSocket connections
func (h *WebSocketHub) ServeWebSocket(c *gin.Context) {
	// Authenticate the user
	user := c.MustGet("user").(*models.User)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Upgrade the HTTP connection to WebSocket
	ws, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	// Create connection
	conn := &Connection{
		ws:        ws,
		send:      make(chan []byte, 256),
		userID:    user.ID,
		companyID: companyID,
		hub:       h,
	}

	// Register connection
	h.register(conn)

	// Start goroutines for connection management
	go conn.writePump()
	go conn.readPump()

	// Send welcome message
	conn.sendMessage(Message{
		Type:      "connection",
		Data:      gin.H{"message": "Connected successfully", "user_id": user.ID},
		Timestamp: time.Now(),
		Priority:  "high",
	})

	// Broadcast user online status
	if companyID != "" {
		h.broadcastToCompany(companyID, Message{
			Type:      "user_status",
			Data:      gin.H{"user_id": user.ID, "status": "online"},
			Timestamp: time.Now(),
		})
	}
}

// register adds a connection to the hub
func (h *WebSocketHub) register(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.connections[conn.userID] = conn
}

// unregister removes a connection from the hub
func (h *WebSocketHub) unregister(conn *Connection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.connections[conn.userID]; ok {
		delete(h.connections, conn.userID)
		close(conn.send)
	}
}

// broadcastToUser sends a message to a specific user
func (h *WebSocketHub) broadcastToUser(userID string, message Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	conn, exists := h.connections[userID]
	if exists {
		select {
		case conn.send <- h.serializeMessage(message):
		default:
			close(conn.send)
			h.unregister(conn)
		}
	}
}

// broadcastToCompany sends a message to all users in a company
func (h *WebSocketHub) broadcastToCompany(companyID string, message Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, conn := range h.connections {
		if conn.companyID == companyID {
			select {
			case conn.send <- h.serializeMessage(message):
			default:
				close(conn.send)
				h.unregister(conn)
			}
		}
	}
}

// broadcastToAll sends a message to all connected users
func (h *WebSocketHub) broadcastToAll(message Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, conn := range h.connections {
		select {
		case conn.send <- h.serializeMessage(message):
		default:
			close(conn.send)
			h.unregister(conn)
		}
	}
}

// sendNotification sends a notification to a user
func (h *WebSocketHub) sendNotification(userID string, notification Notification) {
	message := Message{
		Type:      "notification",
		Data:      notification,
		Timestamp: time.Now(),
		Priority:  notification.Priority,
	}

	h.broadcastToUser(userID, message)
}

// sendPaymentNotification sends payment-related notifications
func (h *WebSocketHub) sendPaymentNotification(userID string, paymentID string, status string, amount float64) {
	notification := Notification{
		ID:        fmt.Sprintf("payment_%s_%d", paymentID, time.Now().Unix()),
		Type:      "payment",
		Title:     "Обновление платежа",
		Message:   fmt.Sprintf("Статус платежа %s: %s", paymentID, status),
		Data:      gin.H{"payment_id": paymentID, "status": status, "amount": amount},
		Priority:  "normal",
		CreatedAt: time.Now(),
		Read:      false,
	}

	h.sendNotification(userID, notification)
}

// sendProjectNotification sends project-related notifications
func (h *WebSocketHub) sendProjectNotification(companyID string, projectID string, event string, data map[string]interface{}) {
	notification := Notification{
		ID:        fmt.Sprintf("project_%s_%d", projectID, time.Now().Unix()),
		Type:      "project",
		Title:     "Обновление проекта",
		Message:   fmt.Sprintf("Событие проекта: %s", event),
		Data:      gin.H{"project_id": projectID, "event": event},
		Priority:  "normal",
		CreatedAt: time.Now(),
		Read:      false,
	}

	// Broadcast to entire company for project events
	message := Message{
		Type:      "notification",
		Data:      notification,
		Timestamp: time.Now(),
		Priority:  "normal",
	}

	h.broadcastToCompany(companyID, message)
}

// serializeMessage converts message to JSON bytes
func (h *WebSocketHub) serializeMessage(message Message) []byte {
	data, _ := json.Marshal(message)
	return data
}

// writePump pumps messages from the hub to the websocket connection
func (c *Connection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.ws.Close()
		c.hub.unregister(c)
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// The hub closed the channel
				c.ws.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.ws.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Connection) readPump() {
	defer func() {
		c.ws.Close()
		c.hub.unregister(c)
	}()

	c.ws.SetReadLimit(512)
	c.ws.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.ws.SetPongHandler(func(string) error {
		c.ws.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				return
			}
			break
		}
	}
}

// sendMessage sends a message to the connection
func (c *Connection) sendMessage(message Message) {
	select {
	case c.send <- c.hub.serializeMessage(message):
	default:
		close(c.send)
		c.hub.unregister(c)
	}
}
