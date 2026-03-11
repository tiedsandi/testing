# 🐳 Docker + Deploy VPS + CI/CD Dasar untuk Go

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Build Docker image untuk Go dengan multi-stage build
- Optimize Docker image size (dari 800MB ke 20MB!)
- Setup docker-compose untuk development
- Deploy Go app ke VPS Linux
- Setup Nginx sebagai reverse proxy
- Install SSL certificate dengan Let's Encrypt
- Implement graceful shutdown di Go
- Setup CI/CD dengan GitHub Actions
- Auto-deploy ke VPS dari GitHub push
- Monitor dan maintain production server

## 💡 Konsep + Analogi

### Multi-Stage Docker Build

**❌ Single Stage (Bad):**
```dockerfile
FROM golang:1.21
WORKDIR /app
COPY . .
RUN go build -o main .
CMD ["./main"]
```
**Problem:** Image size ~800MB (includes Go compiler, tools, source code)

**✅ Multi-Stage (Good):**
```dockerfile
# Stage 1: Build
FROM golang:1.21 AS builder
COPY . .
RUN go build -o main .

# Stage 2: Runtime
FROM alpine:3.18
COPY --from=builder /app/main .
CMD ["./main"]
```
**Benefit:** Image size ~20MB (only binary + minimal OS)

**Analogi Frontend:**
```
Single Stage = Build React app dengan node_modules masih ada
Multi-Stage = Build React → cuma ambil /build folder → serve dengan nginx
```

### Image Size Comparison

| Base Image | Size | Security | Use Case |
|------------|------|----------|----------|
| `golang:1.21` | ~800MB | Medium | Development only |
| `alpine:3.18` | ~20MB | Good | Production (needs libc) |
| `distroless/static` | ~10MB | Excellent | Production (static binary) |
| `scratch` | ~5MB | Best | Production (minimal) |

### Deployment Flow

```
┌─────────────────────────────────────────────────┐
│              GitHub Push                        │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│         GitHub Actions (CI/CD)                  │
│  1. Run tests                                   │
│  2. Build Docker image                          │
│  3. Push to registry                            │
│  4. SSH to VPS                                  │
│  5. Pull new image                              │
│  6. Restart container                           │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│              VPS Server                         │
│                                                 │
│  Internet → Nginx → Go App → PostgreSQL        │
│              ↓                                  │
│            SSL (Let's Encrypt)                  │
└─────────────────────────────────────────────────┘
```

## 📝 Materi + Kode Lengkap

### 1. Dockerfile Multi-Stage Build

```dockerfile
# Dockerfile

# ================================
# Stage 1: Builder
# ================================
FROM golang:1.21-alpine AS builder

# Install dependencies untuk build
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build arguments untuk version info
ARG VERSION=dev
ARG BUILD_TIME
ARG GIT_COMMIT

# Build binary dengan optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}" \
    -o /app/bin/api \
    ./cmd/api

# ================================
# Stage 2: Runtime (Distroless)
# ================================
FROM gcr.io/distroless/static:nonroot

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy CA certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=builder /app/bin/api /api

# Copy static files if needed
# COPY --from=builder /app/static /static

# Expose port
EXPOSE 3000

# Use non-root user (already set in distroless:nonroot)
# USER 65532:65532

# Run binary
ENTRYPOINT ["/api"]
```

```dockerfile
# Dockerfile.alpine (Alternative dengan Alpine)

FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
ARG BUILD_TIME
ARG GIT_COMMIT

RUN CGO_ENABLED=0 go build \
    -ldflags="-w -s -X main.Version=${VERSION}" \
    -o /app/bin/api \
    ./cmd/api

# ================================
# Runtime with Alpine
# ================================
FROM alpine:3.18

# Install ca-certificates untuk HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

# Copy binary
COPY --from=builder /app/bin/api .

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["./api"]
```

### 2. .dockerignore

```bash
# .dockerignore

# Git
.git
.gitignore

# CI/CD
.github
.gitlab-ci.yml

# Documentation
*.md
README.md
docs/

# Build artifacts
bin/
tmp/
*.exe
*.test
*.out

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Environment files
.env
.env.*
!.env.example

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Node (if exists)
node_modules/
npm-debug.log

# Vendor (if using)
vendor/

# Test files
*_test.go
testdata/

# Coverage
coverage.*
*.cover

# Logs
*.log
logs/
```

### 3. docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Go Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VERSION: ${VERSION:-dev}
        BUILD_TIME: ${BUILD_TIME}
        GIT_COMMIT: ${GIT_COMMIT}
    container_name: go-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - APP_ENV=${APP_ENV:-development}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  # Asynq Worker (Background Jobs)
  asynq-worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: asynq-worker
    restart: unless-stopped
    environment:
      - APP_ENV=${APP_ENV:-development}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    networks:
      - app-network
    command: ["/api", "worker"]  # Run worker command

  # Nginx (Optional - for local testing)
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
```

```yaml
# docker-compose.prod.yml (Production override)
version: '3.8'

services:
  app:
    image: your-registry/go-api:${VERSION:-latest}
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - APP_ENV=production
    ports:
      - "127.0.0.1:3000:3000"  # Only accessible from localhost
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    volumes:
      - /var/lib/postgresql/data:/var/lib/postgresql/data  # Persistent volume
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# .env.example
APP_ENV=development
VERSION=1.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
JWT_SECRET=your-secret-key-change-this
```

### 4. Graceful Shutdown di Go

```go
// cmd/api/main.go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

var (
    Version   string = "dev"
    BuildTime string = "unknown"
    GitCommit string = "unknown"
)

func main() {
    // Print build info
    log.Printf("Starting API version=%s build=%s commit=%s", Version, BuildTime, GitCommit)

    // Setup database
    db, err := setupDatabase()
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Setup Gin router
    r := gin.Default()

    // Health check endpoint
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status":  "ok",
            "version": Version,
        })
    })

    // Other routes
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "Hello World"})
    })

    // Create HTTP server
    srv := &http.Server{
        Addr:    ":3000",
        Handler: r,
    }

    // Channel to listen for errors from server
    serverErrors := make(chan error, 1)

    // Start server in goroutine
    go func() {
        log.Println("Server starting on :3000")
        serverErrors <- srv.ListenAndServe()
    }()

    // Channel to listen for interrupt signal
    shutdown := make(chan os.Signal, 1)
    signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

    // Block until we receive a signal or server error
    select {
    case err := <-serverErrors:
        log.Fatalf("Server error: %v", err)

    case sig := <-shutdown:
        log.Printf("Received signal: %v. Starting graceful shutdown...", sig)

        // Create context with timeout for shutdown
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        // Shutdown HTTP server
        if err := srv.Shutdown(ctx); err != nil {
            log.Printf("Error during server shutdown: %v", err)
            srv.Close()
        }

        // Close database connections
        sqlDB, err := db.DB()
        if err == nil {
            log.Println("Closing database connections...")
            sqlDB.Close()
        }

        log.Println("Graceful shutdown completed")
    }
}

func setupDatabase() (*gorm.DB, error) {
    // Database setup code
    return nil, nil
}
```

```go
// cmd/api/worker.go (Asynq worker with graceful shutdown)
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/hibiken/asynq"
)

func runWorker() {
    // Create Redis connection
    redisOpt := asynq.RedisClientOpt{
        Addr: os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT"),
    }

    // Create server
    srv := asynq.NewServer(
        redisOpt,
        asynq.Config{
            Concurrency: 10,
            Queues: map[string]int{
                "critical": 6,
                "default":  3,
                "low":      1,
            },
        },
    )

    // Register handlers
    mux := asynq.NewServeMux()
    mux.HandleFunc("email:send", handleSendEmail)
    mux.HandleFunc("report:generate", handleGenerateReport)

    // Start server in goroutine
    go func() {
        log.Println("Asynq worker starting...")
        if err := srv.Run(mux); err != nil {
            log.Fatalf("Worker error: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit

    log.Println("Worker shutting down gracefully...")
    srv.Shutdown()
    log.Println("Worker stopped")
}

func handleSendEmail(ctx context.Context, task *asynq.Task) error {
    // Handle task
    log.Printf("Sending email: %s", task.Payload())
    return nil
}

func handleGenerateReport(ctx context.Context, task *asynq.Task) error {
    // Handle task
    log.Printf("Generating report: %s", task.Payload())
    return nil
}
```

### 5. Systemd Service untuk Production

```ini
# /etc/systemd/system/go-api.service

[Unit]
Description=Go API Service
After=network.target postgresql.service

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/home/appuser/app

# Environment
Environment="APP_ENV=production"
EnvironmentFile=/home/appuser/app/.env

# Binary location
ExecStart=/home/appuser/app/bin/api

# Restart policy
Restart=always
RestartSec=5s

# Graceful shutdown
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=go-api

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/appuser/app/logs

[Install]
WantedBy=multi-user.target
```

```bash
# Commands untuk manage service

# Enable service (start on boot)
sudo systemctl enable go-api

# Start service
sudo systemctl start go-api

# Stop service
sudo systemctl stop go-api

# Restart service
sudo systemctl restart go-api

# Check status
sudo systemctl status go-api

# View logs
sudo journalctl -u go-api -f

# View last 100 lines
sudo journalctl -u go-api -n 100
```

### 6. Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/api.yourdomain.com

upstream go_api {
    server localhost:3000;
    keepalive 32;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Client max body size
    client_max_body_size 10M;

    # Proxy settings
    location / {
        proxy_pass http://go_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://go_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Health check endpoint (no logging)
    location /health {
        proxy_pass http://go_api;
        access_log off;
    }

    # Static files (if any)
    location /static/ {
        alias /home/appuser/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Access log
    access_log /var/log/nginx/api.yourdomain.com.access.log;
    error_log /var/log/nginx/api.yourdomain.com.error.log;
}
```

```bash
# Setup Nginx

# Install Nginx
sudo apt update
sudo apt install nginx

# Create symlink
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable on boot
sudo systemctl enable nginx
```

### 7. SSL dengan Let's Encrypt

```bash
# install-ssl.sh

#!/bin/bash

DOMAIN="api.yourdomain.com"
EMAIL="your-email@example.com"

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Auto-renewal (already setup by certbot)
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal (if not exists)
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo "SSL certificate installed successfully!"
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
```

```bash
# Manual renewal (if needed)
sudo certbot renew
sudo systemctl reload nginx
```

### 8. GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml

name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-

      - name: Run tests
        run: |
          go test -v -race -coverprofile=coverage.out ./...
          go tool cover -html=coverage.out -o coverage.html

      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage.html

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ github.ref_name }}
            BUILD_TIME=${{ github.event.head_commit.timestamp }}
            GIT_COMMIT=${{ github.sha }}

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.yourdomain.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd /home/appuser/app
            
            # Pull latest code
            git pull origin main
            
            # Login to registry
            echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            
            # Pull new image
            docker-compose pull app
            
            # Restart services
            docker-compose up -d app
            
            # Clean up old images
            docker image prune -f
            
            # Check health
            sleep 10
            curl -f http://localhost:3000/health || exit 1
            
            echo "Deployment successful!"
```

```yaml
# .github/workflows/deploy-binary.yml (Deploy binary tanpa Docker)

name: Deploy Binary

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    name: Build and Deploy Binary
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Build binary
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
            -ldflags="-w -s -X main.Version=${{ github.ref_name }}" \
            -o api \
            ./cmd/api

      - name: Deploy to VPS
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          source: "api"
          target: "/home/appuser/app/bin/"

      - name: Restart service
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            sudo systemctl restart go-api
            sleep 5
            sudo systemctl status go-api
            curl -f http://localhost:3000/health || exit 1
```

### 9. Deploy Script

```bash
# scripts/deploy.sh

#!/bin/bash

set -e  # Exit on error

APP_NAME="go-api"
APP_DIR="/home/appuser/app"
REGISTRY="ghcr.io/yourusername"
IMAGE_NAME="$REGISTRY/$APP_NAME"
VERSION=${1:-latest}

echo "======================================"
echo "Deploying $APP_NAME version $VERSION"
echo "======================================"

# Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main

# Update .env if needed
if [ -f .env.production ]; then
    cp .env.production .env
fi

# Login to registry (if using private registry)
# echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull latest image
echo "Pulling Docker image..."
docker pull $IMAGE_NAME:$VERSION

# Stop old container
echo "Stopping old container..."
docker-compose down

# Start new container
echo "Starting new container..."
docker-compose up -d

# Wait for health check
echo "Waiting for service to be healthy..."
sleep 10

# Check health
if curl -f http://localhost:3000/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    echo "Rolling back..."
    docker-compose down
    docker-compose up -d
    exit 1
fi

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

echo "======================================"
echo "Deployment completed successfully!"
echo "======================================"
```

```bash
# scripts/setup-vps.sh (Initial VPS setup)

#!/bin/bash

set -e

# Update system
echo "Updating system..."
sudo apt update
sudo apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
sudo apt install -y \
    git \
    curl \
    wget \
    build-essential \
    ufw \
    fail2ban

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Setup firewall
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create app user
echo "Creating app user..."
sudo useradd -m -s /bin/bash appuser
sudo mkdir -p /home/appuser/app
sudo chown -R appuser:appuser /home/appuser/app

# Setup swap (optional, for low-memory VPS)
if [ $(swapon --show | wc -l) -eq 0 ]; then
    echo "Creating swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "======================================"
echo "VPS setup completed!"
echo "Next steps:"
echo "1. Setup SSH key authentication"
echo "2. Clone your repository"
echo "3. Configure environment variables"
echo "4. Setup SSL with Let's Encrypt"
echo "======================================"
```

### 10. Makefile untuk Development

```makefile
# Makefile

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## Build the application
	go build -o bin/api cmd/api/main.go

.PHONY: run
run: ## Run the application
	go run cmd/api/main.go

.PHONY: test
test: ## Run tests
	go test -v -race ./...

.PHONY: test-cover
test-cover: ## Run tests with coverage
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t go-api:latest .

.PHONY: docker-run
docker-run: ## Run Docker container
	docker run -p 3000:3000 --env-file .env go-api:latest

.PHONY: compose-up
compose-up: ## Start docker-compose services
	docker-compose up -d

.PHONY: compose-down
compose-down: ## Stop docker-compose services
	docker-compose down

.PHONY: compose-logs
compose-logs: ## View docker-compose logs
	docker-compose logs -f

.PHONY: migrate-up
migrate-up: ## Run database migrations
	migrate -path migrations -database "postgresql://user:pass@localhost:5432/db?sslmode=disable" up

.PHONY: migrate-down
migrate-down: ## Rollback database migrations
	migrate -path migrations -database "postgresql://user:pass@localhost:5432/db?sslmode=disable" down

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html

.PHONY: lint
lint: ## Run linter
	golangci-lint run ./...
```

---

## 🔍 Monitoring & Logging

### 1. Health Check Endpoint

```go
// internal/handler/health_handler.go
package handler

import (
    "database/sql"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type HealthHandler struct {
    db *gorm.DB
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
    return &HealthHandler{db: db}
}

type HealthResponse struct {
    Status    string                 `json:"status"`
    Version   string                 `json:"version"`
    Timestamp time.Time              `json:"timestamp"`
    Checks    map[string]HealthCheck `json:"checks"`
}

type HealthCheck struct {
    Status  string `json:"status"`
    Message string `json:"message,omitempty"`
}

func (h *HealthHandler) Check(c *gin.Context) {
    response := HealthResponse{
        Status:    "ok",
        Version:   Version,
        Timestamp: time.Now(),
        Checks:    make(map[string]HealthCheck),
    }

    // Check database
    sqlDB, err := h.db.DB()
    if err != nil {
        response.Checks["database"] = HealthCheck{
            Status:  "error",
            Message: err.Error(),
        }
        response.Status = "error"
    } else {
        if err := sqlDB.Ping(); err != nil {
            response.Checks["database"] = HealthCheck{
                Status:  "error",
                Message: err.Error(),
            }
            response.Status = "error"
        } else {
            stats := sqlDB.Stats()
            response.Checks["database"] = HealthCheck{
                Status:  "ok",
                Message: "Connected",
            }
        }
    }

    // Return appropriate status code
    statusCode := 200
    if response.Status == "error" {
        statusCode = 503
    }

    c.JSON(statusCode, response)
}

// Readiness check (Kubernetes-style)
func (h *HealthHandler) Ready(c *gin.Context) {
    sqlDB, _ := h.db.DB()
    if err := sqlDB.Ping(); err != nil {
        c.JSON(503, gin.H{"status": "not ready"})
        return
    }
    c.JSON(200, gin.H{"status": "ready"})
}

// Liveness check (Kubernetes-style)
func (h *HealthHandler) Live(c *gin.Context) {
    c.JSON(200, gin.H{"status": "alive"})
}
```

### 2. Structured Logging

```go
// pkg/logger/logger.go
package logger

import (
    "os"
    "time"

    "github.com/sirupsen/logrus"
)

var Log *logrus.Logger

func init() {
    Log = logrus.New()

    // Set output
    Log.SetOutput(os.Stdout)

    // Set format
    if os.Getenv("APP_ENV") == "production" {
        Log.SetFormatter(&logrus.JSONFormatter{
            TimestampFormat: time.RFC3339,
        })
    } else {
        Log.SetFormatter(&logrus.TextFormatter{
            FullTimestamp:   true,
            TimestampFormat: "2006-01-02 15:04:05",
        })
    }

    // Set level
    level := os.Getenv("LOG_LEVEL")
    switch level {
    case "debug":
        Log.SetLevel(logrus.DebugLevel)
    case "info":
        Log.SetLevel(logrus.InfoLevel)
    case "warn":
        Log.SetLevel(logrus.WarnLevel)
    case "error":
        Log.SetLevel(logrus.ErrorLevel)
    default:
        Log.SetLevel(logrus.InfoLevel)
    }
}

// Helper functions
func Info(args ...interface{}) {
    Log.Info(args...)
}

func Error(args ...interface{}) {
    Log.Error(args...)
}

func Debug(args ...interface{}) {
    Log.Debug(args...)
}

func WithFields(fields map[string]interface{}) *logrus.Entry {
    return Log.WithFields(fields)
}
```

```go
// Middleware logging
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        raw := c.Request.URL.RawQuery

        // Process request
        c.Next()

        // Log after request
        duration := time.Since(start)
        statusCode := c.Writer.Status()

        fields := map[string]interface{}{
            "method":      c.Request.Method,
            "path":        path,
            "query":       raw,
            "status_code": statusCode,
            "duration_ms": duration.Milliseconds(),
            "client_ip":   c.ClientIP(),
            "user_agent":  c.Request.UserAgent(),
        }

        if len(c.Errors) > 0 {
            fields["errors"] = c.Errors.String()
            logger.WithFields(fields).Error("Request completed with errors")
        } else if statusCode >= 500 {
            logger.WithFields(fields).Error("Request failed")
        } else if statusCode >= 400 {
            logger.WithFields(fields).Warn("Request completed with client error")
        } else {
            logger.WithFields(fields).Info("Request completed")
        }
    }
}
```

### 3. Prometheus Metrics (Optional)

```go
// pkg/metrics/metrics.go
package metrics

import (
    "github.com/gin-gonic/gin"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
}

func PrometheusHandler() gin.HandlerFunc {
    h := promhttp.Handler()
    return func(c *gin.Context) {
        h.ServeHTTP(c.Writer, c.Request)
    }
}

func MetricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        timer := prometheus.NewTimer(httpRequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
        ))
        c.Next()
        timer.ObserveDuration()

        httpRequestsTotal.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            string(c.Writer.Status()),
        ).Inc()
    }
}
```

---

## ⚠️ Kesalahan Umum

### 1. Hardcode Environment Variables

❌ **Salah:**
```go
dsn := "user=postgres password=postgres123 dbname=myapp"
```

✅ **Benar:**
```go
dsn := fmt.Sprintf("user=%s password=%s dbname=%s",
    os.Getenv("DB_USER"),
    os.Getenv("DB_PASSWORD"),
    os.Getenv("DB_NAME"),
)
```

### 2. Tidak Handle Graceful Shutdown

❌ **Salah:**
```go
r.Run(":3000")  // Langsung kill saat SIGTERM
```

✅ **Benar:**
```go
srv := &http.Server{Addr: ":3000", Handler: r}
go srv.ListenAndServe()

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
srv.Shutdown(ctx)
```

### 3. Image Docker Terlalu Besar

❌ **Salah:**
```dockerfile
FROM golang:1.21
COPY . .
RUN go build -o app
CMD ["./app"]
# Result: ~800MB
```

✅ **Benar:**
```dockerfile
FROM golang:1.21 AS builder
COPY . .
RUN go build -o app

FROM gcr.io/distroless/static
COPY --from=builder /app/app /
CMD ["/app"]
# Result: ~10MB
```

### 4. Tidak Set Resource Limits

❌ **Salah:**
```yaml
services:
  app:
    image: myapp
    # No limits
```

✅ **Benar:**
```yaml
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 5. Expose Database Port ke Public

❌ **Salah:**
```yaml
postgres:
  ports:
    - "5432:5432"  # Accessible from outside
```

✅ **Benar:**
```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Only localhost
  # Or don't expose at all if only Docker containers need it
```

### 6. Tidak Ada Health Check

❌ **Salah:**
```yaml
app:
  image: myapp
  # No health check
```

✅ **Benar:**
```yaml
app:
  image: myapp
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 7. Run as Root di Container

❌ **Salah:**
```dockerfile
FROM alpine
COPY app /app
CMD ["/app"]
# Runs as root
```

✅ **Benar:**
```dockerfile
FROM alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --chown=appuser:appgroup app /app
CMD ["/app"]
```

### 8. Tidak Handle Database Connection Pooling

❌ **Salah:**
```go
db, _ := gorm.Open(postgres.Open(dsn))
// Use defaults
```

✅ **Benar:**
```go
db, _ := gorm.Open(postgres.Open(dsn))
sqlDB, _ := db.DB()
sqlDB.SetMaxOpenConns(25)
sqlDB.SetMaxIdleConns(5)
sqlDB.SetConnMaxLifetime(5 * time.Minute)
```

---

## ✅ Checklist Deployment

### Pre-Deployment

- [ ] **Environment Variables**
  - [ ] Semua env var sudah di `.env` file
  - [ ] Tidak ada credentials di code
  - [ ] Sudah ada `.env.example` untuk dokumentasi

- [ ] **Database**
  - [ ] Migration script ready
  - [ ] Backup database production (jika update)
  - [ ] Connection pooling configured

- [ ] **Docker**
  - [ ] Multi-stage build untuk size optimization
  - [ ] `.dockerignore` configured
  - [ ] Health check endpoint ready
  - [ ] Graceful shutdown implemented

- [ ] **Security**
  - [ ] HTTPS/SSL configured
  - [ ] Firewall rules set
  - [ ] Database tidak exposed ke public
  - [ ] Security headers di Nginx

- [ ] **Monitoring**
  - [ ] Health check endpoint working
  - [ ] Logging configured (stdout/file)
  - [ ] Error tracking (optional: Sentry)

### Deployment

- [ ] **Build**
  - [ ] Tests passing
  - [ ] Docker image built successfully
  - [ ] Image pushed to registry

- [ ] **Deploy**
  - [ ] Pull latest code/image
  - [ ] Stop old service
  - [ ] Start new service
  - [ ] Health check passed

- [ ] **Verify**
  - [ ] Application accessible
  - [ ] Database connected
  - [ ] API endpoints working
  - [ ] SSL certificate valid

### Post-Deployment

- [ ] **Monitoring**
  - [ ] Check logs for errors
  - [ ] Monitor resource usage (CPU, RAM)
  - [ ] Check response times

- [ ] **Rollback Plan**
  - [ ] Know how to rollback
  - [ ] Keep previous version ready
  - [ ] Database backup available

---

## 💡 Best Practices

### 1. 12-Factor App Principles

```go
// ✅ Config in environment
dbHost := os.Getenv("DB_HOST")

// ✅ Stateless (no session in memory, use Redis/DB)
// ✅ Logs to stdout
log.Println("Server starting...")

// ✅ Disposability (fast startup, graceful shutdown)
```

### 2. Security Headers

```nginx
# Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### 3. Database Connection Pooling

```go
sqlDB, _ := db.DB()

// Max open connections
sqlDB.SetMaxOpenConns(25)

// Max idle connections
sqlDB.SetMaxIdleConns(5)

// Connection lifetime
sqlDB.SetConnMaxLifetime(5 * time.Minute)

// Connection max idle time
sqlDB.SetConnMaxIdleTime(10 * time.Minute)
```

### 4. Structured Logging

```go
// Use structured logging
logger.WithFields(map[string]interface{}{
    "user_id": userID,
    "action":  "login",
    "ip":      clientIP,
}).Info("User logged in")

// Better than:
log.Printf("User %d logged in from %s", userID, clientIP)
```

### 5. Version Your APIs

```go
v1 := r.Group("/api/v1")
{
    v1.GET("/users", handler.GetUsers)
}

v2 := r.Group("/api/v2")
{
    v2.GET("/users", handler.GetUsersV2)  // New version
}
```

### 6. Use Build Tags

```bash
# Production build
go build -tags=production -ldflags="-w -s" -o app

# Development build
go build -tags=development -o app
```

```go
// config_prod.go
// +build production

package config

const Debug = false
```

```go
// config_dev.go
// +build development

package config

const Debug = true
```

---

## 🚀 Ide Pengembangan Selanjutnya

### 1. **Blue-Green Deployment**
Deploy 2 versi sekaligus, switch traffic setelah yakin tidak ada error.

```bash
# Deploy v2 ke port berbeda
docker run -p 3001:3000 myapp:v2

# Test v2
curl http://localhost:3001/health

# Switch Nginx upstream dari 3000 ke 3001
# Rollback jika ada masalah
```

### 2. **Auto-Scaling dengan Kubernetes**
Scale otomatis based on CPU/memory usage.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: go-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: go-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 3. **Database Replication**
Read dari replica, write ke primary.

```go
// Primary DB (write)
dbPrimary, _ := gorm.Open(postgres.Open(dsnPrimary))

// Replica DB (read)
dbReplica, _ := gorm.Open(postgres.Open(dsnReplica))

// Use primary for writes
dbPrimary.Create(&user)

// Use replica for reads
dbReplica.Find(&users)
```

### 4. **Distributed Tracing**
Track request across multiple services (OpenTelemetry, Jaeger).

```go
import "go.opentelemetry.io/otel"

tracer := otel.Tracer("my-service")
ctx, span := tracer.Start(c.Request.Context(), "GetUser")
defer span.End()

// Use ctx in downstream calls
```

### 5. **Feature Flags**
Enable/disable feature tanpa deploy ulang.

```go
if featureFlags.IsEnabled("new-payment-flow") {
    return newPaymentHandler(c)
}
return oldPaymentHandler(c)
```

### 6. **Rate Limiting dengan Redis**
Protect API dari abuse.

```go
// Check rate limit
key := fmt.Sprintf("rate:%s", clientIP)
count, _ := redisClient.Incr(ctx, key).Result()

if count == 1 {
    redisClient.Expire(ctx, key, time.Minute)
}

if count > 100 {
    c.JSON(429, gin.H{"error": "Too many requests"})
    return
}
```

### 7. **Database Migration dengan Versioning**
Track database schema changes.

```bash
# Install golang-migrate
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create migration
migrate create -ext sql -dir migrations -seq create_users_table

# Run migration
migrate -path migrations -database "postgresql://..." up

# Rollback
migrate -path migrations -database "postgresql://..." down 1
```

### 8. **Backup Automation**
Auto backup database setiap hari.

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="myapp"

# Backup database
docker exec postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://my-backups/
```

```bash
# Cron job (daily at 2 AM)
0 2 * * * /home/appuser/scripts/backup.sh
```

### 9. **Canary Deployment**
Deploy ke subset user dulu, monitor, baru full rollout.

```nginx
# Nginx - 10% traffic ke v2, 90% ke v1
upstream backend {
    server app-v1:3000 weight=90;
    server app-v2:3000 weight=10;
}
```

### 10. **Multi-Region Deployment**
Deploy ke multiple regions untuk lower latency.

```
          ┌──────────────┐
          │  CloudFlare  │
          │  (DNS/CDN)   │
          └──────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼─────┐     ┌────▼─────┐
   │ Asia VPS │     │  US VPS  │
   │Singapore │     │New York  │
   └──────────┘     └──────────┘
```

---

## 📖 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [The Twelve-Factor App](https://12factor.net/)
- [Go Best Practices](https://github.com/golang-standards/project-layout)

---

## 🎯 Kesimpulan

Deployment Go app tidak seseram yang dibayangkan:

1. **Dockerfile** → Build binary dalam container yang clean
2. **docker-compose.yml** → Orchestrate services (app, db, redis)
3. **Graceful Shutdown** → Handle SIGTERM dengan baik
4. **Systemd** → Auto-restart service di VPS
5. **Nginx** → Reverse proxy + SSL
6. **CI/CD** → Auto-deploy setiap push
7. **Monitoring** → Health checks + logging

**Workflow Production:**
```
Code → Push → GitHub Actions → Test → Build → Deploy → Monitor
```

**Tips:**
- ✅ Start simple (Dockerfile + manual deploy)
- ✅ Gradually add automation (CI/CD)
- ✅ Monitor everything (logs, metrics, errors)
- ✅ Always have rollback plan
- ✅ Test di staging dulu before production

Selamat deploy! 🚀 Proyekmu sekarang bisa diakses dari mana aja dengan domain yang keren dan HTTPS yang secure! 💪
