# BELAJAR DATABASE TRANSACTIONS + SOFT DELETE DI GORM

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- ✅ Paham konsep ACID properties dalam database transactions
- ✅ Implement database transactions dengan GORM yang safe dari race condition
- ✅ Bikin soft delete system yang proper dengan GORM
- ✅ Handle complex business logic yang butuh multi-table operations atomically
- ✅ Implement wallet transfer, order processing dengan transaction
- ✅ Debug dan fix transaction deadlock & rollback issues
- ✅ Paham kapan HARUS pakai transaction vs kapan cukup single operation

---

## 💡 Konsep + Analogi

### Apa itu Database Transaction?

**Database Transaction** adalah kumpulan operasi database yang dijalankan sebagai satu unit atomic: semua sukses atau semua gagal (rollback). **Soft Delete** adalah menandai record sebagai "deleted" tanpa benar-benar menghapus dari database.

**Analogi Real Life:**

Bayangin lo transfer uang dari rekening A ke rekening B:
1. Kurangi saldo rekening A (-100ribu)
2. Tambah saldo rekening B (+100ribu)

Kalo step 1 sukses tapi step 2 gagal → uangnya ILANG! 💸  
Makanya butuh **transaction**: kalau salah satu gagal, SEMUA dibatalin (rollback).

**Analogi dari TypeScript/Prisma yang lo udah kenal:**
```typescript
// TypeScript dengan Prisma
// Transaction
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: { name: 'John' } });
  await tx.order.create({ data: { userId: 1 } });
  // Auto rollback if error
});

// Soft Delete dengan Prisma Middleware
prisma.$use(async (params, next) => {
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  return next(params);
});

// Exclude soft deleted
const users = await prisma.user.findMany({
  where: { deletedAt: null }
});
```

**Di Go GORM:**
```go
// Transaction (auto rollback)
db.Transaction(func(tx *gorm.DB) error {
    tx.Create(&user)
    tx.Create(&order)
    return nil // Commit, or return error to rollback
})

// Soft Delete (built-in)
type User struct {
    ID        uint
    Name      string
    DeletedAt gorm.DeletedAt // Built-in soft delete
}

db.Delete(&user) // Soft delete (set DeletedAt)
db.Unscoped().Delete(&user) // Hard delete
```

**Key Concepts yang Lo Harus Paham:**

### 1. ACID Properties
- **Atomicity**: All or nothing (semua sukses atau semua gagal)
- **Consistency**: Data tetap valid setelah transaction (constraints tetap terpenuhi)
- **Isolation**: Concurrent transactions gak saling ganggu
- **Durability**: Kalau commit sukses, data permanen (even pas server crash)

### 2. Transaction Rollback
Kalo ada error di tengah transaction, semua perubahan dibatalin:
```go
db.Transaction(func(tx *gorm.DB) error {
    tx.Create(&user)        // Insert berhasil
    tx.Create(&order)       // Insert berhasil
    return errors.New("whoops") // ❌ Semua rollback!
})
```

### 3. Row-Level Locking
Prevent race condition pas concurrent update:
```go
// Pessimistic lock: Lock row sampe transaction selesai
tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&wallet)
wallet.Balance += 100
tx.Save(&wallet)
```

### 4. Context & Timeout
Prevent transaction hang:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
    // Auto cancel kalo lebih dari 5 detik
})
```

### 5. Soft Delete Benefits
- **Audit trail**: Lo bisa liat data yang "dihapus"
- **Undo**: Bisa restore data yang ke-delete
- **Compliance**: Beberapa regulasi butuh history lengkap
- **Referential integrity**: Foreign key relationships tetap valid

**Kapan HARUS pakai transaction:**
- ✅ Transfer balance (debit + credit harus together)
- ✅ Create parent + children (Order + OrderItems)
- ✅ Update inventory + create sale record
- ✅ Multi-table update yang saling tergantung
- ❌ Single INSERT/UPDATE operation
- ❌ Read-only queries

---

## 📝 Materi + Kode Lengkap

### Struktur Project

```
gorm-transactions-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   ├── database.go
│   │   └── migrations.go
│   ├── model/
│   │   ├── user.go
│   │   ├── wallet.go
│   │   ├── order.go
│   │   ├── product.go
│   │   └── base.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── wallet_repository.go
│   │   ├── order_repository.go
│   │   └── product_repository.go
│   ├── service/
│   │   ├── user_service.go
│   │   ├── wallet_service.go
│   │   └── order_service.go
│   ├── handler/
│   │   ├── user_handler.go
│   │   ├── wallet_handler.go
│   │   └── order_handler.go
│   └── middleware/
│       └── error_handler.go
├── pkg/
│   └── response/
│       └── response.go
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
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/gofiber/fiber/v2
go get github.com/spf13/viper
go get github.com/google/uuid
```

**go.mod:**
```go
module gorm-transactions-go

go 1.21

require (
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/spf13/viper v1.18.2
    github.com/google/uuid v1.5.0
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
      POSTGRES_DB: transactions_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command:
      - "postgres"
      - "-c"
      - "log_statement=all"  # Log all SQL queries

volumes:
  postgres_data:
```

**Start services:**
```bash
docker-compose up -d
docker-compose logs -f postgres  # See SQL queries
```

---

## 2. Configuration

**.env:**
```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=transactions_db
DB_LOG_LEVEL=info

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
    Server   ServerConfig
    Database DatabaseConfig
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
    LogLevel string
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
        Server: ServerConfig{
            Port: viper.GetString("PORT"),
        },
        Database: DatabaseConfig{
            Host:     viper.GetString("DB_HOST"),
            Port:     viper.GetString("DB_PORT"),
            User:     viper.GetString("DB_USER"),
            Password: viper.GetString("DB_PASSWORD"),
            DBName:   viper.GetString("DB_NAME"),
            LogLevel: viper.GetString("DB_LOG_LEVEL"),
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

## 3. Base Models & Database Setup

**internal/model/base.go:**
```go
package model

import (
    "time"

    "gorm.io/gorm"
)

// BaseModel contains common fields for all models
type BaseModel struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"` // Soft delete
}

// BaseModelWithCustomDelete uses custom soft delete fields
type BaseModelWithCustomDelete struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    IsDeleted bool      `gorm:"default:false;index" json:"is_deleted"`
    DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
```

**internal/model/user.go:**
```go
package model

type User struct {
    BaseModel
    Name   string  `gorm:"type:varchar(100);not null" json:"name"`
    Email  string  `gorm:"type:varchar(100);uniqueIndex:idx_users_email_not_deleted;not null" json:"email"`
    Wallet *Wallet `gorm:"constraint:OnDelete:CASCADE" json:"wallet,omitempty"`
    Orders []Order `gorm:"constraint:OnDelete:CASCADE" json:"orders,omitempty"`
}

// TableName overrides the table name
func (User) TableName() string {
    return "users"
}
```

**internal/model/wallet.go:**
```go
package model

type Wallet struct {
    BaseModel
    UserID  uint    `gorm:"uniqueIndex;not null" json:"user_id"`
    Balance float64 `gorm:"type:decimal(15,2);default:0;not null" json:"balance"`
    User    *User   `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (Wallet) TableName() string {
    return "wallets"
}

// Transaction history for audit
type WalletTransaction struct {
    BaseModel
    WalletID      uint    `gorm:"not null;index" json:"wallet_id"`
    Type          string  `gorm:"type:varchar(20);not null" json:"type"` // CREDIT, DEBIT
    Amount        float64 `gorm:"type:decimal(15,2);not null" json:"amount"`
    BalanceBefore float64 `gorm:"type:decimal(15,2);not null" json:"balance_before"`
    BalanceAfter  float64 `gorm:"type:decimal(15,2);not null" json:"balance_after"`
    Description   string  `gorm:"type:text" json:"description"`
}

func (WalletTransaction) TableName() string {
    return "wallet_transactions"
}
```

**internal/model/product.go:**
```go
package model

type Product struct {
    BaseModel
    Name  string  `gorm:"type:varchar(100);not null" json:"name"`
    Price float64 `gorm:"type:decimal(15,2);not null" json:"price"`
    Stock int     `gorm:"default:0;not null" json:"stock"`
}

func (Product) TableName() string {
    return "products"
}
```

**internal/model/order.go:**
```go
package model

type Order struct {
    BaseModel
    UserID     uint        `gorm:"not null;index" json:"user_id"`
    TotalPrice float64     `gorm:"type:decimal(15,2);not null" json:"total_price"`
    Status     string      `gorm:"type:varchar(20);default:'PENDING';not null" json:"status"`
    User       *User       `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
    Items      []OrderItem `gorm:"constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

func (Order) TableName() string {
    return "orders"
}

type OrderItem struct {
    BaseModel
    OrderID   uint     `gorm:"not null;index" json:"order_id"`
    ProductID uint     `gorm:"not null;index" json:"product_id"`
    Quantity  int      `gorm:"not null" json:"quantity"`
    Price     float64  `gorm:"type:decimal(15,2);not null" json:"price"`
    Order     *Order   `gorm:"constraint:OnDelete:CASCADE" json:"order,omitempty"`
    Product   *Product `gorm:"constraint:OnDelete:CASCADE" json:"product,omitempty"`
}

func (OrderItem) TableName() string {
    return "order_items"
}
```

**internal/database/database.go:**
```go
package database

import (
    "fmt"
    "log"
    "time"

    "gorm-transactions-go/internal/config"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewDatabase(cfg *config.Config) (*gorm.DB, error) {
    // Set log level
    var logLevel logger.LogLevel
    switch cfg.Database.LogLevel {
    case "silent":
        logLevel = logger.Silent
    case "error":
        logLevel = logger.Error
    case "warn":
        logLevel = logger.Warn
    default:
        logLevel = logger.Info
    }

    // Open connection
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
        Logger: logger.Default.LogMode(logLevel),
        NowFunc: func() time.Time {
            return time.Now().UTC()
        },
        // Important for transactions
        PrepareStmt:            true,
        SkipDefaultTransaction: false, // Keep default transaction for safety
    })

    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    // Get underlying SQL DB
    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("failed to get sql.DB: %w", err)
    }

    // Connection pool settings
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetConnMaxLifetime(time.Hour)

    log.Println("✅ Database connected successfully")
    return db, nil
}
```

**internal/database/migrations.go:**
```go
package database

import (
    "gorm-transactions-go/internal/model"

    "gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
    // Auto migrate all models
    if err := db.AutoMigrate(
        &model.User{},
        &model.Wallet{},
        &model.WalletTransaction{},
        &model.Product{},
        &model.Order{},
        &model.OrderItem{},
    ); err != nil {
        return err
    }

    // Create partial index for soft deleted users
    // This allows multiple soft-deleted users with same email
    db.Exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_not_deleted 
        ON users(email) 
        WHERE deleted_at IS NULL
    `)

    // Create index for faster soft delete queries
    db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_users_deleted_at 
        ON users(deleted_at)
    `)

    return nil
}

func SeedData(db *gorm.DB) error {
    // Check if data exists
    var count int64
    db.Model(&model.Product{}).Count(&count)
    if count > 0 {
        return nil // Already seeded
    }

    // Seed products
    products := []model.Product{
        {Name: "Laptop", Price: 15000000, Stock: 10},
        {Name: "Mouse", Price: 150000, Stock: 50},
        {Name: "Keyboard", Price: 500000, Stock: 30},
    }

    return db.Create(&products).Error
}
```

---

## 4. Repository Layer dengan Transactions

**internal/repository/user_repository.go:**
```go
package repository

import (
    "context"
    "errors"

    "gorm-transactions-go/internal/model"

    "gorm.io/gorm"
)

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

// WithTx returns repository with transaction
func (r *UserRepository) WithTx(tx *gorm.DB) *UserRepository {
    return &UserRepository{db: tx}
}

// Create creates user with wallet (transaction example)
func (r *UserRepository) CreateWithWallet(ctx context.Context, user *model.User, initialBalance float64) error {
    // Use db.Transaction for automatic rollback
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // 1. Create user
        if err := tx.Create(user).Error; err != nil {
            return err // Auto rollback
        }

        // 2. Create wallet
        wallet := &model.Wallet{
            UserID:  user.ID,
            Balance: initialBalance,
        }
        if err := tx.Create(wallet).Error; err != nil {
            return err // Auto rollback
        }

        return nil // Auto commit
    })
}

// FindByID finds user by ID (respects soft delete)
func (r *UserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &user, nil
}

// FindByIDWithWallet finds user with wallet (preload)
func (r *UserRepository) FindByIDWithWallet(ctx context.Context, id uint) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).Preload("Wallet").First(&user, id).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &user, nil
}

// FindByEmail finds user by email
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &user, nil
}

// SoftDelete soft deletes user
func (r *UserRepository) SoftDelete(ctx context.Context, id uint) error {
    return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// Restore restores soft deleted user
func (r *UserRepository) Restore(ctx context.Context, id uint) error {
    return r.db.WithContext(ctx).Model(&model.User{}).
        Unscoped().
        Where("id = ?", id).
        Update("deleted_at", nil).Error
}

// FindAll finds all users (exclude soft deleted)
func (r *UserRepository) FindAll(ctx context.Context) ([]model.User, error) {
    var users []model.User
    err := r.db.WithContext(ctx).Find(&users).Error
    return users, err
}

// FindAllIncludingDeleted finds all users including soft deleted
func (r *UserRepository) FindAllIncludingDeleted(ctx context.Context) ([]model.User, error) {
    var users []model.User
    err := r.db.WithContext(ctx).Unscoped().Find(&users).Error
    return users, err
}

// HardDelete permanently deletes user
func (r *UserRepository) HardDelete(ctx context.Context, id uint) error {
    return r.db.WithContext(ctx).Unscoped().Delete(&model.User{}, id).Error
}
```

**internal/repository/wallet_repository.go:**
```go
package repository

import (
    "context"
    "fmt"

    "gorm-transactions-go/internal/model"

    "gorm.io/gorm"
)

type WalletRepository struct {
    db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) *WalletRepository {
    return &WalletRepository{db: db}
}

func (r *WalletRepository) WithTx(tx *gorm.DB) *WalletRepository {
    return &WalletRepository{db: tx}
}

// FindByUserID finds wallet by user ID
func (r *WalletRepository) FindByUserID(ctx context.Context, userID uint) (*model.Wallet, error) {
    var wallet model.Wallet
    err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&wallet).Error
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &wallet, nil
}

// FindByUserIDWithLock finds wallet with row lock (FOR UPDATE)
func (r *WalletRepository) FindByUserIDWithLock(ctx context.Context, userID uint) (*model.Wallet, error) {
    var wallet model.Wallet
    err := r.db.WithContext(ctx).
        Set("gorm:query_option", "FOR UPDATE"). // Row lock
        Where("user_id = ?", userID).
        First(&wallet).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &wallet, nil
}

// UpdateBalance updates wallet balance
func (r *WalletRepository) UpdateBalance(ctx context.Context, walletID uint, newBalance float64) error {
    return r.db.WithContext(ctx).
        Model(&model.Wallet{}).
        Where("id = ?", walletID).
        Update("balance", newBalance).Error
}

// Transfer transfers balance between two wallets (must be in transaction)
func (r *WalletRepository) Transfer(ctx context.Context, fromUserID, toUserID uint, amount float64) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // 1. Get sender wallet with lock
        var fromWallet model.Wallet
        err := tx.Set("gorm:query_option", "FOR UPDATE").
            Where("user_id = ?", fromUserID).
            First(&fromWallet).Error
        if err != nil {
            return err
        }

        // 2. Check balance
        if fromWallet.Balance < amount {
            return fmt.Errorf("insufficient balance")
        }

        // 3. Get receiver wallet with lock
        var toWallet model.Wallet
        err = tx.Set("gorm:query_option", "FOR UPDATE").
            Where("user_id = ?", toUserID).
            First(&toWallet).Error
        if err != nil {
            return err
        }

        // 4. Deduct from sender
        fromBalanceBefore := fromWallet.Balance
        fromWallet.Balance -= amount
        if err := tx.Save(&fromWallet).Error; err != nil {
            return err
        }

        // 5. Add to receiver
        toBalanceBefore := toWallet.Balance
        toWallet.Balance += amount
        if err := tx.Save(&toWallet).Error; err != nil {
            return err
        }

        // 6. Create transaction history for sender
        senderTx := &model.WalletTransaction{
            WalletID:      fromWallet.ID,
            Type:          "DEBIT",
            Amount:        amount,
            BalanceBefore: fromBalanceBefore,
            BalanceAfter:  fromWallet.Balance,
            Description:   fmt.Sprintf("Transfer to user %d", toUserID),
        }
        if err := tx.Create(senderTx).Error; err != nil {
            return err
        }

        // 7. Create transaction history for receiver
        receiverTx := &model.WalletTransaction{
            WalletID:      toWallet.ID,
            Type:          "CREDIT",
            Amount:        amount,
            BalanceBefore: toBalanceBefore,
            BalanceAfter:  toWallet.Balance,
            Description:   fmt.Sprintf("Transfer from user %d", fromUserID),
        }
        if err := tx.Create(receiverTx).Error; err != nil {
            return err
        }

        return nil // Commit
    })
}
```

**internal/repository/product_repository.go:**
```go
package repository

import (
    "context"
    "fmt"

    "gorm-transactions-go/internal/model"

    "gorm.io/gorm"
)

type ProductRepository struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
    return &ProductRepository{db: db}
}

func (r *ProductRepository) WithTx(tx *gorm.DB) *ProductRepository {
    return &ProductRepository{db: tx}
}

// FindByID finds product by ID
func (r *ProductRepository) FindByID(ctx context.Context, id uint) (*model.Product, error) {
    var product model.Product
    err := r.db.WithContext(ctx).First(&product, id).Error
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &product, nil
}

// FindByIDWithLock finds product with row lock
func (r *ProductRepository) FindByIDWithLock(ctx context.Context, id uint) (*model.Product, error) {
    var product model.Product
    err := r.db.WithContext(ctx).
        Set("gorm:query_option", "FOR UPDATE").
        First(&product, id).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &product, nil
}

// DecrementStock decrements product stock (with lock to prevent race condition)
func (r *ProductRepository) DecrementStock(ctx context.Context, productID uint, quantity int) error {
    // Use explicit transaction with lock
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        var product model.Product
        
        // Lock row
        err := tx.Set("gorm:query_option", "FOR UPDATE").
            First(&product, productID).Error
        if err != nil {
            return err
        }

        // Check stock
        if product.Stock < quantity {
            return fmt.Errorf("insufficient stock: available %d, requested %d", product.Stock, quantity)
        }

        // Decrement
        product.Stock -= quantity
        return tx.Save(&product).Error
    })
}

// FindAll finds all products
func (r *ProductRepository) FindAll(ctx context.Context) ([]model.Product, error) {
    var products []model.Product
    err := r.db.WithContext(ctx).Find(&products).Error
    return products, err
}
```

**internal/repository/order_repository.go:**
```go
package repository

import (
    "context"

    "gorm-transactions-go/internal/model"

    "gorm.io/gorm"
)

type OrderRepository struct {
    db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
    return &OrderRepository{db: db}
}

func (r *OrderRepository) WithTx(tx *gorm.DB) *OrderRepository {
    return &OrderRepository{db: tx}
}

// Create creates order
func (r *OrderRepository) Create(ctx context.Context, order *model.Order) error {
    return r.db.WithContext(ctx).Create(order).Error
}

// FindByID finds order by ID with items
func (r *OrderRepository) FindByID(ctx context.Context, id uint) (*model.Order, error) {
    var order model.Order
    err := r.db.WithContext(ctx).
        Preload("Items.Product").
        First(&order, id).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &order, nil
}

// FindByUserID finds all orders by user ID
func (r *OrderRepository) FindByUserID(ctx context.Context, userID uint) ([]model.Order, error) {
    var orders []model.Order
    err := r.db.WithContext(ctx).
        Preload("Items.Product").
        Where("user_id = ?", userID).
        Order("created_at DESC").
        Find(&orders).Error
    
    return orders, err
}
```

---

## 5. Service Layer

**internal/service/wallet_service.go:**
```go
package service

import (
    "context"
    "fmt"

    "gorm-transactions-go/internal/repository"
)

type WalletService struct {
    walletRepo *repository.WalletRepository
}

func NewWalletService(walletRepo *repository.WalletRepository) *WalletService {
    return &WalletService{walletRepo: walletRepo}
}

// Transfer transfers balance between users
func (s *WalletService) Transfer(ctx context.Context, fromUserID, toUserID uint, amount float64) error {
    // Validation
    if amount <= 0 {
        return fmt.Errorf("amount must be positive")
    }

    if fromUserID == toUserID {
        return fmt.Errorf("cannot transfer to same user")
    }

    // Execute transfer (in transaction)
    return s.walletRepo.Transfer(ctx, fromUserID, toUserID, amount)
}

// GetBalance gets user wallet balance
func (s *WalletService) GetBalance(ctx context.Context, userID uint) (float64, error) {
    wallet, err := s.walletRepo.FindByUserID(ctx, userID)
    if err != nil {
        return 0, err
    }
    if wallet == nil {
        return 0, fmt.Errorf("wallet not found")
    }
    return wallet.Balance, nil
}
```

**internal/service/order_service.go:**
```go
package service

import (
    "context"
    "fmt"

    "gorm-transactions-go/internal/model"
    "gorm-transactions-go/internal/repository"

    "gorm.io/gorm"
)

type OrderService struct {
    db          *gorm.DB
    orderRepo   *repository.OrderRepository
    productRepo *repository.ProductRepository
    walletRepo  *repository.WalletRepository
}

func NewOrderService(
    db *gorm.DB,
    orderRepo *repository.OrderRepository,
    productRepo *repository.ProductRepository,
    walletRepo *repository.WalletRepository,
) *OrderService {
    return &OrderService{
        db:          db,
        orderRepo:   orderRepo,
        productRepo: productRepo,
        walletRepo:  walletRepo,
    }
}

type CreateOrderItem struct {
    ProductID uint `json:"product_id"`
    Quantity  int  `json:"quantity"`
}

// CreateOrder creates order with transaction
// Steps: 1. Check stock, 2. Deduct stock, 3. Create order, 4. Deduct wallet
func (s *OrderService) CreateOrder(ctx context.Context, userID uint, items []CreateOrderItem) (*model.Order, error) {
    var order *model.Order

    // Use transaction for atomic operations
    err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // Use repositories with transaction
        productRepo := s.productRepo.WithTx(tx)
        walletRepo := s.walletRepo.WithTx(tx)
        orderRepo := s.orderRepo.WithTx(tx)

        var totalPrice float64
        var orderItems []model.OrderItem

        // 1. Validate and calculate total
        for _, item := range items {
            // Get product with lock
            product, err := productRepo.FindByIDWithLock(ctx, item.ProductID)
            if err != nil {
                return err
            }
            if product == nil {
                return fmt.Errorf("product %d not found", item.ProductID)
            }

            // Check stock
            if product.Stock < item.Quantity {
                return fmt.Errorf("insufficient stock for product %s", product.Name)
            }

            // Calculate price
            itemPrice := product.Price * float64(item.Quantity)
            totalPrice += itemPrice

            // Prepare order item
            orderItems = append(orderItems, model.OrderItem{
                ProductID: product.ID,
                Quantity:  item.Quantity,
                Price:     itemPrice,
            })

            // Decrement stock
            product.Stock -= item.Quantity
            if err := tx.Save(product).Error; err != nil {
                return err
            }
        }

        // 2. Check wallet balance
        wallet, err := walletRepo.FindByUserIDWithLock(ctx, userID)
        if err != nil {
            return err
        }
        if wallet == nil {
            return fmt.Errorf("wallet not found")
        }

        if wallet.Balance < totalPrice {
            return fmt.Errorf("insufficient balance: need %.2f, have %.2f", totalPrice, wallet.Balance)
        }

        // 3. Create order
        order = &model.Order{
            UserID:     userID,
            TotalPrice: totalPrice,
            Status:     "COMPLETED",
            Items:      orderItems,
        }

        if err := orderRepo.Create(ctx, order); err != nil {
            return err
        }

        // 4. Deduct wallet balance
        wallet.Balance -= totalPrice
        if err := tx.Save(wallet).Error; err != nil {
            return err
        }

        // 5. Create wallet transaction history
        walletTx := &model.WalletTransaction{
            WalletID:      wallet.ID,
            Type:          "DEBIT",
            Amount:        totalPrice,
            BalanceBefore: wallet.Balance + totalPrice,
            BalanceAfter:  wallet.Balance,
            Description:   fmt.Sprintf("Payment for order #%d", order.ID),
        }
        if err := tx.Create(walletTx).Error; err != nil {
            return err
        }

        return nil // Commit transaction
    })

    if err != nil {
        return nil, err
    }

    return order, nil
}

// GetOrder gets order by ID
func (s *OrderService) GetOrder(ctx context.Context, orderID uint) (*model.Order, error) {
    return s.orderRepo.FindByID(ctx, orderID)
}

// GetUserOrders gets all orders for user
func (s *OrderService) GetUserOrders(ctx context.Context, userID uint) ([]model.Order, error) {
    return s.orderRepo.FindByUserID(ctx, userID)
}
```

**internal/service/user_service.go:**
```go
package service

import (
    "context"
    "fmt"

    "gorm-transactions-go/internal/model"
    "gorm-transactions-go/internal/repository"
)

type UserService struct {
    userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
    return &UserService{userRepo: userRepo}
}

// CreateUser creates user with wallet
func (s *UserService) CreateUser(ctx context.Context, name, email string, initialBalance float64) (*model.User, error) {
    // Check if email exists
    existing, err := s.userRepo.FindByEmail(ctx, email)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, fmt.Errorf("email already exists")
    }

    // Create user with wallet (in transaction)
    user := &model.User{
        Name:  name,
        Email: email,
    }

    if err := s.userRepo.CreateWithWallet(ctx, user, initialBalance); err != nil {
        return nil, err
    }

    return user, nil
}

// GetUser gets user by ID
func (s *UserService) GetUser(ctx context.Context, id uint) (*model.User, error) {
    return s.userRepo.FindByIDWithWallet(ctx, id)
}

// SoftDelete soft deletes user
func (s *UserService) SoftDelete(ctx context.Context, id uint) error {
    return s.userRepo.SoftDelete(ctx, id)
}

// Restore restores soft deleted user
func (s *UserService) Restore(ctx context.Context, id uint) error {
    return s.userRepo.Restore(ctx, id)
}

// GetAllUsers gets all users
func (s *UserService) GetAllUsers(ctx context.Context, includeDeleted bool) ([]model.User, error) {
    if includeDeleted {
        return s.userRepo.FindAllIncludingDeleted(ctx)
    }
    return s.userRepo.FindAll(ctx)
}

// HardDelete permanently deletes user
func (s *UserService) HardDelete(ctx context.Context, id uint) error {
    return s.userRepo.HardDelete(ctx, id)
}
```

---

## 6. Handlers

**pkg/response/response.go:**
```go
package response

import "github.com/gofiber/fiber/v2"

type Response struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

func Success(c *fiber.Ctx, data interface{}, message string) error {
    return c.JSON(Response{
        Success: true,
        Message: message,
        Data:    data,
    })
}

func Error(c *fiber.Ctx, statusCode int, message string) error {
    return c.Status(statusCode).JSON(Response{
        Success: false,
        Error:   message,
    })
}
```

**internal/handler/user_handler.go:**
```go
package handler

import (
    "gorm-transactions-go/internal/service"
    "gorm-transactions-go/pkg/response"

    "github.com/gofiber/fiber/v2"
)

type UserHandler struct {
    userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

// CreateUser creates a new user
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
    type Request struct {
        Name           string  `json:"name"`
        Email          string  `json:"email"`
        InitialBalance float64 `json:"initial_balance"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return response.Error(c, 400, "Invalid request body")
    }

    user, err := h.userService.CreateUser(c.Context(), req.Name, req.Email, req.InitialBalance)
    if err != nil {
        return response.Error(c, 400, err.Error())
    }

    return response.Success(c, user, "User created successfully")
}

// GetUser gets user by ID
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    user, err := h.userService.GetUser(c.Context(), uint(id))
    if err != nil {
        return response.Error(c, 500, err.Error())
    }
    if user == nil {
        return response.Error(c, 404, "User not found")
    }

    return response.Success(c, user, "")
}

// GetAllUsers gets all users
func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
    includeDeleted := c.QueryBool("include_deleted", false)

    users, err := h.userService.GetAllUsers(c.Context(), includeDeleted)
    if err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, users, "")
}

// SoftDelete soft deletes user
func (h *UserHandler) SoftDelete(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    if err := h.userService.SoftDelete(c.Context(), uint(id)); err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, nil, "User soft deleted successfully")
}

// Restore restores soft deleted user
func (h *UserHandler) Restore(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    if err := h.userService.Restore(c.Context(), uint(id)); err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, nil, "User restored successfully")
}

// HardDelete permanently deletes user
func (h *UserHandler) HardDelete(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    if err := h.userService.HardDelete(c.Context(), uint(id)); err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, nil, "User permanently deleted")
}
```

**internal/handler/wallet_handler.go:**
```go
package handler

import (
    "gorm-transactions-go/internal/service"
    "gorm-transactions-go/pkg/response"

    "github.com/gofiber/fiber/v2"
)

type WalletHandler struct {
    walletService *service.WalletService
}

func NewWalletHandler(walletService *service.WalletService) *WalletHandler {
    return &WalletHandler{walletService: walletService}
}

// Transfer transfers balance between users
func (h *WalletHandler) Transfer(c *fiber.Ctx) error {
    type Request struct {
        FromUserID uint    `json:"from_user_id"`
        ToUserID   uint    `json:"to_user_id"`
        Amount     float64 `json:"amount"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return response.Error(c, 400, "Invalid request body")
    }

    if err := h.walletService.Transfer(c.Context(), req.FromUserID, req.ToUserID, req.Amount); err != nil {
        return response.Error(c, 400, err.Error())
    }

    return response.Success(c, nil, "Transfer successful")
}

// GetBalance gets wallet balance
func (h *WalletHandler) GetBalance(c *fiber.Ctx) error {
    userID, err := c.ParamsInt("user_id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    balance, err := h.walletService.GetBalance(c.Context(), uint(userID))
    if err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, fiber.Map{
        "balance": balance,
    }, "")
}
```

**internal/handler/order_handler.go:**
```go
package handler

import (
    "gorm-transactions-go/internal/service"
    "gorm-transactions-go/pkg/response"

    "github.com/gofiber/fiber/v2"
)

type OrderHandler struct {
    orderService *service.OrderService
}

func NewOrderHandler(orderService *service.OrderService) *OrderHandler {
    return &OrderHandler{orderService: orderService}
}

// CreateOrder creates a new order
func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
    type Request struct {
        UserID uint                         `json:"user_id"`
        Items  []service.CreateOrderItem    `json:"items"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return response.Error(c, 400, "Invalid request body")
    }

    order, err := h.orderService.CreateOrder(c.Context(), req.UserID, req.Items)
    if err != nil {
        return response.Error(c, 400, err.Error())
    }

    return response.Success(c, order, "Order created successfully")
}

// GetOrder gets order by ID
func (h *OrderHandler) GetOrder(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return response.Error(c, 400, "Invalid order ID")
    }

    order, err := h.orderService.GetOrder(c.Context(), uint(id))
    if err != nil {
        return response.Error(c, 500, err.Error())
    }
    if order == nil {
        return response.Error(c, 404, "Order not found")
    }

    return response.Success(c, order, "")
}

// GetUserOrders gets all orders for user
func (h *OrderHandler) GetUserOrders(c *fiber.Ctx) error {
    userID, err := c.ParamsInt("user_id")
    if err != nil {
        return response.Error(c, 400, "Invalid user ID")
    }

    orders, err := h.orderService.GetUserOrders(c.Context(), uint(userID))
    if err != nil {
        return response.Error(c, 500, err.Error())
    }

    return response.Success(c, orders, "")
}
```

---

## 7. Main Application

**cmd/api/main.go:**
```go
package main

import (
    "log"

    "gorm-transactions-go/internal/config"
    "gorm-transactions-go/internal/database"
    "gorm-transactions-go/internal/handler"
    "gorm-transactions-go/internal/repository"
    "gorm-transactions-go/internal/service"

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

    // Connect to database
    db, err := database.NewDatabase(cfg)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Run migrations
    if err := database.Migrate(db); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Seed data
    if err := database.SeedData(db); err != nil {
        log.Fatal("Failed to seed data:", err)
    }

    // Initialize repositories
    userRepo := repository.NewUserRepository(db)
    walletRepo := repository.NewWalletRepository(db)
    productRepo := repository.NewProductRepository(db)
    orderRepo := repository.NewOrderRepository(db)

    // Initialize services
    userService := service.NewUserService(userRepo)
    walletService := service.NewWalletService(walletRepo)
    orderService := service.NewOrderService(db, orderRepo, productRepo, walletRepo)

    // Initialize handlers
    userHandler := handler.NewUserHandler(userService)
    walletHandler := handler.NewWalletHandler(walletService)
    orderHandler := handler.NewOrderHandler(orderService)

    // Create Fiber app
    app := fiber.New(fiber.Config{
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            code := fiber.StatusInternalServerError
            if e, ok := err.(*fiber.Error); ok {
                code = e.Code
            }
            return c.Status(code).JSON(fiber.Map{
                "success": false,
                "error":   err.Error(),
            })
        },
    })

    // Middleware
    app.Use(recover.New())
    app.Use(logger.New())

    // Routes
    api := app.Group("/api")

    // User routes
    users := api.Group("/users")
    {
        users.Post("/", userHandler.CreateUser)
        users.Get("/", userHandler.GetAllUsers)
        users.Get("/:id", userHandler.GetUser)
        users.Delete("/:id", userHandler.SoftDelete)
        users.Post("/:id/restore", userHandler.Restore)
        users.Delete("/:id/hard", userHandler.HardDelete)
    }

    // Wallet routes
    wallets := api.Group("/wallets")
    {
        wallets.Post("/transfer", walletHandler.Transfer)
        wallets.Get("/:user_id/balance", walletHandler.GetBalance)
    }

    // Order routes
    orders := api.Group("/orders")
    {
        orders.Post("/", orderHandler.CreateOrder)
        orders.Get("/:id", orderHandler.GetOrder)
        orders.Get("/user/:user_id", orderHandler.GetUserOrders)
    }

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "ok",
        })
    })

    // Start server
    port := cfg.Server.Port
    log.Printf("🚀 Server running on port %s\n", port)
    log.Fatal(app.Listen(":" + port))
}
```

---

## 8. Makefile

**Makefile:**
```makefile
.PHONY: help run docker-up docker-down migrate seed test

help:
	@echo "Available commands:"
	@echo "  make docker-up   - Start Docker services"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make run         - Run API server"
	@echo "  make test        - Run tests"

docker-up:
	docker-compose up -d
	@echo "✅ PostgreSQL started"

docker-down:
	docker-compose down
	@echo "✅ Services stopped"

run:
	go run cmd/api/main.go

test:
	go test -v ./...

clean:
	docker-compose down -v
	@echo "✅ All data cleaned"
```

---

## Testing

### 1. Start Services
```bash
# Start PostgreSQL
make docker-up

# Run application
make run
```

### 2. Test User Creation (with Transaction)
```bash
# Create user with wallet
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "initial_balance": 1000000
  }'

# Response:
# {
#   "success": true,
#   "message": "User created successfully",
#   "data": {
#     "id": 1,
#     "name": "Alice",
#     "email": "alice@example.com",
#     "wallet": {
#       "id": 1,
#       "user_id": 1,
#       "balance": 1000000
#     }
#   }
# }

# Create another user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "email": "bob@example.com",
    "initial_balance": 500000
  }'
```

### 3. Test Wallet Transfer (with Transaction & Lock)
```bash
# Transfer from Alice (user 1) to Bob (user 2)
curl -X POST http://localhost:3000/api/wallets/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "from_user_id": 1,
    "to_user_id": 2,
    "amount": 100000
  }'

# Response:
# {
#   "success": true,
#   "message": "Transfer successful"
# }

# Check balance
curl http://localhost:3000/api/wallets/1/balance
# {"success":true,"data":{"balance":900000}}

curl http://localhost:3000/api/wallets/2/balance
# {"success":true,"data":{"balance":600000}}
```

### 4. Test Order Creation (Complex Transaction)
```bash
# Create order (will deduct stock and wallet balance)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "items": [
      {"product_id": 1, "quantity": 1},
      {"product_id": 2, "quantity": 2}
    ]
  }'

# Response:
# {
#   "success": true,
#   "message": "Order created successfully",
#   "data": {
#     "id": 1,
#     "user_id": 1,
#     "total_price": 15300000,
#     "status": "COMPLETED",
#     "items": [...]
#   }
# }

# Check user orders
curl http://localhost:3000/api/orders/user/1
```

### 5. Test Soft Delete
```bash
# Soft delete user
curl -X DELETE http://localhost:3000/api/users/1

# Try to get user (will return 404)
curl http://localhost:3000/api/users/1

# Get all users (will exclude deleted)
curl http://localhost:3000/api/users

# Get all users including deleted
curl "http://localhost:3000/api/users?include_deleted=true"

# Restore user
curl -X POST http://localhost:3000/api/users/1/restore

# Now can get user again
curl http://localhost:3000/api/users/1
```

### 6. Test Hard Delete
```bash
# Hard delete (permanent)
curl -X DELETE http://localhost:3000/api/users/1/hard

# User is gone forever, even with include_deleted=true
curl "http://localhost:3000/api/users?include_deleted=true"
```

### 7. Test Transaction Rollback
```bash
# Try to create order with insufficient balance
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "items": [
      {"product_id": 1, "quantity": 100}
    ]
  }'

# Response:
# {
#   "success": false,
#   "error": "insufficient balance: need 1500000000, have 600000"
# }

# Check stock is NOT decremented (rollback worked)
# Check balance is NOT changed (rollback worked)
```

### 8. Monitor SQL Queries
```bash
# View PostgreSQL logs to see actual SQL
docker-compose logs -f postgres

# You'll see:
# - BEGIN transaction
# - SELECT ... FOR UPDATE (lock)
# - UPDATE ...
# - COMMIT
# - Or ROLLBACK on error
```

---

## ❌ Common Mistakes + Fix

### 1. Tidak pakai transaction untuk operasi multi-table
**Masalah:**
```go
// ❌ BAHAYA: Kalau Create wallet gagal, user tetap tercreate
db.Create(&user)
db.Create(&wallet) // Error disini, tapi user sudah masuk DB
```

**Solusi:**
```go
// ✅ AMAN: Pakai transaction, auto rollback kalau error
db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&user).Error; err != nil {
        return err // Rollback
    }
    if err := tx.Create(&wallet).Error; err != nil {
        return err // Rollback
    }
    return nil // Commit
})
```

---

### 2. Tidak pakai lock saat update stock/balance (race condition)
**Masalah:**
```go
// ❌ BAHAYA: Race condition, 2 request bersamaan bisa decrement 2x
product.Stock -= quantity
db.Save(&product)
// Stock bisa jadi negatif kalau concurrent requests!
```

**Solusi:**
```go
// ✅ AMAN: Lock row dengan FOR UPDATE
db.Transaction(func(tx *gorm.DB) error {
    var product Product
    tx.Set("gorm:query_option", "FOR UPDATE").First(&product, id)
    
    if product.Stock < quantity {
        return errors.New("insufficient stock")
    }
    
    product.Stock -= quantity
    return tx.Save(&product).Error
})
```

---

### 3. Tidak pakai context untuk timeout
**Masalah:**
```go
// ❌ BAHAYA: Query bisa hang forever
db.Find(&users)
```

**Solusi:**
```go
// ✅ AMAN: Pakai context dengan timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

db.WithContext(ctx).Find(&users)
// Query akan di-cancel setelah 5 detik
```

---

### 4. Lupa Unscoped() saat hard delete
**Masalah:**
```go
// ❌ SALAH: Ini masih soft delete, bukan hard delete
db.Delete(&user, id) // Hanya set deleted_at
```

**Solusi:**
```go
// ✅ AMAN: Pakai Unscoped() untuk hard delete
db.Unscoped().Delete(&user, id) // Delete beneran dari DB
```

---

### 5. Tidak check error dari Transaction()
**Masalah:**
```go
// ❌ BAHAYA: Silent error, user tidak tahu transaction gagal
db.Transaction(func(tx *gorm.DB) error {
    tx.Create(&user)
    return nil
}) // Error diabaikan
```

**Solusi:**
```go
// ✅ AMAN: Check error
err := db.Transaction(func(tx *gorm.DB) error {
    return tx.Create(&user).Error
})
if err != nil {
    return fmt.Errorf("transaction failed: %w", err)
}
```

---

### 6. Soft delete cascade tidak otomatis
**Masalah:**
```go
// ❌ MASALAH: Soft delete user, tapi wallet masih muncul
db.Delete(&user, id) // User soft deleted
db.Find(&wallets)    // Wallet user masih muncul!
```

**Solusi:**
```go
// ✅ AMAN: Manual soft delete relasi atau pakai custom logic
db.Transaction(func(tx *gorm.DB) error {
    // Soft delete user
    if err := tx.Delete(&user, id).Error; err != nil {
        return err
    }
    // Soft delete wallet
    if err := tx.Where("user_id = ?", id).Delete(&Wallet{}).Error; err != nil {
        return err
    }
    return nil
})
```

---

### 7. Query soft deleted tanpa Unscoped()
**Masalah:**
```go
// ❌ SALAH: Tidak kelihatan soft deleted records
db.Find(&users) // Hanya yang deleted_at = NULL
```

**Solusi:**
```go
// ✅ AMAN: Pakai Unscoped() untuk include soft deleted
db.Unscoped().Find(&users) // Include semua, termasuk deleted
```

---

### 8. Index tidak ada WHERE deleted_at IS NULL
**Masalah:**
```go
// ❌ LAMBAT: Index dipakai untuk semua record termasuk deleted
CREATE UNIQUE INDEX idx_users_email ON users(email);
// Query yang filter deleted masih scan deleted records
```

**Solusi:**
```go
// ✅ CEPAT: Partial index
CREATE UNIQUE INDEX idx_users_email_not_deleted 
ON users(email) 
WHERE deleted_at IS NULL;
// Hanya index record yang belum deleted
```

---

## 💭 Ide Pengembangan Mandiri

### 1. Soft delete dengan reason & deleted_by
```go
type BaseModelExtended struct {
    ID              uint
    DeletedAt       *time.Time
    DeletedBy       *uint   // User ID yang delete
    DeletedReason   string  // Alasan delete
}

func SoftDeleteWithReason(db *gorm.DB, userID uint, reason string) error {
    return db.Model(&User{}).Updates(map[string]interface{}{
        "deleted_at":     time.Now(),
        "deleted_by":     userID,
        "deleted_reason": reason,
    }).Error
}
```

---

### 2. Audit trail untuk semua perubahan
```go
type AuditLog struct {
    ID        uint
    TableName string
    RecordID  uint
    Action    string // CREATE, UPDATE, DELETE
    OldValue  string // JSON
    NewValue  string // JSON
    UserID    uint
    CreatedAt time.Time
}

// GORM hook
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    // Save old value to audit log
    auditLog := AuditLog{
        TableName: "users",
        RecordID:  u.ID,
        Action:    "UPDATE",
        OldValue:  serializeOldValue(u),
        NewValue:  serializeNewValue(u),
    }
    return tx.Create(&auditLog).Error
}
```

---

### 3. Bulk soft delete dengan batch
```go
func BulkSoftDelete(db *gorm.DB, ids []uint) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Batch delete in chunks of 1000
        for i := 0; i < len(ids); i += 1000 {
            end := i + 1000
            if end > len(ids) {
                end = len(ids)
            }
            
            batch := ids[i:end]
            if err := tx.Where("id IN ?", batch).Delete(&User{}).Error; err != nil {
                return err
            }
        }
        return nil
    })
}
```

---

### 4. Automatic restore expired soft deletes
```go
// Cron job to restore soft deletes after 30 days
func AutoRestore(db *gorm.DB) error {
    thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
    
    return db.Model(&User{}).
        Unscoped().
        Where("deleted_at < ?", thirtyDaysAgo).
        Update("deleted_at", nil).Error
}
```

---

### 5. Transaction retry dengan exponential backoff
```go
func RetryTransaction(db *gorm.DB, fn func(*gorm.DB) error) error {
    maxRetries := 3
    backoff := time.Millisecond * 100
    
    for i := 0; i < maxRetries; i++ {
        err := db.Transaction(fn)
        if err == nil {
            return nil // Success
        }
        
        // Check if error is retryable (deadlock, timeout, etc.)
        if !isRetryable(err) {
            return err
        }
        
        time.Sleep(backoff)
        backoff *= 2 // Exponential backoff
    }
    
    return fmt.Errorf("max retries exceeded")
}
```

---

### 6. Nested transaction dengan savepoint
```go
func NestedTransaction(db *gorm.DB) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Outer transaction
        if err := tx.Create(&user).Error; err != nil {
            return err
        }
        
        // Nested transaction (savepoint)
        if err := tx.Transaction(func(tx2 *gorm.DB) error {
            // Inner transaction
            return tx2.Create(&wallet).Error
        }); err != nil {
            // Inner rollback, outer continues
            log.Println("Wallet creation failed, but user created")
        }
        
        return nil
    })
}
```

---

### 7. Read-only transaction untuk consistency
```go
func GetConsistentSnapshot(db *gorm.DB) ([]User, []Order, error) {
    var users []User
    var orders []Order
    
    err := db.Transaction(func(tx *gorm.DB) error {
        // All queries in same transaction = consistent snapshot
        if err := tx.Find(&users).Error; err != nil {
            return err
        }
        if err := tx.Find(&orders).Error; err != nil {
            return err
        }
        return nil
    }, &sql.TxOptions{ReadOnly: true})
    
    return users, orders, err
}
```

---

### 8. Soft delete dengan TTL (auto hard delete)
```go
type UserWithTTL struct {
    BaseModel
    DeletedAt       *time.Time
    HardDeleteAfter *time.Time // Auto hard delete setelah tanggal ini
}

// Cron job
func CleanupExpiredSoftDeletes(db *gorm.DB) error {
    return db.Unscoped().
        Where("deleted_at IS NOT NULL").
        Where("hard_delete_after < ?", time.Now()).
        Delete(&UserWithTTL{}).Error
}
```

---

### 9. Transaction logger untuk debugging
```go
func TransactionWithLogging(db *gorm.DB, name string, fn func(*gorm.DB) error) error {
    start := time.Now()
    log.Printf("🔵 Transaction started: %s", name)
    
    err := db.Transaction(fn)
    
    duration := time.Since(start)
    if err != nil {
        log.Printf("🔴 Transaction failed: %s (duration: %v, error: %v)", name, duration, err)
    } else {
        log.Printf("🟢 Transaction committed: %s (duration: %v)", name, duration)
    }
    
    return err
}
```

---

### 10. Distributed transaction dengan saga pattern
```go
// Saga pattern untuk distributed transactions
type Saga struct {
    steps []Step
}

type Step struct {
    Execute    func() error
    Compensate func() error
}

func (s *Saga) Execute() error {
    executed := []Step{}
    
    for _, step := range s.steps {
        if err := step.Execute(); err != nil {
            // Rollback dengan compensate
            s.rollback(executed)
            return err
        }
        executed = append(executed, step)
    }
    
    return nil
}

func (s *Saga) rollback(executed []Step) {
    for i := len(executed) - 1; i >= 0; i-- {
        executed[i].Compensate()
    }
}
```

---

## ✅ Checklist Akhir

**Setelah belajar ini, lo harus bisa:**

### Konsep
- [ ] Jelasin ACID properties dengan contoh real world
- [ ] Bedain kapan pakai transaction vs single operation
- [ ] Paham cara kerja row-level locking (FOR UPDATE)
- [ ] Jelasin perbedaan soft delete vs hard delete  
- [ ] Paham kenapa butuh partial index untuk soft delete

### Implementation  
- [ ]  Implement `db.Transaction()` dengan auto rollback on error
- [ ] Implement pessimistic locking untuk prevent race condition
- [ ] Implement wallet transfer dengan transaction
- [ ] Implement order processing dengan multi-table transaction
- [ ] Implement soft delete dengan `gorm.DeletedAt`
- [ ] Implement hard delete dengan `Unscoped()`
- [ ] Implement restore soft deleted record
- [ ] Pakai `WithContext` untuk semua query dengan timeout

### Production Readiness
- [ ]  Test rollback scenario (force error di tengah transaction)
- [ ] Test concurrent updates (2+ requests bersamaan)  
- [ ] Create partial index: `WHERE deleted_at IS NULL`
- [ ] Monitor transaction duration di logs
- [ ] Handle soft delete cascade manually  
- [ ] Create audit trail untuk critical operations

### Testing Commands
```bash
# Start project
make docker-up
make run

# Test create user + wallet (transaction)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","initial_balance":1000000}'

# Test wallet transfer (transaction + locking)
curl -X POST http://localhost:3000/api/wallets/transfer \
  -H "Content-Type: application/json" \
  -d '{"from_user_id":1,"to_user_id":2,"amount":50000}'

# Test create order (multi-table transaction)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "items": [
      {"product_id": 1, "quantity": 1},
      {"product_id": 2, "quantity": 2}
    ]
  }'

# Test soft delete
curl -X DELETE http://localhost:3000/api/users/1

# Test restore
curl -X POST http://localhost:3000/api/users/1/restore

# Test hard delete
curl -X DELETE http://localhost:3000/api/users/1/hard

# Monitor SQL queries
docker-compose logs -f postgres
```

**Key Points yang Harus Lo Inget:**

1. 🔒 **Transaction = All or Nothing** → Semua sukses atau semua rollback
2. 🔐 **Locking Matters** → Pakai `FOR UPDATE` untuk prevent race condition  
3. ⏱️ **Context is King** → Selalu pakai timeout untuk prevent hanging
4. 🗑️ **Soft Delete ≠ Hard Delete** → Soft cuma hide, hard hapus permanen
5. 📊 **Partial Index** → Create index `WHERE deleted_at IS NULL` untuk performance

**Rumus Gampang:**
- Multi-table operation? → **WAJIB pakai Transaction**
- Update balance/stock? → **WAJIB pakai Lock (FOR UPDATE)**  
- Long query? → **WAJIB pakai Context dengan timeout**
- Need audit trail? → **WAJIB pakai Soft Delete**

Happy transacting! 🔒💪
