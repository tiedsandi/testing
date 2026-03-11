# BELAJAR GORM HOOKS + EVENT-DRIVEN PATTERN + CLI SCRIPTS DI GO

## Penjelasan Konsep

**GORM Hooks** adalah callback functions yang dipanggil otomatis pada lifecycle events (sebelum/sesudah create, update, delete). **Event-Driven Pattern** adalah arsitektur dimana komponen berkomunikasi via events, bukan direct calls. **CLI Scripts** adalah command-line tools untuk task automation.

**Analogi TypeScript/Prisma:**
```typescript
// Prisma Middleware (mirip GORM hooks)
prisma.$use(async (params, next) => {
  if (params.action === 'create' && params.model === 'User') {
    params.args.data.password = await hash(params.args.data.password);
  }
  return next(params);
});

// Event-driven dengan Node EventEmitter
eventEmitter.on('user.created', async (user) => {
  await sendWelcomeEmail(user.email);
  await setupDefaultSettings(user.id);
});

eventEmitter.emit('user.created', user);

// CLI dengan Commander.js
program
  .command('seed')
  .description('Seed database')
  .action(() => seedDatabase());
```

**Di Go GORM:**
```go
// GORM Hook
func (u *User) BeforeCreate(tx *gorm.DB) error {
    u.Password = hashPassword(u.Password)
    return nil
}

// Event-driven
eventBus.Publish("user.created", user)
eventBus.Subscribe("user.created", func(data interface{}) {
    // Handle event async
})

// CLI dengan Cobra
rootCmd.AddCommand(&cobra.Command{
    Use: "seed",
    Run: func(cmd *cobra.Command, args []string) {
        seedDatabase()
    },
})
```

**Konsep penting:**
1. **Hooks**: Auto-execute logic pada database operations
2. **Events**: Decouple components, async processing
3. **Channel**: Go's native way untuk async communication
4. **CLI**: Automation untuk development & maintenance tasks
5. **Migrations**: Version control untuk database schema

**Kapan pakai:**
- ✅ Hook: Data transformation (hash password, generate UUID, set timestamp)
- ✅ Event: Side effects yang bisa async (email, notifications, analytics)
- ✅ CLI: Seeding, migrations, cleanup, batch processing
- ❌ Hook: Business logic kompleks (masuk service layer)
- ❌ Event: Critical operations yang harus synchronous

---

## Struktur Project

```
gorm-hooks-events-go/
├── cmd/
│   ├── api/
│   │   └── main.go              # API server
│   └── cli/
│       └── main.go              # CLI commands
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   └── database.go
│   ├── model/
│   │   ├── user.go              # With hooks
│   │   ├── post.go              # With hooks
│   │   └── audit_log.go
│   ├── event/
│   │   ├── eventbus.go          # Event bus implementation
│   │   ├── events.go            # Event definitions
│   │   └── handlers.go          # Event handlers
│   ├── repository/
│   │   ├── user_repository.go
│   │   └── post_repository.go
│   ├── service/
│   │   ├── user_service.go      # Publishes events
│   │   ├── email_service.go
│   │   └── notification_service.go
│   ├── handler/
│   │   └── user_handler.go
│   └── cli/
│       ├── seed.go              # Seed command
│       ├── migrate.go           # Migrate command
│       └── cleanup.go           # Cleanup command
├── migrations/
│   ├── 000001_create_users_table.up.sql
│   ├── 000001_create_users_table.down.sql
│   ├── 000002_create_posts_table.up.sql
│   ├── 000002_create_posts_table.down.sql
│   └── ...
├── .env
├── docker-compose.yml
├── Makefile
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Core dependencies
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/gofiber/fiber/v2
go get github.com/spf13/viper
go get github.com/spf13/cobra

# Migration tool
go get github.com/golang-migrate/migrate/v4
go get github.com/golang-migrate/migrate/v4/database/postgres
go get github.com/golang-migrate/migrate/v4/source/file

# Fake data generator
go get github.com/brianvoe/gofakeit/v6

# Password hashing
go get golang.org/x/crypto/bcrypt

# UUID
go get github.com/google/uuid
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: hooks_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 2. Models dengan GORM Hooks

**internal/model/user.go:**
```go
package model

import (
    "time"
    "strings"
    
    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
    
    Name     string `gorm:"type:varchar(100);not null" json:"name"`
    Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
    Username string `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
    Password string `gorm:"type:varchar(255);not null" json:"-"` // Hidden from JSON
    Status   string `gorm:"type:varchar(20);default:'active'" json:"status"`
    
    Posts []Post `gorm:"foreignKey:UserID" json:"posts,omitempty"`
}

// BeforeCreate hook - runs before INSERT
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // 1. Hash password
    if u.Password != "" {
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
        if err != nil {
            return err
        }
        u.Password = string(hashedPassword)
    }
    
    // 2. Generate username if empty
    if u.Username == "" {
        u.Username = strings.ToLower(strings.ReplaceAll(u.Name, " ", ""))
    }
    
    // 3. Normalize email
    u.Email = strings.ToLower(strings.TrimSpace(u.Email))
    
    return nil
}

// BeforeSave hook - runs before INSERT or UPDATE
func (u *User) BeforeSave(tx *gorm.DB) error {
    // Validate email format
    if !strings.Contains(u.Email, "@") {
        return gorm.ErrInvalidValue
    }
    
    return nil
}

// AfterCreate hook - runs after INSERT
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Create audit log
    auditLog := AuditLog{
        Action:     "CREATE",
        TableName:  "users",
        RecordID:   u.ID,
        NewValue:   u.Email,
    }
    return tx.Create(&auditLog).Error
}

// BeforeUpdate hook - runs before UPDATE
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    // Prevent email update after creation
    if tx.Statement.Changed("Email") {
        return gorm.ErrInvalidData
    }
    
    return nil
}

// AfterUpdate hook - runs after UPDATE
func (u *User) AfterUpdate(tx *gorm.DB) error {
    // Create audit log
    auditLog := AuditLog{
        Action:     "UPDATE",
        TableName:  "users",
        RecordID:   u.ID,
        NewValue:   u.Email,
    }
    return tx.Create(&auditLog).Error
}

// BeforeDelete hook - runs before DELETE
func (u *User) BeforeDelete(tx *gorm.DB) error {
    // Soft delete only
    if tx.Statement.Unscoped {
        return gorm.ErrInvalidDB // Prevent hard delete
    }
    
    return nil
}

// AfterDelete hook - runs after DELETE
func (u *User) AfterDelete(tx *gorm.DB) error {
    // Create audit log
    auditLog := AuditLog{
        Action:     "DELETE",
        TableName:  "users",
        RecordID:   u.ID,
    }
    return tx.Create(&auditLog).Error
}

// AfterFind hook - runs after SELECT
func (u *User) AfterFind(tx *gorm.DB) error {
    // Mask sensitive data jika perlu
    // Password sudah di-hide di JSON tag
    return nil
}

// ComparePassword checks if password matches
func (u *User) ComparePassword(password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
    return err == nil
}
```

**internal/model/post.go:**
```go
package model

import (
    "fmt"
    "regexp"
    "strings"
    "time"
    
    "gorm.io/gorm"
)

type Post struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
    
    UserID    uint   `gorm:"not null;index" json:"user_id"`
    Title     string `gorm:"type:varchar(200);not null" json:"title"`
    Slug      string `gorm:"type:varchar(200);uniqueIndex" json:"slug"`
    Body      string `gorm:"type:text;not null" json:"body"`
    Status    string `gorm:"type:varchar(20);default:'draft'" json:"status"`
    ViewCount int    `gorm:"default:0" json:"view_count"`
    
    User *User `json:"user,omitempty"`
}

// BeforeCreate hook - generate slug
func (p *Post) BeforeCreate(tx *gorm.DB) error {
    if p.Slug == "" {
        p.Slug = generateSlug(p.Title)
        
        // Check if slug exists, add suffix if needed
        var count int64
        tx.Model(&Post{}).Where("slug LIKE ?", p.Slug+"%").Count(&count)
        if count > 0 {
            p.Slug = fmt.Sprintf("%s-%d", p.Slug, count+1)
        }
    }
    
    return nil
}

// BeforeSave hook - validate
func (p *Post) BeforeSave(tx *gorm.DB) error {
    // Validate title length
    if len(p.Title) < 3 {
        return fmt.Errorf("title too short")
    }
    
    // Validate body length
    if len(p.Body) < 10 {
        return fmt.Errorf("body too short")
    }
    
    return nil
}

// AfterCreate hook
func (p *Post) AfterCreate(tx *gorm.DB) error {
    auditLog := AuditLog{
        Action:     "CREATE",
        TableName:  "posts",
        RecordID:   p.ID,
        NewValue:   p.Title,
    }
    return tx.Create(&auditLog).Error
}

// generateSlug creates URL-friendly slug from title
func generateSlug(title string) string {
    // Convert to lowercase
    slug := strings.ToLower(title)
    
    // Replace spaces with hyphens
    slug = strings.ReplaceAll(slug, " ", "-")
    
    // Remove non-alphanumeric characters (except hyphens)
    reg := regexp.MustCompile("[^a-z0-9-]+")
    slug = reg.ReplaceAllString(slug, "")
    
    // Remove multiple consecutive hyphens
    reg = regexp.MustCompile("-+")
    slug = reg.ReplaceAllString(slug, "-")
    
    // Trim hyphens from start and end
    slug = strings.Trim(slug, "-")
    
    return slug
}
```

**internal/model/audit_log.go:**
```go
package model

import "time"

type AuditLog struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at"`
    
    Action    string `gorm:"type:varchar(20);not null" json:"action"`
    TableName string `gorm:"type:varchar(50);not null" json:"table_name"`
    RecordID  uint   `gorm:"not null" json:"record_id"`
    OldValue  string `gorm:"type:text" json:"old_value,omitempty"`
    NewValue  string `gorm:"type:text" json:"new_value,omitempty"`
}
```

---

## 3. Event Bus System

**internal/event/events.go:**
```go
package event

import "time"

// Event is the base interface for all events
type Event interface {
    EventName() string
    Timestamp() time.Time
}

// BaseEvent provides common fields for events
type BaseEvent struct {
    Name string
    Time time.Time
}

func (e BaseEvent) EventName() string {
    return e.Name
}

func (e BaseEvent) Timestamp() time.Time {
    return e.Time
}

// UserCreatedEvent is emitted when user is created
type UserCreatedEvent struct {
    BaseEvent
    UserID   uint   `json:"user_id"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    Username string `json:"username"`
}

func NewUserCreatedEvent(userID uint, email, name, username string) *UserCreatedEvent {
    return &UserCreatedEvent{
        BaseEvent: BaseEvent{
            Name: "user.created",
            Time: time.Now(),
        },
        UserID:   userID,
        Email:    email,
        Name:     name,
        Username: username,
    }
}

// UserUpdatedEvent is emitted when user is updated
type UserUpdatedEvent struct {
    BaseEvent
    UserID uint   `json:"user_id"`
    Email  string `json:"email"`
}

func NewUserUpdatedEvent(userID uint, email string) *UserUpdatedEvent {
    return &UserUpdatedEvent{
        BaseEvent: BaseEvent{
            Name: "user.updated",
            Time: time.Now(),
        },
        UserID: userID,
        Email:  email,
    }
}

// PostCreatedEvent is emitted when post is created
type PostCreatedEvent struct {
    BaseEvent
    PostID uint   `json:"post_id"`
    UserID uint   `json:"user_id"`
    Title  string `json:"title"`
    Slug   string `json:"slug"`
}

func NewPostCreatedEvent(postID, userID uint, title, slug string) *PostCreatedEvent {
    return &PostCreatedEvent{
        BaseEvent: BaseEvent{
            Name: "post.created",
            Time: time.Now(),
        },
        PostID: postID,
        UserID: userID,
        Title:  title,
        Slug:   slug,
    }
}

// PostPublishedEvent is emitted when post is published
type PostPublishedEvent struct {
    BaseEvent
    PostID uint   `json:"post_id"`
    Title  string `json:"title"`
    Slug   string `json:"slug"`
}

func NewPostPublishedEvent(postID uint, title, slug string) *PostPublishedEvent {
    return &PostPublishedEvent{
        BaseEvent: BaseEvent{
            Name: "post.published",
            Time: time.Now(),
        },
        PostID: postID,
        Title:  title,
        Slug:   slug,
    }
}
```

**internal/event/eventbus.go:**
```go
package event

import (
    "context"
    "fmt"
    "log"
    "sync"
)

// HandlerFunc is a function that handles events
type HandlerFunc func(event Event)

// EventBus manages event publishing and subscription
type EventBus struct {
    handlers map[string][]HandlerFunc
    mu       sync.RWMutex
    wg       sync.WaitGroup
    ctx      context.Context
    cancel   context.CancelFunc
}

// NewEventBus creates a new event bus
func NewEventBus() *EventBus {
    ctx, cancel := context.WithCancel(context.Background())
    return &EventBus{
        handlers: make(map[string][]HandlerFunc),
        ctx:      ctx,
        cancel:   cancel,
    }
}

// Subscribe registers a handler for an event
func (eb *EventBus) Subscribe(eventName string, handler HandlerFunc) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    
    eb.handlers[eventName] = append(eb.handlers[eventName], handler)
    log.Printf("📡 Subscribed to event: %s (total handlers: %d)", eventName, len(eb.handlers[eventName]))
}

// Publish emits an event to all subscribers
func (eb *EventBus) Publish(event Event) {
    eb.mu.RLock()
    handlers, ok := eb.handlers[event.EventName()]
    eb.mu.RUnlock()
    
    if !ok {
        return // No handlers for this event
    }
    
    log.Printf("📤 Publishing event: %s", event.EventName())
    
    // Execute handlers asynchronously
    for _, handler := range handlers {
        eb.wg.Add(1)
        go func(h HandlerFunc) {
            defer eb.wg.Done()
            
            select {
            case <-eb.ctx.Done():
                return // Shutting down
            default:
                // Handle event with panic recovery
                defer func() {
                    if r := recover(); r != nil {
                        log.Printf("❌ Event handler panic: %v", r)
                    }
                }()
                
                h(event)
            }
        }(handler)
    }
}

// Shutdown gracefully shuts down the event bus
func (eb *EventBus) Shutdown() {
    log.Println("🛑 Shutting down event bus...")
    eb.cancel()
    eb.wg.Wait()
    log.Println("✅ Event bus stopped")
}
```

**internal/event/handlers.go:**
```go
package event

import (
    "fmt"
    "log"
    "time"
)

// EmailService simulates email sending
type EmailService struct{}

func NewEmailService() *EmailService {
    return &EmailService{}
}

func (s *EmailService) SendWelcomeEmail(email, name string) error {
    log.Printf("📧 Sending welcome email to %s (%s)", name, email)
    time.Sleep(500 * time.Millisecond) // Simulate email sending
    log.Printf("✅ Welcome email sent to %s", email)
    return nil
}

func (s *EmailService) SendPostPublishedNotification(email, postTitle string) error {
    log.Printf("📧 Sending post published notification to %s", email)
    time.Sleep(300 * time.Millisecond)
    log.Printf("✅ Notification sent")
    return nil
}

// NotificationService simulates push notifications
type NotificationService struct{}

func NewNotificationService() *NotificationService {
    return &NotificationService{}
}

func (s *NotificationService) SendPushNotification(userID uint, message string) error {
    log.Printf("🔔 Sending push notification to user %d: %s", userID, message)
    time.Sleep(200 * time.Millisecond)
    log.Printf("✅ Push notification sent")
    return nil
}

// RegisterEventHandlers registers all event handlers
func RegisterEventHandlers(bus *EventBus) {
    emailService := NewEmailService()
    notificationService := NewNotificationService()
    
    // User created event handlers
    bus.Subscribe("user.created", func(event Event) {
        e := event.(*UserCreatedEvent)
        
        // Send welcome email
        if err := emailService.SendWelcomeEmail(e.Email, e.Name); err != nil {
            log.Printf("❌ Failed to send welcome email: %v", err)
        }
        
        // Send push notification
        msg := fmt.Sprintf("Welcome to our platform, %s!", e.Name)
        if err := notificationService.SendPushNotification(e.UserID, msg); err != nil {
            log.Printf("❌ Failed to send push notification: %v", err)
        }
        
        // Setup default settings (simulated)
        log.Printf("⚙️  Setting up default settings for user %d", e.UserID)
        time.Sleep(100 * time.Millisecond)
        log.Printf("✅ Default settings created")
    })
    
    // Post created event handler
    bus.Subscribe("post.created", func(event Event) {
        e := event.(*PostCreatedEvent)
        log.Printf("📝 Post created: %s (ID: %d)", e.Title, e.PostID)
        
        // Analytics tracking (simulated)
        log.Printf("📊 Tracking post creation analytics...")
    })
    
    // Post published event handler
    bus.Subscribe("post.published", func(event Event) {
        e := event.(*PostPublishedEvent)
        log.Printf("🚀 Post published: %s", e.Title)
        
        // Notify followers (simulated)
        log.Printf("🔔 Notifying followers about new post...")
        time.Sleep(200 * time.Millisecond)
        
        // Index for search (simulated)
        log.Printf("🔍 Indexing post for search engine...")
    })
}
```

---

## 4. Service Layer dengan Event Publishing

**internal/service/user_service.go:**
```go
package service

import (
    "context"
    
    "gorm-hooks-events-go/internal/event"
    "gorm-hooks-events-go/internal/model"
    "gorm-hooks-events-go/internal/repository"
)

type UserService struct {
    userRepo *repository.UserRepository
    eventBus *event.EventBus
}

func NewUserService(userRepo *repository.UserRepository, eventBus *event.EventBus) *UserService {
    return &UserService{
        userRepo: userRepo,
        eventBus: eventBus,
    }
}

// CreateUser creates a user and publishes event
func (s *UserService) CreateUser(ctx context.Context, name, email, password string) (*model.User, error) {
    user := &model.User{
        Name:     name,
        Email:    email,
        Password: password, // Will be hashed in BeforeCreate hook
    }
    
    // Save user (triggers GORM hooks)
    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, err
    }
    
    // Publish event (async handlers will execute)
    s.eventBus.Publish(event.NewUserCreatedEvent(
        user.ID,
        user.Email,
        user.Name,
        user.Username,
    ))
    
    return user, nil
}

// UpdateUser updates user and publishes event
func (s *UserService) UpdateUser(ctx context.Context, id uint, name string) (*model.User, error) {
    user, err := s.userRepo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }
    
    user.Name = name
    if err := s.userRepo.Update(ctx, user); err != nil {
        return nil, err
    }
    
    s.eventBus.Publish(event.NewUserUpdatedEvent(user.ID, user.Email))
    
    return user, nil
}
```

**internal/service/post_service.go:**
```go
package service

import (
    "context"
    
    "gorm-hooks-events-go/internal/event"
    "gorm-hooks-events-go/internal/model"
    "gorm-hooks-events-go/internal/repository"
)

type PostService struct {
    postRepo *repository.PostRepository
    eventBus *event.EventBus
}

func NewPostService(postRepo *repository.PostRepository, eventBus *event.EventBus) *PostService {
    return &PostService{
        postRepo: postRepo,
        eventBus: eventBus,
    }
}

// CreatePost creates a post and publishes event
func (s *PostService) CreatePost(ctx context.Context, userID uint, title, body string) (*model.Post, error) {
    post := &model.Post{
        UserID: userID,
        Title:  title,
        Body:   body,
        Status: "draft",
    }
    
    if err := s.postRepo.Create(ctx, post); err != nil {
        return nil, err
    }
    
    s.eventBus.Publish(event.NewPostCreatedEvent(
        post.ID,
        post.UserID,
        post.Title,
        post.Slug,
    ))
    
    return post, nil
}

// PublishPost publishes a draft post
func (s *PostService) PublishPost(ctx context.Context, postID uint) (*model.Post, error) {
    post, err := s.postRepo.FindByID(ctx, postID)
    if err != nil {
        return nil, err
    }
    
    post.Status = "published"
    if err := s.postRepo.Update(ctx, post); err != nil {
        return nil, err
    }
    
    s.eventBus.Publish(event.NewPostPublishedEvent(
        post.ID,
        post.Title,
        post.Slug,
    ))
    
    return post, nil
}
```

---

## 5. CLI Commands

**cmd/cli/main.go:**
```go
package main

import (
    "fmt"
    "log"
    "os"

    "gorm-hooks-events-go/internal/cli"
    "gorm-hooks-events-go/internal/config"
    "gorm-hooks-events-go/internal/database"

    "github.com/spf13/cobra"
)

func main() {
    // Load config
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Connect to database
    db, err := database.NewDatabase(cfg)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Root command
    rootCmd := &cobra.Command{
        Use:   "cli",
        Short: "Database CLI tools",
    }

    // Add commands
    rootCmd.AddCommand(cli.NewSeedCommand(db))
    rootCmd.AddCommand(cli.NewMigrateCommand(cfg))
    rootCmd.AddCommand(cli.NewCleanupCommand(db))

    if err := rootCmd.Execute(); err != nil {
        fmt.Println(err)
        os.Exit(1)
    }
}
```

**internal/cli/seed.go:**
```go
package cli

import (
    "log"

    "gorm-hooks-events-go/internal/model"

    "github.com/brianvoe/gofakeit/v6"
    "github.com/spf13/cobra"
    "gorm.io/gorm"
)

func NewSeedCommand(db *gorm.DB) *cobra.Command {
    var count int

    cmd := &cobra.Command{
        Use:   "seed",
        Short: "Seed database with fake data",
        Run: func(cmd *cobra.Command, args []string) {
            seedDatabase(db, count)
        },
    }

    cmd.Flags().IntVarP(&count, "count", "c", 10, "Number of records to seed")
    return cmd
}

func seedDatabase(db *gorm.DB, count int) {
    log.Println("🌱 Seeding database...")

    // Check if already seeded (idempotent)
    var userCount int64
    db.Model(&model.User{}).Count(&userCount)
    if userCount > 0 {
        log.Printf("⚠️  Database already has %d users. Skipping seed.", userCount)
        return
    }

    // Seed users
    users := make([]model.User, count)
    for i := 0; i < count; i++ {
        users[i] = model.User{
            Name:     gofakeit.Name(),
            Email:    gofakeit.Email(),
            Username: gofakeit.Username(),
            Password: "password123", // Will be hashed in BeforeCreate hook
            Status:   "active",
        }
    }

    if err := db.Create(&users).Error; err != nil {
        log.Fatal("❌ Failed to seed users:", err)
    }
    log.Printf("✅ Seeded %d users", count)

    // Seed posts
    posts := make([]model.Post, count*3)
    for i := 0; i < count*3; i++ {
        posts[i] = model.Post{
            UserID: users[i%count].ID,
            Title:  gofakeit.Sentence(5),
            Body:   gofakeit.Paragraph(3, 5, 10, " "),
            Status: []string{"draft", "published"}[i%2],
        }
    }

    if err := db.Create(&posts).Error; err != nil {
        log.Fatal("❌ Failed to seed posts:", err)
    }
    log.Printf("✅ Seeded %d posts", count*3)

    log.Println("🎉 Database seeded successfully!")
}
```

**internal/cli/migrate.go:**
```go
package cli

import (
    "fmt"
    "log"

    "gorm-hooks-events-go/internal/config"

    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    "github.com/spf13/cobra"
)

func NewMigrateCommand(cfg *config.Config) *cobra.Command {
    cmd := &cobra.Command{
        Use:   "migrate",
        Short: "Database migration commands",
    }

    // migrate up
    cmd.AddCommand(&cobra.Command{
        Use:   "up",
        Short: "Run all pending migrations",
        Run: func(cmd *cobra.Command, args []string) {
            migrateUp(cfg)
        },
    })

    // migrate down
    cmd.AddCommand(&cobra.Command{
        Use:   "down",
        Short: "Rollback last migration",
        Run: func(cmd *cobra.Command, args []string) {
            migrateDown(cfg)
        },
    })

    // migrate version
    cmd.AddCommand(&cobra.Command{
        Use:   "version",
        Short: "Show current migration version",
        Run: func(cmd *cobra.Command, args []string) {
            showVersion(cfg)
        },
    })

    return cmd
}

func getMigration(cfg *config.Config) (*migrate.Migrate, error) {
    databaseURL := fmt.Sprintf(
        "postgres://%s:%s@%s:%s/%s?sslmode=disable",
        cfg.Database.User,
        cfg.Database.Password,
        cfg.Database.Host,
        cfg.Database.Port,
        cfg.Database.DBName,
    )

    return migrate.New(
        "file://migrations",
        databaseURL,
    )
}

func migrateUp(cfg *config.Config) {
    m, err := getMigration(cfg)
    if err != nil {
        log.Fatal("❌ Failed to create migration:", err)
    }
    defer m.Close()

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatal("❌ Migration failed:", err)
    }

    if err == migrate.ErrNoChange {
        log.Println("✅ No migrations to run")
    } else {
        log.Println("✅ Migrations applied successfully")
    }
}

func migrateDown(cfg *config.Config) {
    m, err := getMigration(cfg)
    if err != nil {
        log.Fatal("❌ Failed to create migration:", err)
    }
    defer m.Close()

    if err := m.Steps(-1); err != nil {
        log.Fatal("❌ Rollback failed:", err)
    }

    log.Println("✅ Rolled back last migration")
}

func showVersion(cfg *config.Config) {
    m, err := getMigration(cfg)
    if err != nil {
        log.Fatal("❌ Failed to create migration:", err)
    }
    defer m.Close()

    version, dirty, err := m.Version()
    if err != nil {
        log.Fatal("❌ Failed to get version:", err)
    }

    log.Printf("📊 Current version: %d (dirty: %v)", version, dirty)
}
```

**internal/cli/cleanup.go:**
```go
package cli

import (
    "log"
    "time"

    "gorm-hooks-events-go/internal/model"

    "github.com/spf13/cobra"
    "gorm.io/gorm"
)

func NewCleanupCommand(db *gorm.DB) *cobra.Command {
    var days int
    var hardDelete bool

    cmd := &cobra.Command{
        Use:   "cleanup",
        Short: "Cleanup old soft-deleted records",
        Run: func(cmd *cobra.Command, args []string) {
            cleanup(db, days, hardDelete)
        },
    }

    cmd.Flags().IntVarP(&days, "days", "d", 30, "Delete records older than N days")
    cmd.Flags().BoolVarP(&hardDelete, "hard", "", false, "Permanently delete records")

    return cmd
}

func cleanup(db *gorm.DB, days int, hardDelete bool) {
    log.Printf("🧹 Cleaning up records older than %d days...", days)

    cutoffDate := time.Now().AddDate(0, 0, -days)

    // Cleanup users
    var deletedUsers int64
    query := db.Unscoped().Where("deleted_at < ?", cutoffDate)
    
    if !hardDelete {
        log.Println("⚠️  Dry run mode (use --hard to actually delete)")
        query.Model(&model.User{}).Count(&deletedUsers)
    } else {
        result := query.Delete(&model.User{})
        deletedUsers = result.RowsAffected
    }
    log.Printf("🗑️  Users to delete: %d", deletedUsers)

    // Cleanup posts
    var deletedPosts int64
    query = db.Unscoped().Where("deleted_at < ?", cutoffDate)
    
    if !hardDelete {
        query.Model(&model.Post{}).Count(&deletedPosts)
    } else {
        result := query.Delete(&model.Post{})
        deletedPosts = result.RowsAffected
    }
    log.Printf("🗑️  Posts to delete: %d", deletedPosts)

    if hardDelete {
        log.Println("✅ Cleanup completed!")
    } else {
        log.Println("ℹ️  Run with --hard flag to actually delete records")
    }
}
```

---

## 6. Migration Files

**migrations/000001_create_users_table.up.sql:**
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_unique UNIQUE (username)
);

CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_status ON users(status);
```

**migrations/000001_create_users_table.down.sql:**
```sql
DROP TABLE IF EXISTS users;
```

**migrations/000002_create_posts_table.up.sql:**
```sql
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    
    CONSTRAINT posts_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_posts_deleted_at ON posts(deleted_at);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_slug ON posts(slug);
```

**migrations/000002_create_posts_table.down.sql:**
```sql
DROP TABLE IF EXISTS posts;
```

**migrations/000003_create_audit_logs_table.up.sql:**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    action VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_value TEXT,
    new_value TEXT
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

**migrations/000003_create_audit_logs_table.down.sql:**
```sql
DROP TABLE IF EXISTS audit_logs;
```

---

## 7. Repository Layer

**internal/repository/user_repository.go:**
```go
package repository

import (
    "context"
    
    "gorm-hooks-events-go/internal/model"
    
    "gorm.io/gorm"
)

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
    return r.db.WithContext(ctx).Save(user).Error
}
```

**internal/repository/post_repository.go:**
```go
package repository

import (
    "context"
    
    "gorm-hooks-events-go/internal/model"
    
    "gorm.io/gorm"
)

type PostRepository struct {
    db *gorm.DB
}

func NewPostRepository(db *gorm.DB) *PostRepository {
    return &PostRepository{db: db}
}

func (r *PostRepository) Create(ctx context.Context, post *model.Post) error {
    return r.db.WithContext(ctx).Create(post).Error
}

func (r *PostRepository) FindByID(ctx context.Context, id uint) (*model.Post, error) {
    var post model.Post
    err := r.db.WithContext(ctx).First(&post, id).Error
    if err != nil {
        return nil, err
    }
    return &post, nil
}

func (r *PostRepository) Update(ctx context.Context, post *model.Post) error {
    return r.db.WithContext(ctx).Save(post).Error
}
```

---

## 8. Main Applications

**cmd/api/main.go:**
```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"

    "gorm-hooks-events-go/internal/config"
    "gorm-hooks-events-go/internal/database"
    "gorm-hooks-events-go/internal/event"
    "gorm-hooks-events-go/internal/handler"
    "gorm-hooks-events-go/internal/repository"
    "gorm-hooks-events-go/internal/service"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    db, err := database.NewDatabase(cfg)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Create event bus
    eventBus := event.NewEventBus()
    event.RegisterEventHandlers(eventBus)

    // Repositories
    userRepo := repository.NewUserRepository(db)
    postRepo := repository.NewPostRepository(db)

    // Services
    userService := service.NewUserService(userRepo, eventBus)
    postService := service.NewPostService(postRepo, eventBus)

    // Handlers
    userHandler := handler.NewUserHandler(userService)
    postHandler := handler.NewPostHandler(postService)

    // Fiber app
    app := fiber.New()
    app.Use(logger.New())

    api := app.Group("/api")

    // User routes
    users := api.Group("/users")
    {
        users.Post("/", userHandler.CreateUser)
        users.Put("/:id", userHandler.UpdateUser)
    }

    // Post routes
    posts := api.Group("/posts")
    {
        posts.Post("/", postHandler.CreatePost)
        posts.Post("/:id/publish", postHandler.PublishPost)
    }

    // Start server
    go func() {
        port := cfg.Server.Port
        log.Printf("🚀 Server running on port %s\n", port)
        if err := app.Listen(":" + port); err != nil {
            log.Fatal(err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("🛑 Shutting down server...")
    app.Shutdown()
    eventBus.Shutdown()
    log.Println("✅ Server stopped")
}
```

**internal/handler/user_handler.go:**
```go
package handler

import (
    "gorm-hooks-events-go/internal/service"

    "github.com/gofiber/fiber/v2"
)

type UserHandler struct {
    userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
    type Request struct {
        Name     string `json:"name"`
        Email    string `json:"email"`
        Password string `json:"password"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    user, err := h.userService.CreateUser(c.Context(), req.Name, req.Email, req.Password)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(201).JSON(fiber.Map{
        "message": "User created successfully. Check logs for events!",
        "user":    user,
    })
}

func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
    id, _ := c.ParamsInt("id")

    type Request struct {
        Name string `json:"name"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    user, err := h.userService.UpdateUser(c.Context(), uint(id), req.Name)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"user": user})
}
```

**internal/handler/post_handler.go:**
```go
package handler

import (
    "gorm-hooks-events-go/internal/service"

    "github.com/gofiber/fiber/v2"
)

type PostHandler struct {
    postService *service.PostService
}

func NewPostHandler(postService *service.PostService) *PostHandler {
    return &PostHandler{postService: postService}
}

func (h *PostHandler) CreatePost(c *fiber.Ctx) error {
    type Request struct {
        UserID uint   `json:"user_id"`
        Title  string `json:"title"`
        Body   string `json:"body"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    post, err := h.postService.CreatePost(c.Context(), req.UserID, req.Title, req.Body)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(201).JSON(fiber.Map{"post": post})
}

func (h *PostHandler) PublishPost(c *fiber.Ctx) error {
    id, _ := c.ParamsInt("id")

    post, err := h.postService.PublishPost(c.Context(), uint(id))
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{
        "message": "Post published! Check logs for events.",
        "post":    post,
    })
}
```

---

## 9. Makefile

**Makefile:**
```makefile
.PHONY: help docker-up docker-down migrate-up migrate-down migrate-version seed cleanup run-api

help:
	@echo "Available commands:"
	@echo "  make docker-up      - Start Docker services"
	@echo "  make docker-down    - Stop Docker services"
	@echo "  make migrate-up     - Run migrations"
	@echo "  make migrate-down   - Rollback last migration"
	@echo "  make migrate-version - Show migration version"
	@echo "  make seed           - Seed database with fake data"
	@echo "  make cleanup        - Cleanup old records (dry run)"
	@echo "  make cleanup-hard   - Cleanup old records (permanent)"
	@echo "  make run-api        - Run API server"

docker-up:
	docker-compose up -d
	@echo "✅ PostgreSQL started"

docker-down:
	docker-compose down
	@echo "✅ Services stopped"

migrate-up:
	go run cmd/cli/main.go migrate up

migrate-down:
	go run cmd/cli/main.go migrate down

migrate-version:
	go run cmd/cli/main.go migrate version

seed:
	go run cmd/cli/main.go seed --count=20

cleanup:
	go run cmd/cli/main.go cleanup --days=30

cleanup-hard:
	go run cmd/cli/main.go cleanup --days=30 --hard

run-api:
	go run cmd/api/main.go
```

---

## Testing

### 1. Setup & Migration
```bash
# Start PostgreSQL
make docker-up

# Run migrations
make migrate-up

# Check migration version
make migrate-version
# Output: 📊 Current version: 3 (dirty: false)

# Seed database
make seed

# Output:
# 🌱 Seeding database...
# ✅ Seeded 20 users
# ✅ Seeded 60 posts
# 🎉 Database seeded successfully!
```

### 2. Test API dengan Events
```bash
# Start API server (watch logs for events)
make run-api

# Create user (triggers hooks & events)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Watch server logs:
# [BeforeCreate] Hashing password...
# [BeforeCreate] Generating username: johndoe
# [AfterCreate] Creating audit log...
# 📤 Publishing event: user.created
# 📧 Sending welcome email to John Doe (john@example.com)
# 🔔 Sending push notification to user 1: Welcome to our platform, John!
# ⚙️  Setting up default settings for user 1
# ✅ Welcome email sent to john@example.com
# ✅ Push notification sent
# ✅ Default settings created

# Response:
# {
#   "message": "User created successfully. Check logs for events!",
#   "user": {
#     "id": 1,
#     "name": "John Doe",
#     "email": "john@example.com",
#     "username": "johndoe",
#     "status": "active"
#   }
# }
```

### 3. Test Post Creation with Slug Generation
```bash
# Create post (slug auto-generated in BeforeCreate hook)
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "title": "My First Blog Post",
    "body": "This is a great post about programming."
  }'

# Response:
# {
#   "post": {
#     "id": 1,
#     "user_id": 1,
#     "title": "My First Blog Post",
#     "slug": "my-first-blog-post",  // Auto-generated!
#     "body": "This is a great post about programming.",
#     "status": "draft"
#   }
# }

# Publish post
curl -X POST http://localhost:3000/api/posts/1/publish

# Server logs:
# 📤 Publishing event: post.published
# 🚀 Post published: My First Blog Post
# 🔔 Notifying followers about new post...
# 🔍 Indexing post for search engine...
```

### 4. Test CLI Commands
```bash
# Seed more data
go run cmd/cli/main.go seed --count=50

# Cleanup (dry run)
go run cmd/cli/main.go cleanup --days=30
# Output:
# 🧹 Cleaning up records older than 30 days...
# ⚠️  Dry run mode (use --hard to actually delete)
# 🗑️  Users to delete: 5
# 🗑️  Posts to delete: 12
# ℹ️  Run with --hard flag to actually delete records

# Cleanup (permanent)
go run cmd/cli/main.go cleanup --days=30 --hard
# Output:
# 🧹 Cleaning up records older than 30 days...
# 🗑️  Users to delete: 5
# 🗑️  Posts to delete: 12
# ✅ Cleanup completed!

# Migration rollback
go run cmd/cli/main.go migrate down
# Output: ✅ Rolled back last migration

# Migration up again
go run cmd/cli/main.go migrate up
# Output: ✅ Migrations applied successfully
```

### 5. Verify Hooks Execution
```bash
# Check audit logs (created by AfterCreate hooks)
psql -U postgres -d hooks_db -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# Output:
#  id | created_at          | action | table_name | record_id | new_value
# ----+---------------------+--------+------------+-----------+------------------
#   1 | 2024-01-01 10:00:00 | CREATE | users      | 1         | john@example.com
#   2 | 2024-01-01 10:01:00 | CREATE | posts      | 1         | My First Blog Post
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **Business logic kompleks di hooks**
**Masalah:**
```go
// ❌ BAHAYA: Hook terlalu kompleks, sulit di-test
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Kirim email
    sendEmail(u.Email)
    // Update analytics
    updateAnalytics(u.ID)
    // Buat default settings
    createSettings(u.ID)
    // 20+ lines of business logic...
}
```

**Solusi:**
```go
// ✅ AMAN: Hook simple, business logic di service + event
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Only simple audit logging
    return tx.Create(&AuditLog{...}).Error
}

// Business logic di service
func (s *UserService) CreateUser(...) {
    user := &User{...}
    db.Create(user)
    
    // Emit event untuk side effects
    eventBus.Publish(UserCreatedEvent{...})
}
```

---

### 2. **Hook yang mengembalikan error tanpa rollback**
**Masalah:**
```go
// ❌ BAHAYA: Hook error tapi transaction sudah committed
func (u *User) AfterCreate(tx *gorm.DB) error {
    // External API call yang bisa fail
    err := externalAPI.Notify(u.Email)
    return err // Kalau fail, user tetap tercreate!
}
```

**Solusi:**
```go
// ✅ AMAN: Side effects via event (async, tidak block transaction)
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Only database operations that can rollback
    return tx.Create(&AuditLog{...}).Error
}

// External calls via event
eventBus.Subscribe("user.created", func(e Event) {
    // Async, tidak block transaction
    externalAPI.Notify(e.Email)
})
```

---

### 3. **Event handler yang panic tidak di-recover**
**Masalah:**
```go
// ❌ BAHAYA: Panic di handler crash entire app
eventBus.Subscribe("user.created", func(e Event) {
    result := someOperation() / 0 // Panic!
})
```

**Solusi:**
```go
// ✅ AMAN: Event bus dengan panic recovery (sudah di eventbus.go)
go func(h HandlerFunc) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("❌ Event handler panic: %v", r)
        }
    }()
    h(event)
}(handler)
```

---

### 4. **Tidak graceful shutdown event bus**
**Masalah:**
```go
// ❌ BAHAYA: Kill app, event yang sedang diproses hilang
func main() {
    eventBus := NewEventBus()
    // ...
} // Program exit, goroutines terminated!
```

**Solusi:**
```go
// ✅ AMAN: Wait for all events to complete
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt)
<-quit

eventBus.Shutdown() // Wait for WaitGroup
```

---

### 5. **Seed yang tidak idempotent**
**Masalah:**
```go
// ❌ BAHAYA: Jalankan 2x, data duplicate
func seed() {
    db.Create(&User{Email: "test@example.com"})
    // Error: duplicate key value violates unique constraint
}
```

**Solusi:**
```go
// ✅ AMAN: Check sebelum seed
var count int64
db.Model(&User{}).Count(&count)
if count > 0 {
    log.Println("Already seeded, skipping")
    return
}
db.Create(&users)
```

---

### 6. **Migration tanpa down file**
**Masalah:**
```go
// ❌ BAHAYA: Tidak bisa rollback
// 000001_create_users.up.sql exists
// 000001_create_users.down.sql MISSING!
```

**Solusi:**
```go
// ✅ AMAN: Selalu buat pair up + down
// 000001_create_users.up.sql
CREATE TABLE users (...);

// 000001_create_users.down.sql
DROP TABLE users;
```

---

### 7. **BeforeUpdate hook yang override semua changes**
**Masalah:**
```go
// ❌ BAHAYA: Hook override user input
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    u.UpdatedAt = time.Now() // OK
    u.Name = "Fixed Name"     // SALAH! Override user input
    return nil
}
```

**Solusi:**
```go
// ✅ AMAN: Only set fields yang tidak user-controlled
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    // Only auto-managed fields
    u.UpdatedAt = time.Now()
    return nil
}
```

---

### 8. **CLI command tanpa error handling**
**Masalah:**
```go
// ❌ BAHAYA: Silent failure
func seedDatabase() {
    db.Create(&users) // Error diabaikan
    log.Println("Seeded!")
}
```

**Solusi:**
```go
// ✅ AMAN: Check error dan exit dengan code
func seedDatabase() {
    if err := db.Create(&users).Error; err != nil {
        log.Fatal("Failed to seed:", err)
        os.Exit(1)
    }
    log.Println("Seeded successfully!")
}
```

---

## 10 Ide Pengembangan

### 1. **Event replay untuk debugging**
```go
type EventStore struct {
    events []Event
}

func (s *EventStore) Store(event Event) {
    s.events = append(s.events, event)
}

func (s *EventStore) Replay(from time.Time) {
    for _, event := range s.events {
        if event.Timestamp().After(from) {
            eventBus.Publish(event)
        }
    }
}
```

---

### 2. **Dead letter queue untuk failed events**
```go
func (eb *EventBus) Subscribe(eventName string, handler HandlerFunc) {
    eb.handlers[eventName] = append(eb.handlers[eventName], func(e Event) {
        defer func() {
            if r := recover(); r != nil {
                // Send to dead letter queue
                deadLetterQueue.Add(e, r)
            }
        }()
        handler(e)
    })
}
```

---

### 3. **Conditional hooks dengan tags**
```go
// Skip hooks dengan tag
db.Set("skip_hooks", true).Create(&user)

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if skip, ok := tx.Get("skip_hooks"); ok && skip.(bool) {
        return nil // Skip hook
    }
    // Normal hook logic
}
```

---

### 4. **Event saga pattern untuk distributed transactions**
```go
type Saga struct {
    steps []SagaStep
}

type SagaStep struct {
    Execute    func() error
    Compensate func() error
}

func (s *Saga) Run() error {
    executed := []SagaStep{}
    
    for _, step := range s.steps {
        if err := step.Execute(); err != nil {
            // Rollback dengan compensate
            for i := len(executed) - 1; i >= 0; i-- {
                executed[i].Compensate()
            }
            return err
        }
        executed = append(executed, step)
    }
    return nil
}
```

---

### 5. **CLI interactive mode**
```go
func NewInteractiveCommand() *cobra.Command {
    return &cobra.Command{
        Use: "interactive",
        Run: func(cmd *cobra.Command, args []string) {
            reader := bufio.NewReader(os.Stdin)
            
            fmt.Println("Enter number of users to seed:")
            input, _ := reader.ReadString('\n')
            count, _ := strconv.Atoi(strings.TrimSpace(input))
            
            seedDatabase(db, count)
        },
    }
}
```

---

### 6. **Hook untuk calculate derived fields**
```go
type Order struct {
    Items      []OrderItem
    Subtotal   float64
    Tax        float64
    Total      float64
}

func (o *Order) BeforeSave(tx *gorm.DB) error {
    o.Subtotal = 0
    for _, item := range o.Items {
        o.Subtotal += item.Price * float64(item.Quantity)
    }
    o.Tax = o.Subtotal * 0.1
    o.Total = o.Subtotal + o.Tax
    return nil
}
```

---

### 7. **Event versioning**
```go
type EventV1 struct {
    Name  string
    Email string
}

type EventV2 struct {
    Name     string
    Email    string
    Username string // New field
}

func migrateEvent(oldEvent EventV1) EventV2 {
    return EventV2{
        Name:     oldEvent.Name,
        Email:    oldEvent.Email,
        Username: generateUsername(oldEvent.Email),
    }
}
```

---

### 8. **Batch seeding dengan progress bar**
```go
import "github.com/schollz/progressbar/v3"

func seedLarge(count int) {
    bar := progressbar.Default(int64(count))
    
    for i := 0; i < count; i++ {
        user := generateFakeUser()
        db.Create(&user)
        bar.Add(1)
    }
}
```

---

### 9. **Migration generator CLI**
```go
func NewMigrationCreateCommand() *cobra.Command {
    return &cobra.Command{
        Use: "create [name]",
        Run: func(cmd *cobra.Command, args []string) {
            name := args[0]
            timestamp := time.Now().Unix()
            
            upFile := fmt.Sprintf("migrations/%d_%s.up.sql", timestamp, name)
            downFile := fmt.Sprintf("migrations/%d_%s.down.sql", timestamp, name)
            
            os.WriteFile(upFile, []byte("-- Migration up"), 0644)
            os.WriteFile(downFile, []byte("-- Migration down"), 0644)
            
            log.Printf("Created migration: %s", name)
        },
    }
}
```

---

### 10. **Event-driven cache invalidation**
```go
func RegisterCacheInvalidation(bus *EventBus, cache *Cache) {
    bus.Subscribe("user.updated", func(e Event) {
        event := e.(*UserUpdatedEvent)
        cache.Delete("user:" + strconv.Itoa(int(event.UserID)))
    })
    
    bus.Subscribe("post.created", func(e Event) {
        cache.Delete("posts:all")
    })
}
```

---

## Kesimpulan

**GORM Hooks + Event-Driven Pattern + CLI** adalah toolkit powerful untuk production app. Key points:

1. **Hooks**: Auto-execute simple logic (hash, slug, audit)
2. **Events**: Decouple side effects (email, notifications)
3. **EventBus**: Simple channel-based implementation
4. **CLI**: Automation untuk seed, migrate, cleanup
5. **Migrations**: Version control untuk schema

**Production Checklist:**
- ✅ Use hooks untuk data transformation only
- ✅ Use events untuk async side effects
- ✅ Implement graceful shutdown untuk event bus
- ✅ Buat seed yang idempotent
- ✅ Selalu buat migration up + down files
- ✅ Error handling di semua CLI commands
- ✅ Panic recovery di event handlers
- ✅ Audit logging via hooks

**Commands:**
```bash
make docker-up
make migrate-up
make seed
make run-api

# Test
curl -X POST http://localhost:3000/api/users \
  -d '{"name":"Alice","email":"alice@test.com","password":"pass123"}'

# Cleanup
make cleanup-hard
```

Happy eventing! 🎉
