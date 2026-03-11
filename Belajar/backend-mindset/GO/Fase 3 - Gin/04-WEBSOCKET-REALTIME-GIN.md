# ⚡ WebSocket + Real-time dengan Go Gin

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Setup WebSocket dengan gorilla/websocket di Gin
- Implement Hub pattern untuk connection management
- Bikin room-based broadcasting
- Handle authentication di WebSocket handshake
- Manage client connections (register, unregister)
- Broadcast message ke semua client atau room tertentu
- Kirim notifikasi real-time dari HTTP handler
- Implement ping/pong heartbeat
- Handle graceful shutdown
- Testing WebSocket dengan client library

## 💡 Konsep + Analogi

### WebSocket vs HTTP

| Aspek | HTTP | WebSocket |
|-------|------|-----------|
| **Connection** | Request-Response | Persistent bidirectional |
| **Direction** | Client → Server only | Client ↔ Server |
| **Overhead** | High (headers tiap request) | Low (sekali handshake) |
| **Real-time** | Polling (inefficient) | True real-time |
| **Use Case** | REST API, File download | Chat, Live updates, Gaming |

**Analogi Frontend:**
- **HTTP** = Fetch API: `fetch('/api/data')` → tunggu response → selesai
- **WebSocket** = Phone call: Koneksi terus terbuka, bisa ngobrol bolak-balik
- **Polling** = Chat dengan refresh button: Klik refresh terus-terusan (inefficient)
- **WebSocket** = Chat real-time: Message langsung muncul tanpa refresh

### Hub Pattern

```
┌─────────────────────────────────────────────┐
│                    HUB                       │
│  - clients: map[*Client]bool                │
│  - broadcast: chan Message                  │
│  - register: chan *Client                   │
│  - unregister: chan *Client                 │
└─────────────────────────────────────────────┘
         ↓            ↓            ↓
    ┌────────┐   ┌────────┐   ┌────────┐
    │Client 1│   │Client 2│   │Client 3│
    │User: A │   │User: B │   │User: C │
    │Rooms:  │   │Rooms:  │   │Rooms:  │
    │ -room1 │   │ -room1 │   │ -room2 │
    │ -room2 │   │        │   │        │
    └────────┘   └────────┘   └────────┘
```

**Hub** = Central manager yang koordinasi semua WebSocket connections
**Client** = Representasi 1 user connection
**Room** = Channel untuk broadcast targeted (misal: project, chat room)

### Room-Based Broadcasting

```
Hub.BroadcastToRoom("project:123", message)
    ↓
Only send to clients yang join room "project:123"
    ↓
Client 1 ✅ (joined project:123)
Client 2 ❌ (tidak join room ini)
Client 3 ✅ (joined project:123)
```

## 📝 Materi + Kode Lengkap

### 1. Install Dependencies

```bash
go get github.com/gorilla/websocket
go get github.com/golang-jwt/jwt/v5
go get github.com/gin-gonic/gin
```

```bash
# go.mod
module your-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gorilla/websocket v1.5.1
    github.com/golang-jwt/jwt/v5 v5.2.0
)
```

### 2. Message Types & Structures

```go
// pkg/websocket/message.go
package websocket

import (
    "encoding/json"
    "time"
)

// MessageType defines the type of WebSocket message
type MessageType string

const (
    // System messages
    MessageTypeConnected    MessageType = "connected"
    MessageTypeDisconnected MessageType = "disconnected"
    MessageTypeError        MessageType = "error"
    MessageTypePing         MessageType = "ping"
    MessageTypePong         MessageType = "pong"
    
    // App messages
    MessageTypeTaskCreated  MessageType = "task_created"
    MessageTypeTaskUpdated  MessageType = "task_updated"
    MessageTypeTaskDeleted  MessageType = "task_deleted"
    MessageTypeComment      MessageType = "comment"
    MessageTypeNotification MessageType = "notification"
    MessageTypeUserJoined   MessageType = "user_joined"
    MessageTypeUserLeft     MessageType = "user_left"
)

// Message represents a WebSocket message
type Message struct {
    Type      MessageType     `json:"type"`
    Payload   json.RawMessage `json:"payload,omitempty"`
    Room      string          `json:"room,omitempty"`
    From      string          `json:"from,omitempty"`      // User ID
    Timestamp time.Time       `json:"timestamp"`
}

// NewMessage creates a new message
func NewMessage(msgType MessageType, payload interface{}, room string) (*Message, error) {
    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    return &Message{
        Type:      msgType,
        Payload:   payloadBytes,
        Room:      room,
        Timestamp: time.Now(),
    }, nil
}

// UnmarshalPayload unmarshals the payload into the given interface
func (m *Message) UnmarshalPayload(v interface{}) error {
    return json.Unmarshal(m.Payload, v)
}

// TaskPayload represents a task update payload
type TaskPayload struct {
    ID          string `json:"id"`
    Title       string `json:"title"`
    Description string `json:"description"`
    Status      string `json:"status"`
    AssigneeID  string `json:"assignee_id,omitempty"`
    ProjectID   string `json:"project_id"`
}

// NotificationPayload represents a notification payload
type NotificationPayload struct {
    ID      string `json:"id"`
    Title   string `json:"title"`
    Message string `json:"message"`
    Type    string `json:"type"`
    Link    string `json:"link,omitempty"`
}

// UserPayload represents a user join/leave payload
type UserPayload struct {
    UserID   string `json:"user_id"`
    Username string `json:"username"`
    Avatar   string `json:"avatar,omitempty"`
}
```

### 3. Client Structure

```go
// pkg/websocket/client.go
package websocket

import (
    "log"
    "time"

    "github.com/gorilla/websocket"
)

const (
    // Time allowed to write a message to the peer
    writeWait = 10 * time.Second

    // Time allowed to read the next pong message from the peer
    pongWait = 60 * time.Second

    // Send pings to peer with this period (must be less than pongWait)
    pingPeriod = (pongWait * 9) / 10

    // Maximum message size allowed from peer
    maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a WebSocket client connection
type Client struct {
    Hub    *Hub
    Conn   *websocket.Conn
    Send   chan *Message
    UserID string
    Rooms  map[string]bool // rooms this client has joined
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
    return &Client{
        Hub:    hub,
        Conn:   conn,
        Send:   make(chan *Message, 256),
        UserID: userID,
        Rooms:  make(map[string]bool),
    }
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
    defer func() {
        c.Hub.Unregister <- c
        c.Conn.Close()
    }()

    c.Conn.SetReadDeadline(time.Now().Add(pongWait))
    c.Conn.SetReadLimit(maxMessageSize)
    c.Conn.SetPongHandler(func(string) error {
        c.Conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        var msg Message
        err := c.Conn.ReadJSON(&msg)
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }

        // Set message metadata
        msg.From = c.UserID
        msg.Timestamp = time.Now()

        // Handle different message types
        c.handleMessage(&msg)
    }
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.Conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.Send:
            c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                // Hub closed the channel
                c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.Conn.WriteJSON(message); err != nil {
                return
            }

        case <-ticker.C:
            c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// handleMessage handles incoming messages from client
func (c *Client) handleMessage(msg *Message) {
    switch msg.Type {
    case MessageTypePing:
        // Respond with pong
        pongMsg, _ := NewMessage(MessageTypePong, nil, "")
        c.Send <- pongMsg

    case "join_room":
        var payload struct {
            Room string `json:"room"`
        }
        if err := msg.UnmarshalPayload(&payload); err == nil {
            c.JoinRoom(payload.Room)
        }

    case "leave_room":
        var payload struct {
            Room string `json:"room"`
        }
        if err := msg.UnmarshalPayload(&payload); err == nil {
            c.LeaveRoom(payload.Room)
        }

    default:
        // Broadcast to room
        if msg.Room != "" {
            c.Hub.BroadcastToRoom(msg.Room, msg)
        } else {
            c.Hub.Broadcast <- msg
        }
    }
}

// JoinRoom adds client to a room
func (c *Client) JoinRoom(room string) {
    c.Rooms[room] = true
    c.Hub.AddToRoom(room, c)
    
    log.Printf("Client %s joined room %s", c.UserID, room)
}

// LeaveRoom removes client from a room
func (c *Client) LeaveRoom(room string) {
    delete(c.Rooms, room)
    c.Hub.RemoveFromRoom(room, c)
    
    log.Printf("Client %s left room %s", c.UserID, room)
}

// IsInRoom checks if client is in a room
func (c *Client) IsInRoom(room string) bool {
    return c.Rooms[room]
}
```

### 4. Hub Implementation

```go
// pkg/websocket/hub.go
package websocket

import (
    "log"
    "sync"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
    // Registered clients
    clients map[*Client]bool

    // Rooms map: room name -> clients in that room
    rooms map[string]map[*Client]bool

    // Inbound messages from clients
    Broadcast chan *Message

    // Register requests from clients
    Register chan *Client

    // Unregister requests from clients
    Unregister chan *Client

    // Mutex for thread-safe operations
    mu sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        rooms:      make(map[string]map[*Client]bool),
        Broadcast:  make(chan *Message, 256),
        Register:   make(chan *Client),
        Unregister: make(chan *Client),
    }
}

// Run starts the hub
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.Register:
            h.registerClient(client)

        case client := <-h.Unregister:
            h.unregisterClient(client)

        case message := <-h.Broadcast:
            h.broadcastMessage(message)
        }
    }
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    h.clients[client] = true
    log.Printf("Client registered: %s (total: %d)", client.UserID, len(h.clients))

    // Send welcome message
    welcomeMsg, _ := NewMessage(MessageTypeConnected, map[string]string{
        "message": "Connected to WebSocket server",
        "user_id": client.UserID,
    }, "")
    client.Send <- welcomeMsg
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    if _, ok := h.clients[client]; ok {
        // Remove from all rooms
        for room := range client.Rooms {
            h.removeFromRoom(room, client)
        }

        // Remove from clients and close send channel
        delete(h.clients, client)
        close(client.Send)

        log.Printf("Client unregistered: %s (total: %d)", client.UserID, len(h.clients))
    }
}

// broadcastMessage broadcasts a message to all clients
func (h *Hub) broadcastMessage(message *Message) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    for client := range h.clients {
        select {
        case client.Send <- message:
        default:
            // Client send buffer is full, close it
            close(client.Send)
            delete(h.clients, client)
        }
    }
}

// BroadcastToRoom broadcasts a message to all clients in a room
func (h *Hub) BroadcastToRoom(room string, message *Message) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    clients, exists := h.rooms[room]
    if !exists {
        return
    }

    // Set room in message
    message.Room = room

    for client := range clients {
        select {
        case client.Send <- message:
        default:
            // Client send buffer is full, skip
            log.Printf("Failed to send to client %s in room %s", client.UserID, room)
        }
    }

    log.Printf("Broadcast to room %s: %d clients", room, len(clients))
}

// BroadcastToUser sends a message to a specific user (all their connections)
func (h *Hub) BroadcastToUser(userID string, message *Message) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    count := 0
    for client := range h.clients {
        if client.UserID == userID {
            select {
            case client.Send <- message:
                count++
            default:
                log.Printf("Failed to send to user %s", userID)
            }
        }
    }

    log.Printf("Broadcast to user %s: %d connections", userID, count)
}

// AddToRoom adds a client to a room
func (h *Hub) AddToRoom(room string, client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    h.addToRoom(room, client)
}

// addToRoom is the internal non-locking version
func (h *Hub) addToRoom(room string, client *Client) {
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[*Client]bool)
    }
    h.rooms[room][client] = true
}

// RemoveFromRoom removes a client from a room
func (h *Hub) RemoveFromRoom(room string, client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    h.removeFromRoom(room, client)
}

// removeFromRoom is the internal non-locking version
func (h *Hub) removeFromRoom(room string, client *Client) {
    if clients, exists := h.rooms[room]; exists {
        delete(clients, client)
        
        // Clean up empty rooms
        if len(clients) == 0 {
            delete(h.rooms, room)
        }
    }
}

// GetRoomClients returns the number of clients in a room
func (h *Hub) GetRoomClients(room string) int {
    h.mu.RLock()
    defer h.mu.RUnlock()

    if clients, exists := h.rooms[room]; exists {
        return len(clients)
    }
    return 0
}

// GetTotalClients returns the total number of connected clients
func (h *Hub) GetTotalClients() int {
    h.mu.RLock()
    defer h.mu.RUnlock()

    return len(h.clients)
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
    h.mu.Lock()
    defer h.mu.Unlock()

    log.Println("Shutting down WebSocket hub...")

    // Send disconnect message to all clients
    disconnectMsg, _ := NewMessage(MessageTypeDisconnected, map[string]string{
        "message": "Server is shutting down",
    }, "")

    for client := range h.clients {
        client.Send <- disconnectMsg
        close(client.Send)
        client.Conn.Close()
    }

    // Clear all data
    h.clients = make(map[*Client]bool)
    h.rooms = make(map[string]map[*Client]bool)

    log.Println("WebSocket hub shutdown complete")
}
```

### 5. WebSocket Handler dengan Authentication

```go
// pkg/websocket/handler.go
package websocket

import (
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "your-project/pkg/auth"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // In production, validate origin properly
        origin := r.Header.Get("Origin")
        
        // Whitelist allowed origins
        allowedOrigins := []string{
            "http://localhost:3000",
            "http://localhost:5173",
            "https://yourdomain.com",
        }
        
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                return true
            }
        }
        
        // For development, allow all
        // TODO: Remove in production
        return true
    },
}

type Handler struct {
    hub        *Hub
    jwtManager *auth.JWTManager
}

func NewHandler(hub *Hub, jwtManager *auth.JWTManager) *Handler {
    return &Handler{
        hub:        hub,
        jwtManager: jwtManager,
    }
}

// ServeWS handles WebSocket requests
func (h *Handler) ServeWS(c *gin.Context) {
    // Get token from query parameter
    token := c.Query("token")
    if token == "" {
        c.JSON(http.StatusUnauthorized, gin.H{
            "error": "Missing authentication token",
        })
        return
    }

    // Verify JWT token
    claims, err := h.jwtManager.Verify(token)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{
            "error": "Invalid authentication token",
        })
        return
    }

    // Upgrade HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection: %v", err)
        return
    }

    // Create new client
    client := NewClient(h.hub, conn, claims.UserID)

    // Register client to hub
    h.hub.Register <- client

    // Auto-join user's personal room
    personalRoom := "user:" + claims.UserID
    client.JoinRoom(personalRoom)

    // Start goroutines for reading and writing
    go client.WritePump()
    go client.ReadPump()
}

// GetStats returns WebSocket statistics
func (h *Handler) GetStats(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "total_clients": h.hub.GetTotalClients(),
        "total_rooms":   len(h.hub.rooms),
    })
}

// GetRoomInfo returns information about a specific room
func (h *Handler) GetRoomInfo(c *gin.Context) {
    room := c.Param("room")
    
    c.JSON(http.StatusOK, gin.H{
        "room":    room,
        "clients": h.hub.GetRoomClients(room),
    })
}
```

### 6. Integration dengan HTTP Handlers

```go
// internal/task/service.go
package task

import (
    "context"
    "errors"

    "your-project/pkg/websocket"
)

type Service interface {
    Create(ctx context.Context, req CreateTaskRequest) (*Task, error)
    Update(ctx context.Context, id string, req UpdateTaskRequest) (*Task, error)
    Delete(ctx context.Context, id string) error
}

type service struct {
    repo Repository
    hub  *websocket.Hub
}

func NewService(repo Repository, hub *websocket.Hub) Service {
    return &service{
        repo: repo,
        hub:  hub,
    }
}

func (s *service) Create(ctx context.Context, req CreateTaskRequest) (*Task, error) {
    // Create task in database
    task := &Task{
        Title:       req.Title,
        Description: req.Description,
        Status:      "todo",
        ProjectID:   req.ProjectID,
        AssigneeID:  req.AssigneeID,
    }

    if err := s.repo.Create(ctx, task); err != nil {
        return nil, err
    }

    // Send real-time notification via WebSocket
    s.notifyTaskCreated(task)

    return task, nil
}

func (s *service) Update(ctx context.Context, id string, req UpdateTaskRequest) (*Task, error) {
    task, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, errors.New("task not found")
    }

    // Update fields
    if req.Title != "" {
        task.Title = req.Title
    }
    if req.Description != "" {
        task.Description = req.Description
    }
    if req.Status != "" {
        task.Status = req.Status
    }

    if err := s.repo.Update(ctx, task); err != nil {
        return nil, err
    }

    // Send real-time notification via WebSocket
    s.notifyTaskUpdated(task)

    return task, nil
}

func (s *service) Delete(ctx context.Context, id string) error {
    task, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return errors.New("task not found")
    }

    if err := s.repo.Delete(ctx, id); err != nil {
        return err
    }

    // Send real-time notification via WebSocket
    s.notifyTaskDeleted(task)

    return nil
}

// notifyTaskCreated sends task creation notification
func (s *service) notifyTaskCreated(task *Task) {
    payload := websocket.TaskPayload{
        ID:          task.ID,
        Title:       task.Title,
        Description: task.Description,
        Status:      task.Status,
        AssigneeID:  task.AssigneeID,
        ProjectID:   task.ProjectID,
    }

    msg, err := websocket.NewMessage(websocket.MessageTypeTaskCreated, payload, "")
    if err != nil {
        return
    }

    // Broadcast to project room
    projectRoom := "project:" + task.ProjectID
    s.hub.BroadcastToRoom(projectRoom, msg)

    // Also notify assignee
    if task.AssigneeID != "" {
        userRoom := "user:" + task.AssigneeID
        s.hub.BroadcastToRoom(userRoom, msg)
    }
}

// notifyTaskUpdated sends task update notification
func (s *service) notifyTaskUpdated(task *Task) {
    payload := websocket.TaskPayload{
        ID:          task.ID,
        Title:       task.Title,
        Description: task.Description,
        Status:      task.Status,
        AssigneeID:  task.AssigneeID,
        ProjectID:   task.ProjectID,
    }

    msg, err := websocket.NewMessage(websocket.MessageTypeTaskUpdated, payload, "")
    if err != nil {
        return
    }

    // Broadcast to project room
    projectRoom := "project:" + task.ProjectID
    s.hub.BroadcastToRoom(projectRoom, msg)
}

// notifyTaskDeleted sends task deletion notification
func (s *service) notifyTaskDeleted(task *Task) {
    payload := map[string]string{
        "id":         task.ID,
        "project_id": task.ProjectID,
    }

    msg, err := websocket.NewMessage(websocket.MessageTypeTaskDeleted, payload, "")
    if err != nil {
        return
    }

    // Broadcast to project room
    projectRoom := "project:" + task.ProjectID
    s.hub.BroadcastToRoom(projectRoom, msg)
}
```

### 7. Complete Main Application

```go
// cmd/api/main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
    "your-project/config"
    "your-project/internal/task"
    pkgauth "your-project/pkg/auth"
    "your-project/pkg/websocket"
)

func main() {
    // Load config
    cfg := config.LoadConfig()

    // Setup database
    db, err := config.NewMySQLDatabase(cfg.MySQL)
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Setup JWT
    jwtManager := pkgauth.NewJWTManager(cfg.App.JWTSecret, 24*time.Hour)

    // Setup WebSocket Hub
    hub := websocket.NewHub()
    go hub.Run()

    // Setup repositories
    taskRepo := task.NewRepository(db)

    // Setup services (inject hub for real-time notifications)
    taskService := task.NewService(taskRepo, hub)

    // Setup handlers
    wsHandler := websocket.NewHandler(hub, jwtManager)
    taskHandler := task.NewHandler(taskService)

    // Setup Gin
    r := gin.Default()

    // CORS middleware
    r.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    })

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "ok",
            "ws_clients": hub.GetTotalClients(),
        })
    })

    // WebSocket endpoint
    r.GET("/ws", wsHandler.ServeWS)

    // WebSocket stats (admin only in production)
    r.GET("/ws/stats", wsHandler.GetStats)
    r.GET("/ws/rooms/:room", wsHandler.GetRoomInfo)

    // API routes
    api := r.Group("/api/v1")
    {
        tasks := api.Group("/tasks")
        {
            tasks.GET("", taskHandler.List)
            tasks.GET("/:id", taskHandler.GetByID)
            tasks.POST("", taskHandler.Create)       // Will send WebSocket notification
            tasks.PUT("/:id", taskHandler.Update)    // Will send WebSocket notification
            tasks.DELETE("/:id", taskHandler.Delete) // Will send WebSocket notification
        }
    }

    // Graceful shutdown
    srv := &http.Server{
        Addr:    ":3000",
        Handler: r,
    }

    // Start server in goroutine
    go func() {
        log.Println("Server starting on :3000")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Failed to start server: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    // Shutdown WebSocket hub
    hub.Shutdown()

    // Shutdown HTTP server
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }

    log.Println("Server exited")
}
```

### 8. Frontend Client Example (JavaScript)

```javascript
// frontend/websocket-client.js

class WebSocketClient {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect() {
    const url = `ws://localhost:3000/ws?token=${this.token}`;
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0; // Reset on successful connection
      this.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.onDisconnected();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  joinRoom(room) {
    this.send({
      type: 'join_room',
      payload: { room },
      timestamp: new Date().toISOString(),
    });
  }

  leaveRoom(room) {
    this.send({
      type: 'leave_room',
      payload: { room },
      timestamp: new Date().toISOString(),
    });
  }

  on(messageType, callback) {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    this.listeners.get(messageType).push(callback);
  }

  off(messageType, callback) {
    if (!this.listeners.has(messageType)) return;
    
    const callbacks = this.listeners.get(messageType);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  handleMessage(message) {
    console.log('Received message:', message);

    // Trigger type-specific listeners
    if (this.listeners.has(message.type)) {
      this.listeners.get(message.type).forEach((callback) => {
        callback(message.payload, message);
      });
    }

    // Trigger wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach((callback) => {
        callback(message.payload, message);
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  onConnected() {
    // Override this method
  }

  onDisconnected() {
    // Override this method
  }
}

// Usage example
const ws = new WebSocketClient('your-jwt-token');

// Listen for specific message types
ws.on('task_created', (payload) => {
  console.log('New task:', payload);
  // Update UI
});

ws.on('task_updated', (payload) => {
  console.log('Task updated:', payload);
  // Update UI
});

ws.on('notification', (payload) => {
  console.log('Notification:', payload);
  // Show notification
});

// Join project room
ws.on('connected', () => {
  ws.joinRoom('project:123');
});

// Connect
ws.connect();
```

### 9. React Hook Example

```typescript
// frontend/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface Message {
  type: string;
  payload: any;
  room?: string;
  from?: string;
  timestamp: string;
}

interface UseWebSocketOptions {
  token: string;
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { token, onMessage, onConnect, onDisconnect } = options;
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    const url = `ws://localhost:3000/ws?token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      onConnect?.();
    };

    ws.current.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        setLastMessage(message);
        onMessage?.(message);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      onDisconnect?.();
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [token]);

  const send = (message: Partial<Message>) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const joinRoom = (room: string) => {
    send({ type: 'join_room', payload: { room } });
  };

  const leaveRoom = (room: string) => {
    send({ type: 'leave_room', payload: { room } });
  };

  return {
    isConnected,
    lastMessage,
    send,
    joinRoom,
    leaveRoom,
  };
}

// Usage in component
function ProjectPage({ projectId, token }: { projectId: string; token: string }) {
  const { isConnected, lastMessage, joinRoom } = useWebSocket({
    token,
    onConnect: () => {
      console.log('Connected to WebSocket');
    },
    onMessage: (message) => {
      console.log('Received:', message);
    },
  });

  useEffect(() => {
    if (isConnected) {
      joinRoom(`project:${projectId}`);
    }
  }, [isConnected, projectId]);

  useEffect(() => {
    if (lastMessage?.type === 'task_updated') {
      // Handle task update
      console.log('Task updated:', lastMessage.payload);
    }
  }, [lastMessage]);

  return (
    <div>
      <p>WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      {/* Your UI */}
    </div>
  );
}
```

### 10. Testing WebSocket

```go
// pkg/websocket/client_test.go
package websocket_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "github.com/stretchr/testify/assert"
    pkgauth "your-project/pkg/auth"
    ws "your-project/pkg/websocket"
)

func setupTestServer() (*httptest.Server, *ws.Hub, *pkgauth.JWTManager) {
    gin.SetMode(gin.TestMode)

    hub := ws.NewHub()
    go hub.Run()

    jwtManager := pkgauth.NewJWTManager("test-secret-key", time.Hour)

    r := gin.New()
    handler := ws.NewHandler(hub, jwtManager)
    r.GET("/ws", handler.ServeWS)

    server := httptest.NewServer(r)
    return server, hub, jwtManager
}

func TestWebSocketConnection(t *testing.T) {
    server, hub, jwtManager := setupTestServer()
    defer server.Close()

    // Generate token
    token, err := jwtManager.Generate("user-123", "test@example.com", "user", []string{})
    assert.NoError(t, err)

    // Connect to WebSocket
    url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?token=" + token
    conn, _, err := websocket.DefaultDialer.Dial(url, nil)
    assert.NoError(t, err)
    defer conn.Close()

    // Wait for connection
    time.Sleep(100 * time.Millisecond)

    // Should receive welcome message
    var msg ws.Message
    err = conn.ReadJSON(&msg)
    assert.NoError(t, err)
    assert.Equal(t, ws.MessageTypeConnected, msg.Type)

    // Verify hub has client
    assert.Equal(t, 1, hub.GetTotalClients())
}

func TestWebSocketAuthentication(t *testing.T) {
    server, _, _ := setupTestServer()
    defer server.Close()

    // Try to connect without token
    url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
    _, resp, err := websocket.DefaultDialer.Dial(url, nil)
    
    // Should fail with 401
    assert.Error(t, err)
    assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestWebSocketJoinRoom(t *testing.T) {
    server, hub, jwtManager := setupTestServer()
    defer server.Close()

    // Generate token
    token, err := jwtManager.Generate("user-123", "test@example.com", "user", []string{})
    assert.NoError(t, err)

    // Connect to WebSocket
    url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?token=" + token
    conn, _, err := websocket.DefaultDialer.Dial(url, nil)
    assert.NoError(t, err)
    defer conn.Close()

    // Read welcome message
    var welcomeMsg ws.Message
    conn.ReadJSON(&welcomeMsg)

    // Join room
    joinMsg := map[string]interface{}{
        "type": "join_room",
        "payload": map[string]string{
            "room": "test-room",
        },
    }
    err = conn.WriteJSON(joinMsg)
    assert.NoError(t, err)

    // Wait for room join
    time.Sleep(100 * time.Millisecond)

    // Verify room has client
    assert.Equal(t, 1, hub.GetRoomClients("test-room"))
}

func TestWebSocketBroadcast(t *testing.T) {
    server, hub, jwtManager := setupTestServer()
    defer server.Close()

    // Connect two clients
    token1, _ := jwtManager.Generate("user-1", "user1@example.com", "user", []string{})
    token2, _ := jwtManager.Generate("user-2", "user2@example.com", "user", []string{})

    url1 := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?token=" + token1
    url2 := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?token=" + token2

    conn1, _, _ := websocket.DefaultDialer.Dial(url1, nil)
    defer conn1.Close()

    conn2, _, _ := websocket.DefaultDialer.Dial(url2, nil)
    defer conn2.Close()

    // Skip welcome messages
    var welcomeMsg ws.Message
    conn1.ReadJSON(&welcomeMsg)
    conn2.ReadJSON(&welcomeMsg)

    // Both join same room
    joinMsg := map[string]interface{}{
        "type": "join_room",
        "payload": map[string]string{
            "room": "broadcast-test",
        },
    }
    conn1.WriteJSON(joinMsg)
    conn2.WriteJSON(joinMsg)

    time.Sleep(100 * time.Millisecond)

    // Broadcast to room
    broadcastMsg, _ := ws.NewMessage(ws.MessageTypeNotification, map[string]string{
        "message": "Hello room!",
    }, "broadcast-test")
    hub.BroadcastToRoom("broadcast-test", broadcastMsg)

    // Both clients should receive message
    var msg1, msg2 ws.Message
    
    conn1.SetReadDeadline(time.Now().Add(time.Second))
    err1 := conn1.ReadJSON(&msg1)
    assert.NoError(t, err1)
    assert.Equal(t, ws.MessageTypeNotification, msg1.Type)

    conn2.SetReadDeadline(time.Now().Add(time.Second))
    err2 := conn2.ReadJSON(&msg2)
    assert.NoError(t, err2)
    assert.Equal(t, ws.MessageTypeNotification, msg2.Type)
}

func TestWebSocketPingPong(t *testing.T) {
    server, _, jwtManager := setupTestServer()
    defer server.Close()

    token, _ := jwtManager.Generate("user-123", "test@example.com", "user", []string{})
    url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?token=" + token
    
    conn, _, _ := websocket.DefaultDialer.Dial(url, nil)
    defer conn.Close()

    // Skip welcome message
    var welcomeMsg ws.Message
    conn.ReadJSON(&welcomeMsg)

    // Send ping
    pingMsg := ws.Message{
        Type:      ws.MessageTypePing,
        Timestamp: time.Now(),
    }
    err := conn.WriteJSON(pingMsg)
    assert.NoError(t, err)

    // Should receive pong
    var pongMsg ws.Message
    conn.SetReadDeadline(time.Now().Add(time.Second))
    err = conn.ReadJSON(&pongMsg)
    assert.NoError(t, err)
    assert.Equal(t, ws.MessageTypePong, pongMsg.Type)
}
```

### 11. Benchmark Test

```go
// pkg/websocket/hub_benchmark_test.go
package websocket_test

import (
    "fmt"
    "testing"

    ws "your-project/pkg/websocket"
)

func BenchmarkHubBroadcast(b *testing.B) {
    hub := ws.NewHub()
    go hub.Run()

    // Create mock clients
    numClients := 1000
    for i := 0; i < numClients; i++ {
        // Mock client registration
        // In real test, you'd create actual WebSocket connections
    }

    msg, _ := ws.NewMessage(ws.MessageTypeNotification, map[string]string{
        "message": "Benchmark test",
    }, "")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        hub.Broadcast <- msg
    }
}

func BenchmarkRoomBroadcast(b *testing.B) {
    hub := ws.NewHub()
    go hub.Run()

    roomSizes := []int{10, 100, 1000}

    for _, size := range roomSizes {
        b.Run(fmt.Sprintf("Room%d", size), func(b *testing.B) {
            roomName := fmt.Sprintf("test-room-%d", size)
            
            // Mock clients in room
            // In real test, create actual clients and join room

            msg, _ := ws.NewMessage(ws.MessageTypeNotification, map[string]string{
                "message": "Benchmark test",
            }, roomName)

            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                hub.BroadcastToRoom(roomName, msg)
            }
        })
    }
}
```

## ❌ Common Mistakes + Fix

### 1. ❌ Lupa set CheckOrigin (CORS issue)

```go
// ❌ SALAH — Default CheckOrigin block semua origin
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    // Missing CheckOrigin!
}
// Client error: "Origin not allowed"
```

```go
// ✅ BENAR — Set CheckOrigin dengan whitelist
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        allowedOrigins := []string{
            "http://localhost:3000",
            "https://yourdomain.com",
        }
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                return true
            }
        }
        return false
    },
}
```

### 2. ❌ Tidak handle close dengan graceful

```go
// ❌ SALAH — Force close semua koneksi
func (h *Hub) Shutdown() {
    for client := range h.clients {
        client.Conn.Close() // Abrupt close!
    }
}
```

```go
// ✅ BENAR — Kirim disconnect message dulu
func (h *Hub) Shutdown() {
    disconnectMsg, _ := NewMessage(MessageTypeDisconnected, map[string]string{
        "message": "Server shutting down",
    }, "")

    for client := range h.clients {
        client.Send <- disconnectMsg
        time.Sleep(10 * time.Millisecond) // Give time to send
        close(client.Send)
        client.Conn.Close()
    }
}
```

### 3. ❌ Race condition di Hub

```go
// ❌ SALAH — Tidak pakai mutex saat akses map
func (h *Hub) BroadcastToRoom(room string, msg *Message) {
    clients := h.rooms[room] // Race condition!
    for client := range clients {
        client.Send <- msg
    }
}
```

```go
// ✅ BENAR — Pakai RWMutex untuk thread safety
func (h *Hub) BroadcastToRoom(room string, msg *Message) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    clients, exists := h.rooms[room]
    if !exists {
        return
    }

    for client := range clients {
        client.Send <- msg
    }
}
```

### 4. ❌ Send channel blocking

```go
// ❌ SALAH — Blocking send (deadlock risk)
func (h *Hub) BroadcastToRoom(room string, msg *Message) {
    for client := range h.rooms[room] {
        client.Send <- msg // Bisa blocking kalau channel full!
    }
}
```

```go
// ✅ BENAR — Non-blocking send dengan select
func (h *Hub) BroadcastToRoom(room string, msg *Message) {
    for client := range h.rooms[room] {
        select {
        case client.Send <- msg:
            // Success
        default:
            // Channel full, skip atau disconnect client
            log.Printf("Client %s channel full", client.UserID)
        }
    }
}
```

### 5. ❌ Tidak implement ping/pong heartbeat

```go
// ❌ SALAH — Tidak ada heartbeat
func (c *Client) WritePump() {
    for {
        msg := <-c.Send
        c.Conn.WriteJSON(msg)
    }
}
// Connection bisa mati tanpa terdeteksi!
```

```go
// ✅ BENAR — Implement ping/pong dengan ticker
func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer ticker.Stop()

    for {
        select {
        case msg := <-c.Send:
            c.Conn.WriteJSON(msg)
        case <-ticker.C:
            c.Conn.WriteMessage(websocket.PingMessage, nil)
        }
    }
}
```

### 6. ❌ JWT token di URL (security risk)

```go
// ❌ SALAH — Token visible di logs & history
ws://localhost:3000/ws?token=eyJhbGc...
// Token exposed di browser history, server logs!
```

```go
// ✅ LEBIH BAIK — Token di header (tapi WebSocket tidak support custom header easily)
// Alternatif: Token di first message setelah connect
// Atau pakai subprotocol untuk auth
var upgrader = websocket.Upgrader{
    Subprotocols: []string{"access_token"},
}

// Client send token as subprotocol
const ws = new WebSocket('ws://localhost:3000/ws', ['access_token', token]);
```

### 7. ❌ Tidak cleanup room yang kosong

```go
// ❌ SALAH — Room tetap ada walau kosong
func (h *Hub) RemoveFromRoom(room string, client *Client) {
    delete(h.rooms[room], client)
    // Room masih exist dengan 0 clients (memory leak!)
}
```

```go
// ✅ BENAR — Hapus room kalau kosong
func (h *Hub) RemoveFromRoom(room string, client *Client) {
    if clients, exists := h.rooms[room]; exists {
        delete(clients, client)
        
        // Clean up empty room
        if len(clients) == 0 {
            delete(h.rooms, room)
        }
    }
}
```

### 8. ❌ Broadcast di HTTP handler thread

```go
// ❌ SALAH — Broadcast blocking HTTP response
func (h *Handler) CreateTask(c *gin.Context) {
    task := createTask(...)
    
    // Blocking broadcast
    hub.BroadcastToRoom(room, msg) // Slow!
    
    c.JSON(200, task)
}
```

```go
// ✅ BENAR — Broadcast asynchronous
func (h *Handler) CreateTask(c *gin.Context) {
    task := createTask(...)
    
    // Non-blocking broadcast
    go hub.BroadcastToRoom(room, msg)
    
    c.JSON(200, task)
}
```

### 9. ❌ Tidak validate message dari client

```go
// ❌ SALAH — Trust client message blindly
func (c *Client) handleMessage(msg *Message) {
    // Langsung broadcast tanpa validasi!
    c.Hub.Broadcast <- msg
}
```

```go
// ✅ BENAR — Validate message type & payload
func (c *Client) handleMessage(msg *Message) {
    // Whitelist message types dari client
    allowedTypes := []MessageType{
        MessageTypePing,
        "join_room",
        "leave_room",
        "chat_message",
    }
    
    if !contains(allowedTypes, msg.Type) {
        return // Ignore invalid message
    }
    
    // Validate payload size
    if len(msg.Payload) > maxPayloadSize {
        return
    }
    
    c.Hub.Broadcast <- msg
}
```

### 10. ❌ Tidak limit message rate

```go
// ❌ SALAH — Client bisa spam messages
func (c *Client) ReadPump() {
    for {
        var msg Message
        c.Conn.ReadJSON(&msg)
        c.handleMessage(&msg) // No rate limiting!
    }
}
```

```go
// ✅ BENAR — Implement rate limiting
type Client struct {
    // ... other fields
    lastMessageTime time.Time
    messageCount    int
}

func (c *Client) ReadPump() {
    for {
        var msg Message
        c.Conn.ReadJSON(&msg)
        
        // Rate limit: 10 messages per second
        now := time.Now()
        if now.Sub(c.lastMessageTime) < time.Second {
            c.messageCount++
            if c.messageCount > 10 {
                continue // Drop message
            }
        } else {
            c.messageCount = 0
            c.lastMessageTime = now
        }
        
        c.handleMessage(&msg)
    }
}
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Setup WebSocket upgrader dengan CheckOrigin
- [ ] Create WebSocket handler di Gin
- [ ] Authenticate WebSocket connection dengan JWT
- [ ] Implement Hub pattern untuk connection management
- [ ] Create Client struct dengan send channel
- [ ] Implement ReadPump dan WritePump goroutines
- [ ] Handle client register dan unregister
- [ ] Implement room-based broadcasting
- [ ] Join dan leave room functionality
- [ ] Broadcast ke semua client atau room tertentu
- [ ] Send message dari HTTP handler ke WebSocket
- [ ] Implement ping/pong heartbeat
- [ ] Handle graceful shutdown
- [ ] Create WebSocket client di frontend
- [ ] Test WebSocket dengan gorilla/websocket
- [ ] Handle reconnection di client
- [ ] Validate incoming messages
- [ ] Implement rate limiting
- [ ] Monitor WebSocket stats (total clients, rooms)

## 💭 Ide Pengembangan Mandiri

Setelah paham WebSocket, coba kembangkan:

1. **Presence System:**
   - User online/offline status
   - Last seen timestamp
   - Typing indicators
   - User activity tracking

2. **Private Messaging:**
   - 1-on-1 chat dengan WebSocket
   - Message delivery confirmation
   - Read receipts
   - Message history sync

3. **Advanced Room Features:**
   - Room permissions (admin, moderator, member)
   - Kick/ban users from room
   - Room invitation system
   - Private vs public rooms

4. **Message Persistence:**
   - Save messages to database
   - Message queue untuk offline users
   - Retry failed messages
   - Message ordering/sequencing

5. **Scalability:**
   - Redis Pub/Sub untuk multi-server
   - Horizontal scaling dengan rooms distribution
   - Load balancing WebSocket connections
   - Connection pooling

6. **Security Enhancements:**
   - Token refresh via WebSocket
   - Rate limiting per user
   - Message content filtering
   - XSS prevention

7. **Performance Optimization:**
   - Message batching
   - Compression (permessage-deflate)
   - Binary protocol (protobuf)
   - Connection pooling

8. **Monitoring:**
   - Prometheus metrics
   - Connection duration tracking
   - Message throughput
   - Error rate monitoring

9. **Advanced Features:**
   - Voice/video signaling
   - File transfer coordination
   - Screen sharing coordination
   - Collaborative editing

10. **Developer Tools:**
    - WebSocket debugger
    - Message inspector
    - Connection simulator
    - Load testing tools

---

**Tips Pro:**
- **Ping/pong wajib!** → Detect dead connections early
- **Buffer size matters** → Sesuaikan dengan use case (chat vs streaming)
- **Graceful shutdown** → Jangan disconnect tiba-tiba
- **Room cleanup** → Hapus empty rooms untuk prevent memory leak
- **Non-blocking send** → Pakai select untuk avoid deadlock
- **RWMutex di Hub** → Read lock untuk broadcast, write lock untuk register/unregister
- **Async broadcast dari HTTP** → Jangan block response time
- **Validate client messages** → Jangan trust client input
- **Rate limiting** → Prevent spam dan abuse
- **Monitor stats** → Track connections, rooms, message throughput

**WebSocket adalah game changer untuk real-time features!** Chat, notifications, live updates, collaborative editing — semua butuh WebSocket. 🚀
