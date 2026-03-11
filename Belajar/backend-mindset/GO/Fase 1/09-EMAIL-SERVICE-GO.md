# BELAJAR EMAIL SERVICE DI GO

## Penjelasan Konsep

**Email Service** adalah komponen backend yang menangani pengiriman email otomatis seperti welcome email, reset password, notifikasi, dan invoice. Di Go, kita menggunakan library seperti `jordan-wright/email` atau `wneessen/go-simple-mail` untuk mengirim email via SMTP.

**Analogi TypeScript/Next.js:**
```typescript
// TypeScript dengan Nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our app!</h1>',
});
```

**Konsep penting:**
1. **SMTP Configuration**: Host, port, username, password dari email provider
2. **MailHog**: Fake SMTP server untuk development, tangkap email tanpa kirim sungguhan
3. **HTML Template**: Go `html/template` untuk email dinamis
4. **Async Sending**: Kirim email di background dengan channel/queue
5. **Retry Logic**: Cobe kirim ulang jika gagal

---

## Struktur Project

```
email-service-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── domain/
│   │   └── user.go
│   ├── dto/
│   │   └── auth_dto.go
│   ├── repository/
│   │   └── user_repository.go
│   ├── service/
│   │   ├── email_service.go
│   │   ├── auth_service.go
│   │   └── user_service.go
│   ├── handler/
│   │   └── auth_handler.go
│   └── middleware/
│       └── error_handler.go
├── pkg/
│   ├── errors/
│   │   └── app_error.go
│   ├── utils/
│   │   └── email_utils.go
│   └── templates/
│       ├── base.html
│       ├── welcome.html
│       ├── verify_email.html
│       ├── reset_password.html
│       └── invoice.html
├── .env
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/jordan-wright/email
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/joho/godotenv
go get github.com/google/uuid
```

**MailHog untuk Development (Linux):**
```bash
# Download MailHog
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64

# Rename dan buat executable
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
sudo chmod +x /usr/local/bin/mailhog

# Jalankan MailHog
mailhog

# MailHog akan jalan di:
# SMTP: localhost:1025
# Web UI: http://localhost:8025
```

**go.mod:**
```go
module email-service-go

go 1.21

require (
    github.com/gofiber/fiber/v2 v2.50.0
    github.com/jordan-wright/email v4.0.1-0.20210109023952-943e75fe5223+incompatible
    github.com/joho/godotenv v1.5.1
    github.com/google/uuid v1.5.0
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
```

---

## 2. Configuration (.env)

```env
# Server
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=email_service_db

# SMTP (Development dengan MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com

# SMTP (Production - contoh Gmail)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM=noreply@example.com

# App
APP_NAME=MyApp
APP_URL=http://localhost:3000
```

**internal/config/config.go:**
```go
package config

import (
    "fmt"
    "os"
    "strconv"

    "github.com/joho/godotenv"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    SMTP     SMTPConfig
    App      AppConfig
}

type ServerConfig struct {
    Port string
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
}

type SMTPConfig struct {
    Host     string
    Port     int
    Username string
    Password string
    From     string
}

type AppConfig struct {
    Name string
    URL  string
}

func LoadConfig() (*Config, error) {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        return nil, fmt.Errorf("error loading .env file: %w", err)
    }

    smtpPort, err := strconv.Atoi(os.Getenv("SMTP_PORT"))
    if err != nil {
        smtpPort = 1025 // default MailHog port
    }

    return &Config{
        Server: ServerConfig{
            Port: os.Getenv("PORT"),
        },
        Database: DatabaseConfig{
            Host:     os.Getenv("DB_HOST"),
            Port:     os.Getenv("DB_PORT"),
            User:     os.Getenv("DB_USER"),
            Password: os.Getenv("DB_PASSWORD"),
            DBName:   os.Getenv("DB_NAME"),
        },
        SMTP: SMTPConfig{
            Host:     os.Getenv("SMTP_HOST"),
            Port:     smtpPort,
            Username: os.Getenv("SMTP_USERNAME"),
            Password: os.Getenv("SMTP_PASSWORD"),
            From:     os.Getenv("SMTP_FROM"),
        },
        App: AppConfig{
            Name: os.Getenv("APP_NAME"),
            URL:  os.Getenv("APP_URL"),
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

## 3. Domain Models

**internal/domain/user.go:**
```go
package domain

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type User struct {
    ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
    Name              string     `gorm:"not null" json:"name"`
    Email             string     `gorm:"uniqueIndex;not null" json:"email"`
    Password          string     `gorm:"not null" json:"-"`
    IsEmailVerified   bool       `gorm:"default:false" json:"is_email_verified"`
    EmailVerifiedAt   *time.Time `json:"email_verified_at"`
    VerificationToken *string    `gorm:"index" json:"-"`
    ResetToken        *string    `gorm:"index" json:"-"`
    ResetTokenExpiry  *time.Time `json:"-"`
    CreatedAt         time.Time  `json:"created_at"`
    UpdatedAt         time.Time  `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == uuid.Nil {
        u.ID = uuid.New()
    }
    return nil
}
```

---

## 4. DTOs

**internal/dto/auth_dto.go:**
```go
package dto

type RegisterRequest struct {
    Name     string `json:"name" validate:"required,min=3,max=100"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}

type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required"`
}

type ForgotPasswordRequest struct {
    Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
    Token    string `json:"token" validate:"required"`
    Password string `json:"password" validate:"required,min=8"`
}

type VerifyEmailRequest struct {
    Token string `json:"token" validate:"required"`
}

type AuthResponse struct {
    User    UserResponse `json:"user"`
    Message string       `json:"message"`
}

type UserResponse struct {
    ID              string `json:"id"`
    Name            string `json:"name"`
    Email           string `json:"email"`
    IsEmailVerified bool   `json:"is_email_verified"`
}
```

---

## 5. Email Service Interface & Struct

**internal/service/email_service.go:**
```go
package service

import (
    "bytes"
    "fmt"
    "html/template"
    "net/smtp"
    "path/filepath"
    "time"

    "email-service-go/internal/config"

    "github.com/jordan-wright/email"
)

// EmailData adalah struct umum untuk data email
type EmailData struct {
    To          []string
    Subject     string
    Body        string
    Attachments []string // path ke file attachment
}

// EmailTemplateData untuk data dinamis di template
type EmailTemplateData struct {
    AppName     string
    AppURL      string
    UserName    string
    VerifyURL   string
    ResetURL    string
    LoginURL    string
    Year        int
    // Invoice data
    InvoiceNumber string
    InvoiceDate   string
    Items         []InvoiceItem
    Total         float64
}

type InvoiceItem struct {
    Name     string
    Quantity int
    Price    float64
    Subtotal float64
}

// EmailService interface
type EmailService interface {
    SendPlainText(data EmailData) error
    SendHTML(data EmailData) error
    SendWithTemplate(to []string, subject, templateName string, data EmailTemplateData) error
    SendWithAttachment(data EmailData) error
    
    // Specific email types
    SendWelcomeEmail(to, name string) error
    SendVerificationEmail(to, name, token string) error
    SendResetPasswordEmail(to, name, token string) error
    SendNotificationEmail(to, name, message string) error
    SendInvoiceEmail(to, name string, invoiceData EmailTemplateData) error
}

type emailService struct {
    config        config.SMTPConfig
    appConfig     config.AppConfig
    templates     *template.Template
    emailCh       chan func() error
    retryAttempts int
}

func NewEmailService(cfg *config.Config) (EmailService, error) {
    // Parse semua template email
    tmpl, err := parseEmailTemplates()
    if err != nil {
        return nil, fmt.Errorf("failed to parse email templates: %w", err)
    }

    service := &emailService{
        config:        cfg.SMTP,
        appConfig:     cfg.App,
        templates:     tmpl,
        emailCh:       make(chan func() error, 100), // buffer 100 email
        retryAttempts: 3,
    }

    // Start background worker untuk async email
    go service.emailWorker()

    return service, nil
}

// emailWorker adalah goroutine yang process email async
func (s *emailService) emailWorker() {
    for emailFunc := range s.emailCh {
        // Execute email sending dengan retry logic
        var err error
        for attempt := 0; attempt < s.retryAttempts; attempt++ {
            err = emailFunc()
            if err == nil {
                break // sukses, keluar dari retry loop
            }
            
            // Tunggu sebelum retry
            if attempt < s.retryAttempts-1 {
                time.Sleep(time.Second * time.Duration(attempt+1))
            }
        }
        
        if err != nil {
            // Log error (production: kirim ke monitoring service)
            fmt.Printf("Failed to send email after %d attempts: %v\n", s.retryAttempts, err)
        }
    }
}

// sendEmailSync adalah helper untuk kirim email synchronous
func (s *emailService) sendEmailSync(e *email.Email) error {
    // Setup SMTP auth
    var auth smtp.Auth
    if s.config.Username != "" && s.config.Password != "" {
        auth = smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
    }

    // Send email
    addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
    return e.Send(addr, auth)
}

// sendEmailAsync kirim email ke channel untuk async processing
func (s *emailService) sendEmailAsync(e *email.Email) error {
    // Clone email untuk avoid race condition
    emailCopy := *e
    
    // Kirim ke channel
    select {
    case s.emailCh <- func() error {
        return s.sendEmailSync(&emailCopy)
    }:
        return nil
    default:
        return fmt.Errorf("email queue is full")
    }
}

// SendPlainText kirim email plain text
func (s *emailService) SendPlainText(data EmailData) error {
    e := email.NewEmail()
    e.From = s.config.From
    e.To = data.To
    e.Subject = data.Subject
    e.Text = []byte(data.Body)

    return s.sendEmailAsync(e)
}

// SendHTML kirim email HTML
func (s *emailService) SendHTML(data EmailData) error {
    e := email.NewEmail()
    e.From = s.config.From
    e.To = data.To
    e.Subject = data.Subject
    e.HTML = []byte(data.Body)

    return s.sendEmailAsync(e)
}

// SendWithTemplate kirim email dengan Go template
func (s *emailService) SendWithTemplate(to []string, subject, templateName string, data EmailTemplateData) error {
    // Set default values
    data.AppName = s.appConfig.Name
    data.AppURL = s.appConfig.URL
    data.Year = time.Now().Year()

    // Render template
    var buf bytes.Buffer
    if err := s.templates.ExecuteTemplate(&buf, templateName, data); err != nil {
        return fmt.Errorf("failed to execute template: %w", err)
    }

    e := email.NewEmail()
    e.From = s.config.From
    e.To = to
    e.Subject = subject
    e.HTML = buf.Bytes()

    return s.sendEmailAsync(e)
}

// SendWithAttachment kirim email dengan attachment
func (s *emailService) SendWithAttachment(data EmailData) error {
    e := email.NewEmail()
    e.From = s.config.From
    e.To = data.To
    e.Subject = data.Subject
    e.HTML = []byte(data.Body)

    // Attach files
    for _, filePath := range data.Attachments {
        if _, err := e.AttachFile(filePath); err != nil {
            return fmt.Errorf("failed to attach file %s: %w", filePath, err)
        }
    }

    return s.sendEmailAsync(e)
}

// SendWelcomeEmail kirim welcome email setelah register
func (s *emailService) SendWelcomeEmail(to, name string) error {
    data := EmailTemplateData{
        UserName: name,
        LoginURL: s.appConfig.URL + "/login",
    }

    return s.SendWithTemplate(
        []string{to},
        fmt.Sprintf("Welcome to %s!", s.appConfig.Name),
        "welcome.html",
        data,
    )
}

// SendVerificationEmail kirim email verifikasi dengan token
func (s *emailService) SendVerificationEmail(to, name, token string) error {
    data := EmailTemplateData{
        UserName:  name,
        VerifyURL: fmt.Sprintf("%s/verify-email?token=%s", s.appConfig.URL, token),
    }

    return s.SendWithTemplate(
        []string{to},
        "Verify Your Email Address",
        "verify_email.html",
        data,
    )
}

// SendResetPasswordEmail kirim email reset password
func (s *emailService) SendResetPasswordEmail(to, name, token string) error {
    data := EmailTemplateData{
        UserName: name,
        ResetURL: fmt.Sprintf("%s/reset-password?token=%s", s.appConfig.URL, token),
    }

    return s.SendWithTemplate(
        []string{to},
        "Reset Your Password",
        "reset_password.html",
        data,
    )
}

// SendNotificationEmail kirim notification email
func (s *emailService) SendNotificationEmail(to, name, message string) error {
    body := fmt.Sprintf(`
        <html>
        <body>
            <h2>Hi %s,</h2>
            <p>%s</p>
            <br>
            <p>Best regards,<br>%s Team</p>
        </body>
        </html>
    `, name, message, s.appConfig.Name)

    return s.SendHTML(EmailData{
        To:      []string{to},
        Subject: "Notification",
        Body:    body,
    })
}

// SendInvoiceEmail kirim invoice email dengan tabel
func (s *emailService) SendInvoiceEmail(to, name string, invoiceData EmailTemplateData) error {
    invoiceData.UserName = name

    return s.SendWithTemplate(
        []string{to},
        fmt.Sprintf("Invoice #%s", invoiceData.InvoiceNumber),
        "invoice.html",
        invoiceData,
    )
}

// parseEmailTemplates parse semua HTML template
func parseEmailTemplates() (*template.Template, error) {
    // Parse base template dan semua template lainnya
    tmpl := template.New("")
    
    templateFiles := []string{
        "pkg/templates/base.html",
        "pkg/templates/welcome.html",
        "pkg/templates/verify_email.html",
        "pkg/templates/reset_password.html",
        "pkg/templates/invoice.html",
    }

    for _, file := range templateFiles {
        tmpl, err := tmpl.ParseFiles(file)
        if err != nil {
            return nil, err
        }
        _ = tmpl
    }

    // Alternative: parse semua file sekaligus
    return template.ParseGlob(filepath.Join("pkg", "templates", "*.html"))
}
```

---

## 6. HTML Email Templates

**pkg/templates/base.html:**
```html
{{define "base"}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.AppName}}</title>
    <style>
        /* Inline CSS untuk email client compatibility */
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4f46e5;
            margin: 0;
        }
        .content {
            padding: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .button:hover {
            background-color: #4338ca;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
            font-size: 12px;
            color: #6b7280;
        }
        .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background-color: #f9fafb;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>{{.AppName}}</h1>
        </div>
        <div class="content">
            {{template "content" .}}
        </div>
        <div class="footer">
            <p>&copy; {{.Year}} {{.AppName}}. All rights reserved.</p>
            <p>{{.AppURL}}</p>
        </div>
    </div>
</body>
</html>
{{end}}
```

**pkg/templates/welcome.html:**
```html
{{template "base" .}}

{{define "content"}}
<h2>Welcome, {{.UserName}}! 🎉</h2>

<p>Thank you for joining <strong>{{.AppName}}</strong>! We're excited to have you on board.</p>

<div class="info-box">
    <p><strong>What's next?</strong></p>
    <ul>
        <li>Complete your profile</li>
        <li>Explore our features</li>
        <li>Connect with other users</li>
    </ul>
</div>

<p>Ready to get started?</p>

<a href="{{.LoginURL}}" class="button">Go to Dashboard</a>

<p>If you have any questions, feel free to reply to this email.</p>

<p>Best regards,<br>The {{.AppName}} Team</p>
{{end}}
```

**pkg/templates/verify_email.html:**
```html
{{template "base" .}}

{{define "content"}}
<h2>Verify Your Email Address</h2>

<p>Hi {{.UserName}},</p>

<p>Thank you for signing up! Please verify your email address to activate your account.</p>

<div class="info-box">
    <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
</div>

<p>Click the button below to verify your email:</p>

<a href="{{.VerifyURL}}" class="button">Verify Email</a>

<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #6b7280;">{{.VerifyURL}}</p>

<p>If you didn't create an account with us, please ignore this email.</p>

<p>Best regards,<br>The {{.AppName}} Team</p>
{{end}}
```

**pkg/templates/reset_password.html:**
```html
{{template "base" .}}

{{define "content"}}
<h2>Reset Your Password</h2>

<p>Hi {{.UserName}},</p>

<p>We received a request to reset your password. Click the button below to create a new password:</p>

<a href="{{.ResetURL}}" class="button">Reset Password</a>

<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #6b7280;">{{.ResetURL}}</p>

<div class="info-box">
    <p><strong>Security Notice:</strong></p>
    <ul>
        <li>This link will expire in 1 hour</li>
        <li>If you didn't request this, please ignore this email</li>
        <li>Your password won't change until you create a new one</li>
    </ul>
</div>

<p>Best regards,<br>The {{.AppName}} Team</p>
{{end}}
```

**pkg/templates/invoice.html:**
```html
{{template "base" .}}

{{define "content"}}
<h2>Invoice #{{.InvoiceNumber}}</h2>

<p>Hi {{.UserName}},</p>

<p>Thank you for your purchase! Here's your invoice:</p>

<table>
    <thead>
        <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Subtotal</th>
        </tr>
    </thead>
    <tbody>
        {{range .Items}}
        <tr>
            <td>{{.Name}}</td>
            <td>{{.Quantity}}</td>
            <td>${{printf "%.2f" .Price}}</td>
            <td>${{printf "%.2f" .Subtotal}}</td>
        </tr>
        {{end}}
        <tr style="font-weight: bold; background-color: #f9fafb;">
            <td colspan="3" style="text-align: right;">Total:</td>
            <td>${{printf "%.2f" .Total}}</td>
        </tr>
    </tbody>
</table>

<div class="info-box">
    <p><strong>Invoice Details:</strong></p>
    <p>Invoice Number: {{.InvoiceNumber}}<br>
    Date: {{.InvoiceDate}}</p>
</div>

<p>If you have any questions about this invoice, please contact our support team.</p>

<p>Best regards,<br>The {{.AppName}} Team</p>
{{end}}
```

---

## 7. Auth Service (Menggunakan Email Service)

**internal/service/auth_service.go:**
```go
package service

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "time"

    "email-service-go/internal/domain"
    "email-service-go/internal/dto"
    "email-service-go/internal/repository"
    "email-service-go/pkg/errors"

    "golang.org/x/crypto/bcrypt"
)

type AuthService interface {
    Register(req dto.RegisterRequest) (*domain.User, error)
    Login(req dto.LoginRequest) (*domain.User, error)
    VerifyEmail(token string) error
    ForgotPassword(req dto.ForgotPasswordRequest) error
    ResetPassword(req dto.ResetPasswordRequest) error
}

type authService struct {
    userRepo     repository.UserRepository
    emailService EmailService
}

func NewAuthService(userRepo repository.UserRepository, emailService EmailService) AuthService {
    return &authService{
        userRepo:     userRepo,
        emailService: emailService,
    }
}

func (s *authService) Register(req dto.RegisterRequest) (*domain.User, error) {
    // Check if email already exists
    existing, _ := s.userRepo.FindByEmail(req.Email)
    if existing != nil {
        return nil, errors.NewBadRequestError("Email already registered")
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, errors.WrapError(err, "Failed to hash password")
    }

    // Generate verification token
    verificationToken := generateToken()

    // Create user
    user := &domain.User{
        Name:              req.Name,
        Email:             req.Email,
        Password:          string(hashedPassword),
        IsEmailVerified:   false,
        VerificationToken: &verificationToken,
    }

    if err := s.userRepo.Create(user); err != nil {
        return nil, errors.WrapError(err, "Failed to create user")
    }

    // Send welcome email (async)
    go s.emailService.SendWelcomeEmail(user.Email, user.Name)

    // Send verification email (async)
    go s.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken)

    return user, nil
}

func (s *authService) Login(req dto.LoginRequest) (*domain.User, error) {
    // Find user by email
    user, err := s.userRepo.FindByEmail(req.Email)
    if err != nil {
        return nil, errors.NewUnauthorizedError("Invalid email or password")
    }

    // Check password
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
        return nil, errors.NewUnauthorizedError("Invalid email or password")
    }

    return user, nil
}

func (s *authService) VerifyEmail(token string) error {
    // Find user by verification token
    user, err := s.userRepo.FindByVerificationToken(token)
    if err != nil {
        return errors.NewBadRequestError("Invalid or expired verification token")
    }

    // Update user
    now := time.Now()
    user.IsEmailVerified = true
    user.EmailVerifiedAt = &now
    user.VerificationToken = nil

    if err := s.userRepo.Update(user); err != nil {
        return errors.WrapError(err, "Failed to verify email")
    }

    // Send notification email
    go s.emailService.SendNotificationEmail(
        user.Email,
        user.Name,
        "Your email has been verified successfully! You can now access all features.",
    )

    return nil
}

func (s *authService) ForgotPassword(req dto.ForgotPasswordRequest) error {
    // Find user by email
    user, err := s.userRepo.FindByEmail(req.Email)
    if err != nil {
        // Don't reveal if email exists
        return nil
    }

    // Generate reset token
    resetToken := generateToken()
    expiryTime := time.Now().Add(1 * time.Hour)

    // Update user
    user.ResetToken = &resetToken
    user.ResetTokenExpiry = &expiryTime

    if err := s.userRepo.Update(user); err != nil {
        return errors.WrapError(err, "Failed to generate reset token")
    }

    // Send reset password email (async)
    go s.emailService.SendResetPasswordEmail(user.Email, user.Name, resetToken)

    return nil
}

func (s *authService) ResetPassword(req dto.ResetPasswordRequest) error {
    // Find user by reset token
    user, err := s.userRepo.FindByResetToken(req.Token)
    if err != nil {
        return errors.NewBadRequestError("Invalid or expired reset token")
    }

    // Check if token expired
    if user.ResetTokenExpiry != nil && time.Now().After(*user.ResetTokenExpiry) {
        return errors.NewBadRequestError("Reset token has expired")
    }

    // Hash new password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return errors.WrapError(err, "Failed to hash password")
    }

    // Update user
    user.Password = string(hashedPassword)
    user.ResetToken = nil
    user.ResetTokenExpiry = nil

    if err := s.userRepo.Update(user); err != nil {
        return errors.WrapError(err, "Failed to reset password")
    }

    // Send notification email
    go s.emailService.SendNotificationEmail(
        user.Email,
        user.Name,
        "Your password has been reset successfully. If you didn't make this change, please contact support immediately.",
    )

    return nil
}

// generateToken generates a random token
func generateToken() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}
```

---

## 8. Repository

**internal/repository/user_repository.go:**
```go
package repository

import (
    "email-service-go/internal/domain"

    "gorm.io/gorm"
)

type UserRepository interface {
    Create(user *domain.User) error
    FindByID(id string) (*domain.User, error)
    FindByEmail(email string) (*domain.User, error)
    FindByVerificationToken(token string) (*domain.User, error)
    FindByResetToken(token string) (*domain.User, error)
    Update(user *domain.User) error
}

type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(user *domain.User) error {
    return r.db.Create(user).Error
}

func (r *userRepository) FindByID(id string) (*domain.User, error) {
    var user domain.User
    if err := r.db.Where("id = ?", id).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) FindByEmail(email string) (*domain.User, error) {
    var user domain.User
    if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) FindByVerificationToken(token string) (*domain.User, error) {
    var user domain.User
    if err := r.db.Where("verification_token = ?", token).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) FindByResetToken(token string) (*domain.User, error) {
    var user domain.User
    if err := r.db.Where("reset_token = ?", token).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *userRepository) Update(user *domain.User) error {
    return r.db.Save(user).Error
}
```

---

## 9. Handler

**internal/handler/auth_handler.go:**
```go
package handler

import (
    "email-service-go/internal/dto"
    "email-service-go/internal/service"
    "email-service-go/pkg/errors"

    "github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
    authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
    return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
    var req dto.RegisterRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    user, err := h.authService.Register(req)
    if err != nil {
        return err
    }

    return c.Status(fiber.StatusCreated).JSON(dto.AuthResponse{
        User: dto.UserResponse{
            ID:              user.ID.String(),
            Name:            user.Name,
            Email:           user.Email,
            IsEmailVerified: user.IsEmailVerified,
        },
        Message: "Registration successful! Please check your email to verify your account.",
    })
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
    var req dto.LoginRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    user, err := h.authService.Login(req)
    if err != nil {
        return err
    }

    return c.JSON(dto.AuthResponse{
        User: dto.UserResponse{
            ID:              user.ID.String(),
            Name:            user.Name,
            Email:           user.Email,
            IsEmailVerified: user.IsEmailVerified,
        },
        Message: "Login successful!",
    })
}

func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
    var req dto.VerifyEmailRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    if err := h.authService.VerifyEmail(req.Token); err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "message": "Email verified successfully!",
    })
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
    var req dto.ForgotPasswordRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    if err := h.authService.ForgotPassword(req); err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "message": "If your email exists, you will receive a password reset link.",
    })
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
    var req dto.ResetPasswordRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    if err := h.authService.ResetPassword(req); err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "message": "Password reset successfully!",
    })
}
```

---

## 10. Error Handler

**pkg/errors/app_error.go:**
```go
package errors

import (
    "fmt"

    "github.com/gofiber/fiber/v2"
)

type AppError struct {
    Message    string
    StatusCode int
    Err        error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

func NewBadRequestError(message string) *AppError {
    return &AppError{
        Message:    message,
        StatusCode: fiber.StatusBadRequest,
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Message:    message,
        StatusCode: fiber.StatusUnauthorized,
    }
}

func WrapError(err error, message string) *AppError {
    return &AppError{
        Message:    message,
        StatusCode: fiber.StatusInternalServerError,
        Err:        err,
    }
}
```

**internal/middleware/error_handler.go:**
```go
package middleware

import (
    "email-service-go/pkg/errors"

    "github.com/gofiber/fiber/v2"
)

func ErrorHandler(c *fiber.Ctx, err error) error {
    // Default error
    code := fiber.StatusInternalServerError
    message := "Internal server error"

    // Check if it's an AppError
    if e, ok := err.(*errors.AppError); ok {
        code = e.StatusCode
        message = e.Message
    }

    return c.Status(code).JSON(fiber.Map{
        "error":   true,
        "message": message,
    })
}
```

---

## 11. Main Application

**cmd/api/main.go:**
```go
package main

import (
    "fmt"
    "log"

    "email-service-go/internal/config"
    "email-service-go/internal/domain"
    "email-service-go/internal/handler"
    "email-service-go/internal/middleware"
    "email-service-go/internal/repository"
    "email-service-go/internal/service"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func main() {
    // Load config
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Connect to database
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Auto migrate
    if err := db.AutoMigrate(&domain.User{}); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Initialize services
    emailService, err := service.NewEmailService(cfg)
    if err != nil {
        log.Fatal("Failed to initialize email service:", err)
    }

    // Initialize repositories
    userRepo := repository.NewUserRepository(db)

    // Initialize services
    authService := service.NewAuthService(userRepo, emailService)

    // Initialize handlers
    authHandler := handler.NewAuthHandler(authService)

    // Create Fiber app
    app := fiber.New(fiber.Config{
        ErrorHandler: middleware.ErrorHandler,
    })

    // Middleware
    app.Use(logger.New())
    app.Use(cors.New())

    // Routes
    api := app.Group("/api")
    auth := api.Group("/auth")
    {
        auth.Post("/register", authHandler.Register)
        auth.Post("/login", authHandler.Login)
        auth.Post("/verify-email", authHandler.VerifyEmail)
        auth.Post("/forgot-password", authHandler.ForgotPassword)
        auth.Post("/reset-password", authHandler.ResetPassword)
    }

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok"})
    })

    // Start server
    port := cfg.Server.Port
    log.Printf("Server running on port %s", port)
    log.Printf("MailHog UI: http://localhost:8025")
    if err := app.Listen(":" + port); err != nil {
        log.Fatal(err)
    }
}
```

---

## 12. Testing Email Service (Mock)

**internal/service/email_service_mock.go:**
```go
package service

import (
    "fmt"
    "sync"
)

// MockEmailService untuk testing (tidak kirim email sungguhan)
type MockEmailService struct {
    SentEmails []EmailData
    mu         sync.Mutex
}

func NewMockEmailService() *MockEmailService {
    return &MockEmailService{
        SentEmails: make([]EmailData, 0),
    }
}

func (m *MockEmailService) SendPlainText(data EmailData) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    m.SentEmails = append(m.SentEmails, data)
    fmt.Printf("[MOCK] Sent plain text email to %v: %s\n", data.To, data.Subject)
    return nil
}

func (m *MockEmailService) SendHTML(data EmailData) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    m.SentEmails = append(m.SentEmails, data)
    fmt.Printf("[MOCK] Sent HTML email to %v: %s\n", data.To, data.Subject)
    return nil
}

func (m *MockEmailService) SendWithTemplate(to []string, subject, templateName string, data EmailTemplateData) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    m.SentEmails = append(m.SentEmails, EmailData{
        To:      to,
        Subject: subject,
        Body:    fmt.Sprintf("Template: %s", templateName),
    })
    fmt.Printf("[MOCK] Sent template email (%s) to %v: %s\n", templateName, to, subject)
    return nil
}

func (m *MockEmailService) SendWithAttachment(data EmailData) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    m.SentEmails = append(m.SentEmails, data)
    fmt.Printf("[MOCK] Sent email with attachments to %v: %s\n", data.To, data.Subject)
    return nil
}

func (m *MockEmailService) SendWelcomeEmail(to, name string) error {
    return m.SendWithTemplate([]string{to}, "Welcome!", "welcome.html", EmailTemplateData{UserName: name})
}

func (m *MockEmailService) SendVerificationEmail(to, name, token string) error {
    return m.SendWithTemplate([]string{to}, "Verify Email", "verify_email.html", EmailTemplateData{UserName: name})
}

func (m *MockEmailService) SendResetPasswordEmail(to, name, token string) error {
    return m.SendWithTemplate([]string{to}, "Reset Password", "reset_password.html", EmailTemplateData{UserName: name})
}

func (m *MockEmailService) SendNotificationEmail(to, name, message string) error {
    return m.SendHTML(EmailData{
        To:      []string{to},
        Subject: "Notification",
        Body:    message,
    })
}

func (m *MockEmailService) SendInvoiceEmail(to, name string, invoiceData EmailTemplateData) error {
    return m.SendWithTemplate([]string{to}, "Invoice", "invoice.html", invoiceData)
}

// GetSentEmailCount returns jumlah email yang terkirim (untuk testing)
func (m *MockEmailService) GetSentEmailCount() int {
    m.mu.Lock()
    defer m.mu.Unlock()
    return len(m.SentEmails)
}

// GetLastSentEmail returns email terakhir yang terkirim (untuk testing)
func (m *MockEmailService) GetLastSentEmail() *EmailData {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if len(m.SentEmails) == 0 {
        return nil
    }
    return &m.SentEmails[len(m.SentEmails)-1]
}

// Clear clears semua sent emails (untuk testing)
func (m *MockEmailService) Clear() {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.SentEmails = make([]EmailData, 0)
}
```

**Example test:**
```go
package service_test

import (
    "testing"

    "email-service-go/internal/service"
)

func TestMockEmailService(t *testing.T) {
    mockEmail := service.NewMockEmailService()

    // Test send welcome email
    err := mockEmail.SendWelcomeEmail("user@example.com", "John Doe")
    if err != nil {
        t.Errorf("Expected no error, got %v", err)
    }

    // Check email was sent
    if mockEmail.GetSentEmailCount() != 1 {
        t.Errorf("Expected 1 email sent, got %d", mockEmail.GetSentEmailCount())
    }

    lastEmail := mockEmail.GetLastSentEmail()
    if lastEmail == nil {
        t.Error("Expected email to be sent")
    }

    if len(lastEmail.To) != 1 || lastEmail.To[0] != "user@example.com" {
        t.Errorf("Expected email to user@example.com, got %v", lastEmail.To)
    }

    if lastEmail.Subject != "Welcome!" {
        t.Errorf("Expected subject 'Welcome!', got %s", lastEmail.Subject)
    }
}
```

---

## 13. Contoh Email dengan Attachment (PDF/Excel)

**Example: Send Invoice Email dengan PDF Attachment:**
```go
package main

import (
    "fmt"
    "time"

    "email-service-go/internal/service"
)

func SendInvoiceWithPDF(emailService service.EmailService) error {
    // 1. Generate PDF invoice (dari learning doc sebelumnya)
    pdfPath := "/tmp/invoice-12345.pdf"
    // ... generate PDF code here

    // 2. Prepare invoice data
    invoiceData := service.EmailTemplateData{
        UserName:      "John Doe",
        InvoiceNumber: "INV-12345",
        InvoiceDate:   time.Now().Format("02 Jan 2006"),
        Items: []service.InvoiceItem{
            {Name: "Product A", Quantity: 2, Price: 50.00, Subtotal: 100.00},
            {Name: "Product B", Quantity: 1, Price: 75.00, Subtotal: 75.00},
        },
        Total: 175.00,
    }

    // 3. Send email dengan HTML dan PDF attachment
    emailBody := fmt.Sprintf(`
        <html>
        <body>
            <h2>Invoice #%s</h2>
            <p>Hi %s,</p>
            <p>Thank you for your purchase! Your invoice is attached.</p>
            <p>Total: $%.2f</p>
            <p>Best regards,<br>Your Company</p>
        </body>
        </html>
    `, invoiceData.InvoiceNumber, invoiceData.UserName, invoiceData.Total)

    return emailService.SendWithAttachment(service.EmailData{
        To:          []string{"john@example.com"},
        Subject:     fmt.Sprintf("Invoice #%s", invoiceData.InvoiceNumber),
        Body:        emailBody,
        Attachments: []string{pdfPath},
    })
}
```

---

## Testing dengan MailHog

**1. Start MailHog:**
```bash
mailhog
```

**2. Register user (email akan dikirim):**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**3. Cek email di MailHog UI:**
- Buka http://localhost:8025
- Kamu akan lihat 2 email:
  1. Welcome email
  2. Verification email dengan token

**4. Copy verification token dari email, lalu verify:**
```bash
curl -X POST http://localhost:8080/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-dari-email"
  }'
```

**5. Test forgot password:**
```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**6. Cek reset password email di MailHog, copy token:**
```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-dari-email",
    "password": "newpassword123"
  }'
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **Email tidak terkirim dan tidak ada error**
**Masalah:**
```go
// Kirim email tapi tidak handle error dari async goroutine
go emailService.SendWelcomeEmail(user.Email, user.Name)
```

**Solusi:**
```go
// Gunakan channel-based worker yang handle error
// Email service sudah implement ini di emailWorker()
// Atau log error di goroutine
go func() {
    if err := emailService.SendWelcomeEmail(user.Email, user.Name); err != nil {
        log.Printf("Failed to send welcome email: %v", err)
    }
}()
```

---

### 2. **SMTP Authentication Error**
**Masalah:**
```go
// Lupa set SMTP auth untuk production server
auth = smtp.PlainAuth("", "", "", s.config.Host)
```

**Solusi:**
```go
// Check jika credentials ada
var auth smtp.Auth
if s.config.Username != "" && s.config.Password != "" {
    auth = smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
}

// Untuk MailHog development, auth = nil
```

---

### 3. **Email Template tidak parse**
**Masalah:**
```go
// Parse template tapi tidak handle error
template.ParseFiles("templates/welcome.html")
```

**Solusi:**
```go
// Parse semua template saat startup
tmpl, err := template.ParseGlob(filepath.Join("pkg", "templates", "*.html"))
if err != nil {
    return nil, fmt.Errorf("failed to parse templates: %w", err)
}

// Check template exists sebelum execute
if tmpl.Lookup("welcome.html") == nil {
    return fmt.Errorf("template welcome.html not found")
}
```

---

### 4. **Email dengan inline image tidak muncul**
**Masalah:**
```html
<!-- Image path relatif tidak work di email -->
<img src="/images/logo.png" alt="Logo">
```

**Solusi:**
```html
<!-- Gunakan absolute URL atau embed base64 -->
<img src="{{.AppURL}}/images/logo.png" alt="Logo">

<!-- Atau embed base64 -->
<img src="data:image/png;base64,iVBORw0KGgo..." alt="Logo">
```

---

### 5. **Memory leak dari goroutine liar**
**Masalah:**
```go
// Spawn goroutine tanpa limit
for _, user := range users {
    go emailService.SendEmail(user.Email)
}
// Jika users = 10,000, akan buat 10,000 goroutines!
```

**Solusi:**
```go
// Gunakan worker pool pattern
emailCh := make(chan func() error, 100) // buffered channel

// Start fixed number of workers
for i := 0; i < 5; i++ {
    go worker(emailCh)
}

// Send tasks to workers
for _, user := range users {
    user := user // capture loop variable
    emailCh <- func() error {
        return emailService.SendEmail(user.Email)
    }
}
```

---

### 6. **Email tidak retry saat gagal**
**Masalah:**
```go
// Kirim email sekali, gagal = hilang
if err := emailService.Send(email); err != nil {
    return err
}
```

**Solusi:**
```go
// Implement retry logic dengan exponential backoff
var err error
for attempt := 0; attempt < 3; attempt++ {
    err = emailService.Send(email)
    if err == nil {
        break
    }
    time.Sleep(time.Second * time.Duration(attempt+1))
}

if err != nil {
    log.Printf("Failed to send email after 3 attempts: %v", err)
}
```

---

### 7. **HTML CSS tidak work di email client**
**Masalah:**
```html
<!-- External CSS tidak work di email -->
<link rel="stylesheet" href="styles.css">

<!-- Class-based styling tidak reliable -->
<div class="button">Click me</div>
```

**Solusi:**
```html
<!-- Gunakan inline CSS -->
<a href="#" style="display: inline-block; padding: 12px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px;">
    Click me
</a>

<!-- Atau inline di style tag (tapi kurang support) -->
<style>
    .button { background-color: #4f46e5; }
</style>
```

---

### 8. **Email masuk spam folder**
**Masalah:**
- Email tidak ada unsubscribe link
- Subject line pake ALL CAPS atau banyak emoji
- Tidak setup SPF/DKIM/DMARC records

**Solusi:**
```go
// 1. Tambahkan unsubscribe link di footer
footer := fmt.Sprintf(`
    <p style="font-size: 12px; color: #999;">
        Don't want these emails? 
        <a href="%s/unsubscribe?email=%s">Unsubscribe</a>
    </p>
`, appURL, email)

// 2. Subject line yang baik
subject := "Verify Your Email Address" // ✅ Good
// subject := "VERIFY YOUR EMAIL NOW!!!" // ❌ Spammy

// 3. Setup DNS records (di domain provider):
// SPF: v=spf1 include:_spf.google.com ~all
// DKIM: Setup di email provider
// DMARC: v=DMARC1; p=none; rua=mailto:admin@example.com
```

---

## 10 Ide Pengembangan

### 1. **Email Queue dengan Redis**
```go
// Gunakan Redis untuk email queue yang persistent
type RedisEmailQueue struct {
    client *redis.Client
}

func (q *RedisEmailQueue) Enqueue(email EmailData) error {
    data, _ := json.Marshal(email)
    return q.client.RPush(ctx, "email:queue", data).Err()
}

func (q *RedisEmailQueue) Dequeue() (*EmailData, error) {
    data, err := q.client.BLPop(ctx, 0, "email:queue").Result()
    if err != nil {
        return nil, err
    }
    
    var email EmailData
    json.Unmarshal([]byte(data[1]), &email)
    return &email, nil
}
```

---

### 2. **Email Template Builder (Visual Editor)**
```go
// Simpan template di database, allow user customize
type EmailTemplate struct {
    ID       uuid.UUID
    Name     string
    Subject  string
    HTMLBody string // Dengan placeholder: {{.UserName}}
    Category string // welcome, verification, etc
}

// Render template custom user
func RenderCustomTemplate(tmplID uuid.UUID, data map[string]interface{}) (string, error) {
    tmpl := getTemplateFromDB(tmplID)
    t := template.New("custom")
    t, _ = t.Parse(tmpl.HTMLBody)
    
    var buf bytes.Buffer
    t.Execute(&buf, data)
    return buf.String(), nil
}
```

---

### 3. **Email Analytics (Track Opens & Clicks)**
```go
// Embed tracking pixel untuk track email opens
func AddTrackingPixel(emailID uuid.UUID, html string) string {
    pixel := fmt.Sprintf(
        `<img src="%s/track/open/%s" width="1" height="1" alt="">`,
        appURL, emailID,
    )
    return html + pixel
}

// Track clicks dengan redirect URL
func TrackLink(emailID uuid.UUID, originalURL string) string {
    return fmt.Sprintf("%s/track/click/%s?url=%s", appURL, emailID, url.QueryEscape(originalURL))
}

// Handler untuk tracking
func HandleTrackOpen(c *fiber.Ctx) error {
    emailID := c.Params("id")
    // Save to database: email opened at timestamp
    db.Exec("UPDATE email_logs SET opened_at = NOW() WHERE id = ?", emailID)
    
    // Return 1x1 transparent pixel
    return c.Send(transparentPixelBytes)
}
```

---

### 4. **Unsubscribe Management**
```go
type EmailPreference struct {
    UserID           uuid.UUID
    ReceiveMarketing bool
    ReceiveUpdates   bool
    ReceiveInvoices  bool
}

func (s *emailService) ShouldSendEmail(userID uuid.UUID, emailType string) bool {
    pref := getPreferences(userID)
    
    switch emailType {
    case "marketing":
        return pref.ReceiveMarketing
    case "updates":
        return pref.ReceiveUpdates
    default:
        return true // Always send transactional emails
    }
}
```

---

### 5. **Multi-language Email Support**
```go
// Template per bahasa
templates/
  en/
    welcome.html
    verify_email.html
  id/
    welcome.html
    verify_email.html

func (s *emailService) SendLocalizedEmail(to, locale, templateName string, data EmailTemplateData) error {
    tmplPath := fmt.Sprintf("templates/%s/%s", locale, templateName)
    tmpl := template.Must(template.ParseFiles(tmplPath))
    
    var buf bytes.Buffer
    tmpl.Execute(&buf, data)
    
    return s.SendHTML(EmailData{
        To:      []string{to},
        Subject: getLocalizedSubject(locale, templateName),
        Body:    buf.String(),
    })
}
```

---

### 6. **Email Scheduling (Send Later)**
```go
type ScheduledEmail struct {
    ID        uuid.UUID
    EmailData EmailData
    SendAt    time.Time
    Status    string // pending, sent, failed
}

// Scheduler goroutine
func (s *emailService) startScheduler() {
    ticker := time.NewTicker(1 * time.Minute)
    
    for range ticker.C {
        emails := getScheduledEmails(time.Now())
        
        for _, scheduled := range emails {
            go func(e ScheduledEmail) {
                if err := s.SendHTML(e.EmailData); err != nil {
                    updateStatus(e.ID, "failed")
                } else {
                    updateStatus(e.ID, "sent")
                }
            }(scheduled)
        }
    }
}
```

---

### 7. **Email Rate Limiting**
```go
// Limit email per user/domain untuk avoid spam
type RateLimiter struct {
    store map[string][]time.Time
    mu    sync.Mutex
}

func (r *RateLimiter) Allow(email string, limit int, window time.Duration) bool {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    now := time.Now()
    cutoff := now.Add(-window)
    
    // Remove old timestamps
    timestamps := r.store[email]
    valid := []time.Time{}
    for _, t := range timestamps {
        if t.After(cutoff) {
            valid = append(valid, t)
        }
    }
    
    if len(valid) >= limit {
        return false // Rate limit exceeded
    }
    
    r.store[email] = append(valid, now)
    return true
}

// Usage:
if !rateLimiter.Allow(user.Email, 5, time.Hour) {
    return errors.New("Too many emails sent. Please try again later.")
}
```

---

### 8. **Bulk Email dengan Batching**
```go
func (s *emailService) SendBulkEmail(recipients []string, subject, body string, batchSize int) error {
    // Split recipients into batches
    for i := 0; i < len(recipients); i += batchSize {
        end := i + batchSize
        if end > len(recipients) {
            end = len(recipients)
        }
        
        batch := recipients[i:end]
        
        // Send batch
        go func(to []string) {
            s.SendHTML(EmailData{
                To:      to,
                Subject: subject,
                Body:    body,
            })
        }(batch)
        
        // Delay between batches
        time.Sleep(time.Second)
    }
    
    return nil
}
```

---

### 9. **Email Preview API (Test Template)**
```go
// Endpoint untuk preview email template
func PreviewEmailTemplate(c *fiber.Ctx) error {
    templateName := c.Query("template")
    
    // Sample data
    data := EmailTemplateData{
        AppName:  "MyApp",
        AppURL:   "http://localhost:3000",
        UserName: "John Doe",
        VerifyURL: "http://localhost:3000/verify?token=sample-token",
    }
    
    // Render template
    var buf bytes.Buffer
    if err := templates.ExecuteTemplate(&buf, templateName, data); err != nil {
        return err
    }
    
    // Return HTML untuk preview
    c.Set("Content-Type", "text/html")
    return c.Send(buf.Bytes())
}

// Usage: http://localhost:8080/email/preview?template=welcome.html
```

---

### 10. **Email Webhook Handler (Bounce & Complaint)**
```go
// Handle webhook dari email provider (SendGrid, AWS SES, etc)
func HandleEmailWebhook(c *fiber.Ctx) error {
    var event struct {
        Type  string `json:"type"`
        Email string `json:"email"`
    }
    
    if err := c.BodyParser(&event); err != nil {
        return err
    }
    
    switch event.Type {
    case "bounce":
        // Email bounced - mark email as invalid
        db.Exec("UPDATE users SET email_valid = false WHERE email = ?", event.Email)
        
    case "complaint":
        // User marked as spam - unsubscribe
        db.Exec("UPDATE email_preferences SET receive_all = false WHERE user_email = ?", event.Email)
        
    case "open":
        // Email opened
        db.Exec("INSERT INTO email_analytics (email, event, timestamp) VALUES (?, 'open', NOW())", event.Email)
    }
    
    return c.SendStatus(200)
}
```

---

## Kesimpulan

**Email Service** adalah komponen penting untuk komunikasi dengan user. Key points:

1. **Setup SMTP**: Gunakan MailHog untuk development, SMTP provider (Gmail, SendGrid) untuk production
2. **HTML Templates**: Go `html/template` dengan inline CSS untuk compatibility
3. **Async Email**: Gunakan channel-based worker, bukan goroutine liar
4. **Retry Logic**: Implement retry dengan exponential backoff untuk reliability
5. **Testing**: Mock EmailService interface untuk unit testing

**Production checklist:**
- ✅ Setup SPF/DKIM/DMARC DNS records
- ✅ Implement unsubscribe link di semua marketing emails
- ✅ Monitor email delivery rate & bounce rate
- ✅ Use email analytics untuk track engagement
- ✅ Rate limiting untuk avoid spam complaints

Happy coding! 🚀
