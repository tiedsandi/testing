# BELAJAR BACKGROUND JOBS + SCHEDULER DI GO

## Penjelasan Konsep

**Background Jobs** adalah task yang dijalankan di luar request-response cycle, biasanya untuk operasi yang lambat atau tidak urgent. **Scheduler** adalah sistem untuk menjadwalkan task berjalan di waktu tertentu (cron jobs).

**Analogi TypeScript/Next.js:**
```typescript
// TypeScript dengan Bull (Redis queue) + node-cron
import Queue from 'bull';
import cron from 'node-cron';

// Queue untuk async tasks
const emailQueue = new Queue('emails', 'redis://localhost:6379');

// Enqueue task
emailQueue.add('send-welcome', {
  to: 'user@example.com',
  template: 'welcome',
});

// Process task
emailQueue.process('send-welcome', async (job) => {
  await sendEmail(job.data);
});

// Cron scheduler
cron.schedule('0 8 * * *', () => {
  // Generate report setiap jam 8 pagi
  emailQueue.add('daily-report', { date: new Date() });
});
```

**Di Go menggunakan:**
- **asynq**: Redis-based task queue (mirip Sidekiq/Celery/Bull)
- **robfig/cron**: Cron scheduler dengan expression syntax

**Konsep penting:**
1. **Producer (Client)**: Enqueue task ke queue
2. **Consumer (Worker)**: Process task dari queue
3. **Queue Priority**: critical, default, low
4. **Retry**: Otomatis retry dengan exponential backoff
5. **Scheduler**: Trigger task di waktu tertentu
6. **Pattern**: Cron → Enqueue Task (lebih robust daripada cron langsung execute)

**Kapan pakai background jobs:**
- ✅ Kirim email (jangan block HTTP response)
- ✅ Generate PDF/Excel report
- ✅ Image/video processing
- ✅ Webhook outgoing
- ✅ Data import/export
- ✅ Cleanup/maintenance tasks
- ❌ Critical transaction (harus synchronous)
- ❌ Real-time response yang dibutuhkan user

---

## Struktur Project

```
background-jobs-go/
├── cmd/
│   ├── api/
│   │   └── main.go          # API server (producer)
│   └── worker/
│       └── main.go          # Worker server (consumer)
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── tasks/
│   │   ├── client.go        # Asynq client
│   │   ├── tasks.go         # Task type definitions
│   │   ├── email_task.go    # Email task handler
│   │   ├── report_task.go   # Report task handler
│   │   ├── cleanup_task.go  # Cleanup task handler
│   │   └── webhook_task.go  # Webhook task handler
│   ├── scheduler/
│   │   └── cron.go          # Cron scheduler
│   ├── service/
│   │   ├── email_service.go
│   │   └── report_service.go
│   ├── handler/
│   │   ├── user_handler.go
│   │   └── webhook_handler.go
│   └── middleware/
│       └── error_handler.go
├── pkg/
│   └── utils/
│       ├── webhook.go
│       └── logger.go
├── .env
├── docker-compose.yml
├── Makefile
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Install dependencies
go get github.com/hibiken/asynq
go get github.com/robfig/cron/v3
go get github.com/gofiber/fiber/v2
go get github.com/redis/go-redis/v9
go get github.com/spf13/viper
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

**go.mod:**
```go
module background-jobs-go

go 1.21

require (
    github.com/hibiken/asynq v0.24.1
    github.com/robfig/cron/v3 v3.0.1
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/redis/go-redis/v9 v9.4.0
    github.com/spf13/viper v1.18.2
    github.com/google/uuid v1.5.0
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
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
      POSTGRES_DB: jobs_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Asynq monitoring web UI
  asynqmon:
    image: hibiken/asynqmon:latest
    ports:
      - "8080:8080"
    command:
      - --redis-addr=redis:6379
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
```

**Start services:**
```bash
docker-compose up -d

# Check services
docker-compose ps

# Asynq Monitor UI: http://localhost:8080
```

---

## 2. Configuration

**.env:**
```env
# Server
API_PORT=3000
WORKER_CONCURRENCY=10

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=jobs_db

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# Webhook
WEBHOOK_SECRET=your-webhook-secret-key-minimum-32-characters

# Email (for tasks)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@example.com

# App
APP_ENV=development
```

**internal/config/config.go:**
```go
package config

import (
    "fmt"

    "github.com/spf13/viper"
)

type Config struct {
    API     APIConfig
    Worker  WorkerConfig
    DB      DatabaseConfig
    Redis   RedisConfig
    Webhook WebhookConfig
    SMTP    SMTPConfig
    App     AppConfig
}

type APIConfig struct {
    Port string
}

type WorkerConfig struct {
    Concurrency int
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
}

type RedisConfig struct {
    Addr     string
    Password string
}

type WebhookConfig struct {
    Secret string
}

type SMTPConfig struct {
    Host string
    Port string
    From string
}

type AppConfig struct {
    Env string
}

func LoadConfig() (*Config, error) {
    viper.SetConfigFile(".env")
    viper.AutomaticEnv()

    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    return &Config{
        API: APIConfig{
            Port: viper.GetString("API_PORT"),
        },
        Worker: WorkerConfig{
            Concurrency: viper.GetInt("WORKER_CONCURRENCY"),
        },
        DB: DatabaseConfig{
            Host:     viper.GetString("DB_HOST"),
            Port:     viper.GetString("DB_PORT"),
            User:     viper.GetString("DB_USER"),
            Password: viper.GetString("DB_PASSWORD"),
            DBName:   viper.GetString("DB_NAME"),
        },
        Redis: RedisConfig{
            Addr:     viper.GetString("REDIS_ADDR"),
            Password: viper.GetString("REDIS_PASSWORD"),
        },
        Webhook: WebhookConfig{
            Secret: viper.GetString("WEBHOOK_SECRET"),
        },
        SMTP: SMTPConfig{
            Host: viper.GetString("SMTP_HOST"),
            Port: viper.GetString("SMTP_PORT"),
            From: viper.GetString("SMTP_FROM"),
        },
        App: AppConfig{
            Env: viper.GetString("APP_ENV"),
        },
    }, nil
}

func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        c.Host, c.Port, c.User, c.Password, c.DBName,
    )
}
```

---

## 3. Task Definitions & Client

**internal/tasks/tasks.go:**
```go
package tasks

// Task type constants
const (
    TypeEmailWelcome     = "email:welcome"
    TypeEmailVerification = "email:verification"
    TypeDailyReport      = "report:daily"
    TypeCleanupExpired   = "cleanup:expired"
    TypeWebhookOutgoing  = "webhook:outgoing"
    TypeReminderDeadline = "reminder:deadline"
)

// Queue names
const (
    QueueCritical = "critical" // High priority (emails, webhooks)
    QueueDefault  = "default"  // Normal priority
    QueueLow      = "low"      // Low priority (cleanup, reports)
)
```

**internal/tasks/client.go:**
```go
package tasks

import (
    "encoding/json"
    "fmt"
    "time"

    "background-jobs-go/internal/config"

    "github.com/hibiken/asynq"
)

// TaskClient wraps asynq client
type TaskClient struct {
    client *asynq.Client
}

// NewTaskClient creates a new task client
func NewTaskClient(cfg *config.Config) *TaskClient {
    client := asynq.NewClient(asynq.RedisClientOpt{
        Addr:     cfg.Redis.Addr,
        Password: cfg.Redis.Password,
    })

    return &TaskClient{client: client}
}

// Close closes the client connection
func (c *TaskClient) Close() error {
    return c.client.Close()
}

// EnqueueEmailWelcome enqueues welcome email task
func (c *TaskClient) EnqueueEmailWelcome(email, name string) error {
    payload := map[string]interface{}{
        "email": email,
        "name":  name,
    }

    return c.enqueueTask(TypeEmailWelcome, payload, 
        asynq.Queue(QueueCritical),
        asynq.MaxRetry(3),
        asynq.Timeout(30*time.Second),
    )
}

// EnqueueEmailVerification enqueues email verification task
func (c *TaskClient) EnqueueEmailVerification(email, token string) error {
    payload := map[string]interface{}{
        "email": email,
        "token": token,
    }

    return c.enqueueTask(TypeEmailVerification, payload,
        asynq.Queue(QueueCritical),
        asynq.MaxRetry(3),
        asynq.Timeout(30*time.Second),
    )
}

// EnqueueDailyReport enqueues daily report generation task
func (c *TaskClient) EnqueueDailyReport(date time.Time) error {
    payload := map[string]interface{}{
        "date": date.Format("2006-01-02"),
    }

    return c.enqueueTask(TypeDailyReport, payload,
        asynq.Queue(QueueLow),
        asynq.MaxRetry(5),
        asynq.Timeout(10*time.Minute),
    )
}

// EnqueueCleanupExpired enqueues cleanup task
func (c *TaskClient) EnqueueCleanupExpired() error {
    return c.enqueueTask(TypeCleanupExpired, nil,
        asynq.Queue(QueueLow),
        asynq.MaxRetry(3),
        asynq.Timeout(5*time.Minute),
    )
}

// EnqueueWebhook enqueues webhook delivery task
func (c *TaskClient) EnqueueWebhook(url string, event string, data map[string]interface{}) error {
    payload := map[string]interface{}{
        "url":   url,
        "event": event,
        "data":  data,
    }

    return c.enqueueTask(TypeWebhookOutgoing, payload,
        asynq.Queue(QueueCritical),
        asynq.MaxRetry(5),
        asynq.Timeout(30*time.Second),
    )
}

// EnqueueReminderDeadline enqueues reminder task
func (c *TaskClient) EnqueueReminderDeadline(userID string, deadline time.Time) error {
    payload := map[string]interface{}{
        "user_id":  userID,
        "deadline": deadline.Format(time.RFC3339),
    }

    // Schedule task to run 1 day before deadline
    processAt := deadline.Add(-24 * time.Hour)

    return c.enqueueTask(TypeReminderDeadline, payload,
        asynq.Queue(QueueDefault),
        asynq.ProcessAt(processAt),
        asynq.MaxRetry(3),
    )
}

// enqueueTask is a helper to enqueue any task
func (c *TaskClient) enqueueTask(taskType string, payload interface{}, opts ...asynq.Option) error {
    // Marshal payload to JSON
    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("failed to marshal payload: %w", err)
    }

    // Create task
    task := asynq.NewTask(taskType, payloadBytes, opts...)

    // Enqueue task
    info, err := c.client.Enqueue(task)
    if err != nil {
        return fmt.Errorf("failed to enqueue task: %w", err)
    }

    fmt.Printf("✅ Enqueued task: type=%s, id=%s, queue=%s\n", 
        info.Type, info.ID, info.Queue)

    return nil
}
```

---

## 4. Task Handlers

**internal/tasks/email_task.go:**
```go
package tasks

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/hibiken/asynq"
)

// EmailWelcomePayload defines the payload structure
type EmailWelcomePayload struct {
    Email string `json:"email"`
    Name  string `json:"name"`
}

// HandleEmailWelcome handles welcome email task
func HandleEmailWelcome(ctx context.Context, t *asynq.Task) error {
    var payload EmailWelcomePayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("failed to unmarshal payload: %w", err)
    }

    fmt.Printf("📧 Sending welcome email to %s (%s)...\n", payload.Name, payload.Email)

    // Simulate email sending
    time.Sleep(2 * time.Second)

    // Actual email service integration here
    // emailService.SendWelcome(payload.Email, payload.Name)

    fmt.Printf("✅ Welcome email sent to %s\n", payload.Email)
    return nil
}

// EmailVerificationPayload defines the payload structure
type EmailVerificationPayload struct {
    Email string `json:"email"`
    Token string `json:"token"`
}

// HandleEmailVerification handles email verification task
func HandleEmailVerification(ctx context.Context, t *asynq.Task) error {
    var payload EmailVerificationPayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("failed to unmarshal payload: %w", err)
    }

    fmt.Printf("📧 Sending verification email to %s...\n", payload.Email)

    // Simulate email sending
    time.Sleep(1 * time.Second)

    // emailService.SendVerification(payload.Email, payload.Token)

    fmt.Printf("✅ Verification email sent to %s\n", payload.Email)
    return nil
}
```

**internal/tasks/report_task.go:**
```go
package tasks

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/hibiken/asynq"
)

// DailyReportPayload defines the payload structure
type DailyReportPayload struct {
    Date string `json:"date"`
}

// HandleDailyReport handles daily report generation task
func HandleDailyReport(ctx context.Context, t *asynq.Task) error {
    var payload DailyReportPayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("failed to unmarshal payload: %w", err)
    }

    fmt.Printf("📊 Generating daily report for %s...\n", payload.Date)

    // Simulate report generation (expensive operation)
    time.Sleep(5 * time.Second)

    // Steps:
    // 1. Query database for data
    // 2. Calculate statistics
    // 3. Generate PDF/Excel
    // 4. Upload to S3
    // 5. Send email with link

    fmt.Printf("✅ Daily report generated for %s\n", payload.Date)
    return nil
}
```

**internal/tasks/cleanup_task.go:**
```go
package tasks

import (
    "context"
    "fmt"
    "time"

    "github.com/hibiken/asynq"
)

// HandleCleanupExpired handles cleanup of expired data
func HandleCleanupExpired(ctx context.Context, t *asynq.Task) error {
    fmt.Println("🧹 Starting cleanup of expired data...")

    // Simulate cleanup operations
    time.Sleep(3 * time.Second)

    // Steps:
    // 1. Delete expired sessions from Redis
    // 2. Delete expired verification tokens from DB
    // 3. Archive old records
    // 4. Clean up temp files

    deletedCount := 157 // Example
    fmt.Printf("✅ Cleanup completed: %d records deleted\n", deletedCount)
    
    return nil
}
```

**internal/tasks/webhook_task.go:**
```go
package tasks

import (
    "bytes"
    "context"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"

    "github.com/hibiken/asynq"
)

// WebhookPayload defines the payload structure
type WebhookPayload struct {
    URL   string                 `json:"url"`
    Event string                 `json:"event"`
    Data  map[string]interface{} `json:"data"`
}

// HandleWebhookOutgoing handles webhook delivery task
func HandleWebhookOutgoing(ctx context.Context, t *asynq.Task) error {
    var payload WebhookPayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("failed to unmarshal payload: %w", err)
    }

    fmt.Printf("🔗 Sending webhook to %s (event: %s)...\n", payload.URL, payload.Event)

    // Prepare webhook body
    webhookData := map[string]interface{}{
        "event":     payload.Event,
        "data":      payload.Data,
        "timestamp": time.Now().Unix(),
    }

    bodyBytes, err := json.Marshal(webhookData)
    if err != nil {
        return fmt.Errorf("failed to marshal webhook body: %w", err)
    }

    // Generate HMAC signature
    signature := generateHMACSignature(bodyBytes, "your-webhook-secret")

    // Send HTTP POST request
    req, err := http.NewRequestWithContext(ctx, "POST", payload.URL, bytes.NewBuffer(bodyBytes))
    if err != nil {
        return fmt.Errorf("failed to create request: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-Webhook-Signature", signature)
    req.Header.Set("X-Webhook-Event", payload.Event)

    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("failed to send webhook: %w", err)
    }
    defer resp.Body.Close()

    // Check response
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("webhook failed with status %d: %s", resp.StatusCode, string(body))
    }

    fmt.Printf("✅ Webhook sent successfully to %s (status: %d)\n", payload.URL, resp.StatusCode)
    return nil
}

// generateHMACSignature generates HMAC SHA256 signature
func generateHMACSignature(data []byte, secret string) string {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(data)
    return hex.EncodeToString(h.Sum(nil))
}
```

---

## 5. Task Server (Worker)

**cmd/worker/main.go:**
```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "background-jobs-go/internal/config"
    "background-jobs-go/internal/tasks"

    "github.com/hibiken/asynq"
)

func main() {
    // Load config
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Create asynq server (worker)
    srv := asynq.NewServer(
        asynq.RedisClientOpt{
            Addr:     cfg.Redis.Addr,
            Password: cfg.Redis.Password,
        },
        asynq.Config{
            // Number of concurrent workers
            Concurrency: cfg.Worker.Concurrency,

            // Queue priority: critical > default > low
            Queues: map[string]int{
                tasks.QueueCritical: 6, // 60% of workers
                tasks.QueueDefault:  3, // 30% of workers
                tasks.QueueLow:      1, // 10% of workers
            },

            // Retry settings
            RetryDelayFunc: asynq.DefaultRetryDelayFunc,

            // Error handler
            ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
                log.Printf("❌ Task failed: type=%s, err=%v, retry=%d", 
                    task.Type(), err, task.ResultWriter().(*asynq.ResultWriter))
            }),
        },
    )

    // Create task mux (router)
    mux := asynq.NewServeMux()

    // Register task handlers
    mux.HandleFunc(tasks.TypeEmailWelcome, tasks.HandleEmailWelcome)
    mux.HandleFunc(tasks.TypeEmailVerification, tasks.HandleEmailVerification)
    mux.HandleFunc(tasks.TypeDailyReport, tasks.HandleDailyReport)
    mux.HandleFunc(tasks.TypeCleanupExpired, tasks.HandleCleanupExpired)
    mux.HandleFunc(tasks.TypeWebhookOutgoing, tasks.HandleWebhookOutgoing)

    // Start server in goroutine
    go func() {
        log.Printf("🔧 Worker server starting (concurrency: %d)...\n", cfg.Worker.Concurrency)
        log.Println("📊 Asynq Monitor: http://localhost:8080")
        
        if err := srv.Run(mux); err != nil {
            log.Fatal("Failed to start worker:", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("🛑 Shutting down worker gracefully...")
    srv.Shutdown()
    log.Println("✅ Worker stopped")
}
```

---

## 6. Cron Scheduler

**internal/scheduler/cron.go:**
```go
package scheduler

import (
    "context"
    "log"
    "time"

    "background-jobs-go/internal/tasks"

    "github.com/robfig/cron/v3"
)

type Scheduler struct {
    cron       *cron.Cron
    taskClient *tasks.TaskClient
}

// NewScheduler creates a new cron scheduler
func NewScheduler(taskClient *tasks.TaskClient) *Scheduler {
    // Create cron with seconds precision and named jobs
    c := cron.New(
        cron.WithSeconds(),
        cron.WithChain(
            cron.Recover(cron.DefaultLogger), // Recover from panics
        ),
    )

    return &Scheduler{
        cron:       c,
        taskClient: taskClient,
    }
}

// Start starts the cron scheduler
func (s *Scheduler) Start() {
    // Register cron jobs
    s.registerJobs()

    // Start cron
    s.cron.Start()
    log.Println("⏰ Cron scheduler started")
}

// Stop stops the cron scheduler gracefully
func (s *Scheduler) Stop() {
    ctx := s.cron.Stop()
    <-ctx.Done() // Wait for running jobs to complete
    log.Println("✅ Cron scheduler stopped")
}

// registerJobs registers all scheduled jobs
func (s *Scheduler) registerJobs() {
    // Daily report at 8 AM every day
    s.cron.AddFunc("0 0 8 * * *", func() {
        log.Println("⏰ Triggering daily report job...")
        if err := s.taskClient.EnqueueDailyReport(time.Now()); err != nil {
            log.Printf("Failed to enqueue daily report: %v\n", err)
        }
    })

    // Cleanup expired data every hour
    s.cron.AddFunc("0 0 * * * *", func() {
        log.Println("⏰ Triggering cleanup job...")
        if err := s.taskClient.EnqueueCleanupExpired(); err != nil {
            log.Printf("Failed to enqueue cleanup: %v\n", err)
        }
    })

    // Health check every 5 minutes
    s.cron.AddFunc("0 */5 * * * *", func() {
        log.Println("💓 Health check: scheduler running")
    })

    // Example: send reminder 1 day before deadline (run at midnight)
    s.cron.AddFunc("0 0 0 * * *", func() {
        log.Println("⏰ Checking for upcoming deadlines...")
        // Query database for deadlines in next 24 hours
        // For each deadline, enqueue reminder task
        // s.taskClient.EnqueueReminderDeadline(userID, deadline)
    })

    // Demo: run every 30 seconds (for testing)
    if false { // Set to true for demo
        s.cron.AddFunc("*/30 * * * * *", func() {
            log.Println("🔔 Demo job running every 30 seconds")
            s.taskClient.EnqueueCleanupExpired()
        })
    }

    log.Println("📅 Registered all cron jobs")
}

// GetEntries returns all scheduled entries (for debugging)
func (s *Scheduler) GetEntries() []cron.Entry {
    return s.cron.Entries()
}
```

**Cron Expression Examples:**
```go
// Format: second minute hour day month weekday

"0 0 8 * * *"        // Every day at 8:00 AM
"0 30 9 * * MON-FRI" // Weekdays at 9:30 AM
"0 0 */6 * * *"      // Every 6 hours
"0 0 0 1 * *"        // First day of every month at midnight
"*/30 * * * * *"     // Every 30 seconds
"0 0 0 * * SUN"      // Every Sunday at midnight
"0 15 10 * * *"      // Every day at 10:15 AM
```

---

## 7. API Server (Producer)

**cmd/api/main.go:**
```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "background-jobs-go/internal/config"
    "background-jobs-go/internal/handler"
    "background-jobs-go/internal/scheduler"
    "background-jobs-go/internal/tasks"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
    // Load config
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Create task client
    taskClient := tasks.NewTaskClient(cfg)
    defer taskClient.Close()

    // Create scheduler
    cronScheduler := scheduler.NewScheduler(taskClient)
    cronScheduler.Start()

    // Create Fiber app
    app := fiber.New(fiber.Config{
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    })

    // Middleware
    app.Use(recover.New())
    app.Use(logger.New())

    // Handlers
    userHandler := handler.NewUserHandler(taskClient)
    webhookHandler := handler.NewWebhookHandler(taskClient)

    // Routes
    api := app.Group("/api")

    // User routes
    users := api.Group("/users")
    {
        users.Post("/register", userHandler.Register)
    }

    // Webhook routes
    webhooks := api.Group("/webhooks")
    {
        webhooks.Post("/trigger", webhookHandler.Trigger)
    }

    // Manual job triggers (for testing)
    jobs := api.Group("/jobs")
    {
        jobs.Post("/email/welcome", func(c *fiber.Ctx) error {
            type Request struct {
                Email string `json:"email"`
                Name  string `json:"name"`
            }
            var req Request
            if err := c.BodyParser(&req); err != nil {
                return err
            }

            if err := taskClient.EnqueueEmailWelcome(req.Email, req.Name); err != nil {
                return err
            }

            return c.JSON(fiber.Map{
                "message": "Welcome email job enqueued",
            })
        })

        jobs.Post("/report/daily", func(c *fiber.Ctx) error {
            if err := taskClient.EnqueueDailyReport(time.Now()); err != nil {
                return err
            }

            return c.JSON(fiber.Map{
                "message": "Daily report job enqueued",
            })
        })

        jobs.Post("/cleanup", func(c *fiber.Ctx) error {
            if err := taskClient.EnqueueCleanupExpired(); err != nil {
                return err
            }

            return c.JSON(fiber.Map{
                "message": "Cleanup job enqueued",
            })
        })
    }

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "ok",
            "time":   time.Now(),
        })
    })

    // Scheduler info
    app.Get("/scheduler/jobs", func(c *fiber.Ctx) error {
        entries := cronScheduler.GetEntries()
        jobs := make([]fiber.Map, len(entries))
        
        for i, entry := range entries {
            jobs[i] = fiber.Map{
                "id":   entry.ID,
                "next": entry.Next,
                "prev": entry.Prev,
            }
        }

        return c.JSON(fiber.Map{
            "jobs":  jobs,
            "count": len(jobs),
        })
    })

    // Start server in goroutine
    go func() {
        port := cfg.API.Port
        log.Printf("🚀 API server running on port %s\n", port)
        log.Println("📊 Asynq Monitor: http://localhost:8080")
        
        if err := app.Listen(":" + port); err != nil {
            log.Fatal(err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("🛑 Shutting down API server gracefully...")
    
    // Stop scheduler
    cronScheduler.Stop()
    
    // Shutdown Fiber
    app.Shutdown()
    
    log.Println("✅ API server stopped")
}
```

---

## 8. Handlers

**internal/handler/user_handler.go:**
```go
package handler

import (
    "background-jobs-go/internal/tasks"

    "github.com/gofiber/fiber/v2"
)

type UserHandler struct {
    taskClient *tasks.TaskClient
}

func NewUserHandler(taskClient *tasks.TaskClient) *UserHandler {
    return &UserHandler{taskClient: taskClient}
}

// Register handles user registration
func (h *UserHandler) Register(c *fiber.Ctx) error {
    type Request struct {
        Name     string `json:"name"`
        Email    string `json:"email"`
        Password string `json:"password"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // 1. Create user in database
    // db.Create(&user)

    // 2. Enqueue welcome email (async, non-blocking)
    if err := h.taskClient.EnqueueEmailWelcome(req.Email, req.Name); err != nil {
        // Log error but don't fail registration
        // log.Printf("Failed to enqueue welcome email: %v", err)
    }

    // 3. Enqueue verification email
    verificationToken := "sample-token-123"
    if err := h.taskClient.EnqueueEmailVerification(req.Email, verificationToken); err != nil {
        // log.Printf("Failed to enqueue verification email: %v", err)
    }

    // 4. Return response immediately (emails sent in background)
    return c.Status(201).JSON(fiber.Map{
        "message": "User registered successfully. Check your email.",
        "user": fiber.Map{
            "name":  req.Name,
            "email": req.Email,
        },
    })
}
```

**internal/handler/webhook_handler.go:**
```go
package handler

import (
    "background-jobs-go/internal/tasks"

    "github.com/gofiber/fiber/v2"
)

type WebhookHandler struct {
    taskClient *tasks.TaskClient
}

func NewWebhookHandler(taskClient *tasks.TaskClient) *WebhookHandler {
    return &WebhookHandler{taskClient: taskClient}
}

// Trigger simulates triggering a webhook
func (h *WebhookHandler) Trigger(c *fiber.Ctx) error {
    type Request struct {
        URL   string                 `json:"url"`
        Event string                 `json:"event"`
        Data  map[string]interface{} `json:"data"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Enqueue webhook delivery task (with retry)
    if err := h.taskClient.EnqueueWebhook(req.URL, req.Event, req.Data); err != nil {
        return c.Status(500).JSON(fiber.Map{
            "error": "Failed to enqueue webhook",
        })
    }

    return c.JSON(fiber.Map{
        "message": "Webhook enqueued for delivery",
        "event":   req.Event,
    })
}
```

---

## 9. Makefile

**Makefile:**
```makefile
.PHONY: help api worker docker-up docker-down test

help:
	@echo "Available commands:"
	@echo "  make docker-up    - Start Docker services (Redis, PostgreSQL, Asynqmon)"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make api          - Start API server"
	@echo "  make worker       - Start worker server"
	@echo "  make all          - Start both API and worker"
	@echo "  make test         - Run tests"
	@echo "  make monitor      - Open Asynq monitor"

docker-up:
	docker-compose up -d
	@echo "✅ Docker services started"
	@echo "📊 Asynq Monitor: http://localhost:8080"

docker-down:
	docker-compose down
	@echo "✅ Docker services stopped"

api:
	go run cmd/api/main.go

worker:
	go run cmd/worker/main.go

# Run both in parallel (for development)
all:
	@echo "Starting API and Worker..."
	@make -j2 api worker

test:
	go test -v ./...

monitor:
	@echo "Opening Asynq Monitor..."
	@open http://localhost:8080 || xdg-open http://localhost:8080
```

---

## Testing

### 1. Start Services
```bash
# Start Docker services
make docker-up

# Terminal 1: Start worker
make worker

# Terminal 2: Start API
make api

# Terminal 3: Open Asynq Monitor
make monitor
# Or visit: http://localhost:8080
```

### 2. Test Background Jobs
```bash
# Register user (triggers welcome + verification emails)
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "message": "User registered successfully. Check your email.",
#   "user": {
#     "name": "John Doe",
#     "email": "john@example.com"
#   }
# }

# Check worker logs - you'll see:
# ✅ Enqueued task: type=email:welcome, id=xxx, queue=critical
# ✅ Enqueued task: type=email:verification, id=xxx, queue=critical
# 📧 Sending welcome email to John Doe (john@example.com)...
# ✅ Welcome email sent to john@example.com
```

### 3. Test Manual Job Triggers
```bash
# Trigger daily report
curl -X POST http://localhost:3000/jobs/report/daily

# Trigger cleanup
curl -X POST http://localhost:3000/jobs/cleanup

# Trigger welcome email
curl -X POST http://localhost:3000/jobs/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### 4. Test Webhook
```bash
# Setup webhook receiver (httpbin)
curl -X POST http://localhost:3000/api/webhooks/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "event": "user.created",
    "data": {
      "user_id": "123",
      "email": "user@example.com"
    }
  }'

# Check worker logs:
# 🔗 Sending webhook to https://httpbin.org/post (event: user.created)...
# ✅ Webhook sent successfully (status: 200)
```

### 5. View Asynq Monitor
```
Open browser: http://localhost:8080

You'll see:
- Active tasks
- Scheduled tasks
- Failed tasks (with retry info)
- Queue statistics
- Task details
```

### 6. Test Retry Mechanism
```bash
# Trigger webhook to invalid URL (will retry)
curl -X POST http://localhost:3000/api/webhooks/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://invalid-url-that-fails.com",
    "event": "test.event",
    "data": {}
  }'

# Check Asynq Monitor - you'll see task retrying with exponential backoff
# Retry 1: immediate
# Retry 2: after 30 seconds
# Retry 3: after 90 seconds
# etc.
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **Menjalankan task langsung di cron handler**
**Masalah:**
```go
// ❌ BAHAYA: Task langsung dijalankan di cron, tidak bisa di-monitor/retry
cron.AddFunc("0 8 * * *", func() {
    generateDailyReport() // Blocking, no retry, no monitoring
})
```

**Solusi:**
```go
// ✅ AMAN: Cron hanya enqueue task, worker yang execute
cron.AddFunc("0 8 * * *", func() {
    taskClient.EnqueueDailyReport(time.Now())
})
// Benefits: async, retry, monitoring, queue priority
```

---

### 2. **Tidak handle error saat enqueue**
**Masalah:**
```go
// ❌ BAHAYA: Ignore error, user tidak tahu email tidak akan terkirim
taskClient.EnqueueEmailWelcome(email, name) // Ignore error
return "User created"
```

**Solusi:**
```go
// ✅ AMAN: Log error tapi jangan fail main operation
if err := taskClient.EnqueueEmailWelcome(email, name); err != nil {
    log.Printf("Failed to enqueue welcome email: %v", err)
    // Optionally: retry, save to database queue, atau notify admin
}
return "User created successfully"
```

---

### 3. **Blocking HTTP response dengan synchronous operation**
**Masalah:**
```go
// ❌ LAMBAT: Generate report langsung (block 10 detik)
func GenerateReport(c *fiber.Ctx) error {
    report := generateReport() // Takes 10 seconds
    sendEmail(report)           // Another 5 seconds
    return c.JSON(report)       // User waits 15 seconds!
}
```

**Solusi:**
```go
// ✅ CEPAT: Enqueue task, return immediately
func GenerateReport(c *fiber.Ctx) error {
    taskClient.EnqueueDailyReport(time.Now())
    return c.JSON(fiber.Map{
        "message": "Report generation started. You'll receive an email when ready.",
    })
    // Response dalam milliseconds, task execute di background
}
```

---

### 4. **Tidak set timeout untuk task**
**Masalah:**
```go
// ❌ BAHAYA: Task bisa hang forever
taskClient.enqueueTask(taskType, payload)
// Jika external API down, task stuck indefinitely
```

**Solusi:**
```go
// ✅ AMAN: Set timeout
taskClient.enqueueTask(taskType, payload,
    asynq.Timeout(30*time.Second),
    asynq.MaxRetry(3),
)
// Task akan di-kill setelah 30 detik
```

---

### 5. **Tidak graceful shutdown**
**Masalah:**
```go
// ❌ BAHAYA: Kill worker, task di tengah jalan hilang
func main() {
    srv.Run(mux)
}
// Ctrl+C → task yang sedang berjalan terminated
```

**Solusi:**
```go
// ✅ AMAN: Graceful shutdown
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
<-quit

log.Println("Shutting down gracefully...")
srv.Shutdown() // Wait for tasks to finish (with timeout)
```

---

### 6. **Semua task di satu queue dengan priority sama**
**Masalah:**
```go
// ❌ BAHAYA: Email penting menunggu report yang lambat
Queues: map[string]int{
    "default": 10, // Everything in one queue
}
// Email critical delay karena antri di belakang report generation
```

**Solusi:**
```go
// ✅ AMAN: Multiple queues dengan priority
Queues: map[string]int{
    "critical": 6, // Emails, webhooks (60% workers)
    "default":  3, // Normal tasks (30% workers)
    "low":      1, // Reports, cleanup (10% workers)
}

// Enqueue ke queue sesuai priority
taskClient.enqueueTask(taskType, payload, 
    asynq.Queue("critical"), // High priority
)
```

---

### 7. **Payload tidak bisa di-serialize**
**Masalah:**
```go
// ❌ ERROR: Channels, functions tidak bisa di-marshal
type Payload struct {
    Data chan string // Cannot be marshaled!
}
```

**Solusi:**
```go
// ✅ AMAN: Hanya primitive types dan structs
type Payload struct {
    UserID string
    Email  string
    Data   map[string]interface{}
}
// JSON-serializable types only
```

---

### 8. **Lupa check context cancellation dalam task**
**Masalah:**
```go
// ❌ BAHAYA: Task tetap jalan walaupun timeout
func HandleTask(ctx context.Context, t *asynq.Task) error {
    for i := 0; i < 1000; i++ {
        processItem(i) // Ignore context
    }
}
```

**Solusi:**
```go
// ✅ AMAN: Check context cancellation
func HandleTask(ctx context.Context, t *asynq.Task) error {
    for i := 0; i < 1000; i++ {
        select {
        case <-ctx.Done():
            return ctx.Err() // Stop immediately on timeout
        default:
            processItem(i)
        }
    }
}
```

---

## 10 Ide Pengembangan

### 1. **Dead Letter Queue untuk task yang selalu gagal**
```go
// Task yang failed setelah max retry → pindah ke DLQ
mux.HandleFunc(tasks.TypeEmailWelcome, func(ctx context.Context, t *asynq.Task) error {
    err := handleEmailWelcome(ctx, t)
    
    if err != nil && t.Retried() >= t.MaxRetry() {
        // Move to dead letter queue
        saveToDeadLetterQueue(t)
        return nil // Mark as successful to prevent further retry
    }
    
    return err
})
```

---

### 2. **Task progress tracking**
```go
func HandleLongTask(ctx context.Context, t *asynq.Task) error {
    total := 100
    
    for i := 0; i < total; i++ {
        // Update progress in Redis
        progress := (i + 1) * 100 / total
        cache.Set(ctx, "task:"+t.ID()+":progress", progress, 1*time.Hour)
        
        processItem(i)
    }
    
    return nil
}

// API endpoint to check progress
app.Get("/tasks/:id/progress", func(c *fiber.Ctx) error {
    id := c.Params("id")
    progress := cache.Get(ctx, "task:"+id+":progress")
    return c.JSON(fiber.Map{"progress": progress})
})
```

---

### 3. **Task dependency chain**
```go
// Task 2 hanya jalan setelah Task 1 selesai
func HandleTask1(ctx context.Context, t *asynq.Task) error {
    // Do work
    result := processData()
    
    // Enqueue dependent task
    taskClient.EnqueueTask2(result)
    
    return nil
}
```

---

### 4. **Periodic tasks dengan dynamic schedule**
```go
// User bisa custom schedule via API
type UserSchedule struct {
    UserID   string
    CronExpr string
    TaskType string
}

func UpdateUserSchedule(userID, cronExpr string) error {
    // Save to database
    db.Save(&UserSchedule{UserID: userID, CronExpr: cronExpr})
    
    // Add to cron dynamically
    entryID, err := scheduler.cron.AddFunc(cronExpr, func() {
        taskClient.EnqueueUserTask(userID)
    })
    
    return err
}
```

---

### 5. **Task result persistence**
```go
func HandleTask(ctx context.Context, t *asynq.Task) error {
    result := processData()
    
    // Save result to database
    db.Create(&TaskResult{
        TaskID:    t.ID(),
        Result:    result,
        Status:    "completed",
        CreatedAt: time.Now(),
    })
    
    return nil
}

// API to fetch result
app.Get("/tasks/:id/result", func(c *fiber.Ctx) error {
    var result TaskResult
    db.Where("task_id = ?", c.Params("id")).First(&result)
    return c.JSON(result)
})
```

---

### 6. **Batch processing**
```go
// Accumulate tasks and process in batch
var batchQueue []Task
var mu sync.Mutex

func AccumulateTask(task Task) {
    mu.Lock()
    batchQueue = append(batchQueue, task)
    mu.Unlock()
}

// Cron job to process batch every 5 minutes
scheduler.cron.AddFunc("*/5 * * * *", func() {
    mu.Lock()
    batch := batchQueue
    batchQueue = []Task{}
    mu.Unlock()
    
    if len(batch) > 0 {
        taskClient.EnqueueBatchProcess(batch)
    }
})
```

---

### 7. **Task scheduling UI**
```go
// Admin endpoint to schedule one-time task
app.Post("/admin/schedule", func(c *fiber.Ctx) error {
    type Request struct {
        TaskType  string
        Payload   map[string]interface{}
        RunAt     time.Time
    }
    
    var req Request
    c.BodyParser(&req)
    
    // Schedule task
    taskClient.enqueueTask(req.TaskType, req.Payload,
        asynq.ProcessAt(req.RunAt),
    )
    
    return c.JSON(fiber.Map{"message": "Task scheduled"})
})
```

---

### 8. **Task cancellation**
```go
// Cancel scheduled task
func CancelTask(taskID string) error {
    inspector := asynq.NewInspector(asynq.RedisClientOpt{
        Addr: redisAddr,
    })
    
    return inspector.DeleteTask("default", taskID)
}

// API endpoint
app.Delete("/tasks/:id", func(c *fiber.Ctx) error {
    if err := CancelTask(c.Params("id")); err != nil {
        return err
    }
    return c.JSON(fiber.Map{"message": "Task cancelled"})
})
```

---

### 9. **Priority boost for stuck tasks**
```go
// Monitor queue, boost priority untuk task yang stuck
func MonitorQueue() {
    ticker := time.NewTicker(1 * time.Minute)
    
    for range ticker.C {
        inspector := asynq.NewInspector(redisOpt)
        
        // Get pending tasks
        tasks := inspector.ListPendingTasks("default")
        
        for _, task := range tasks {
            // If task pending > 10 minutes, move to critical queue
            if time.Since(task.EnqueuedAt) > 10*time.Minute {
                inspector.DeleteTask("default", task.ID)
                taskClient.enqueueTask(task.Type, task.Payload,
                    asynq.Queue("critical"),
                )
            }
        }
    }
}
```

---

### 10. **Webhook retry with exponential backoff notification**
```go
func HandleWebhook(ctx context.Context, t *asynq.Task) error {
    err := sendWebhook(ctx, t)
    
    if err != nil {
        retryCount := t.Retried()
        
        // Notify admin after 3 failed retries
        if retryCount == 3 {
            notifyAdmin("Webhook failing", t.Payload())
        }
        
        // Give up after 5 retries
        if retryCount >= 5 {
            logToDeadLetterQueue(t)
            return nil // Stop retrying
        }
    }
    
    return err
}
```

---

## Kesimpulan

**Background Jobs + Scheduler** adalah essential untuk production app. Key points:

1. **Asynq**: Redis-based task queue dengan retry & monitoring
2. **Cron**: Schedule tasks di waktu tertentu
3. **Pattern**: Cron → Enqueue Task (bukan langsung execute)
4. **Queue Priority**: critical, default, low
5. **Graceful Shutdown**: Wait for tasks to complete

**Production Checklist:**
- ✅ Enqueue long-running tasks (jangan block HTTP response)
- ✅ Set timeout untuk semua tasks
- ✅ Gunakan multiple queues untuk priority
- ✅ Implement graceful shutdown
- ✅ Monitor tasks via Asynqmon
- ✅ Handle task failures dengan retry
- ✅ Log task execution untuk debugging
- ✅ Use cron → asynq pattern (bukan cron execute langsung)

**Commands:**
```bash
# Start all services
make docker-up
make worker  # Terminal 1
make api     # Terminal 2

# Monitor
open http://localhost:8080

# Test
curl -X POST http://localhost:3000/api/users/register \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'
```

Happy tasking! 🚀
