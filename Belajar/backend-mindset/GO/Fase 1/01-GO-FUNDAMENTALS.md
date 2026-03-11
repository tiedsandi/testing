# Go Fundamentals untuk Backend Developer

## 🎯 Tujuan Belajar

Setelah belajar materi ini, lo bakal:
- Paham kenapa Go jadi pilihan utama buat backend (spoiler: cepat, simple, concurrency-nya mantap)
- Bisa bedain mindset Go vs JavaScript/TypeScript yang udah lo kuasai
- Install & setup Go environment di Linux dengan benar
- Nguasain syntax dasar Go yang paling sering dipake di backend
- Ngerti konsep pointer, struct, interface, goroutine, channel
- Bisa bikin kode Go yang clean & readable sesuai best practice

## 💡 Konsep + Analogi

### Kenapa Go Populer untuk Backend?

**1. Performance** 🚀
- **Go**: Compiled ke binary machine code → eksekusi langsung di CPU
- **JavaScript/Python**: Interpreted → perlu runtime (Node.js/Python interpreter)
- **Analogi**: Go kayak makanan yang udah matang siap makan, JS/Python masih mentah harus dimasak dulu waktu run

**2. Concurrency** 🔀
- **Go**: Punya goroutine (lightweight thread) & channel buat komunikasi antar goroutine
- **JavaScript**: Punya async/await tapi masih single-threaded (event loop)
- **Python**: GIL (Global Interpreter Lock) bikin true parallelism susah
- **Analogi**: 
  - JS async: 1 chef masak banyak masakan tapi bolak-balik (context switching)
  - Go goroutine: Banyak chef masak paralel, komunikasi via channel (kayak walkie-talkie)

**3. Simplicity** 💎
- **Go**: Cuma 25 keywords, no class, no inheritance, no generics (sekarang ada tapi terbatas)
- **JavaScript**: Banyak cara buat hal yang sama (class, prototype, function constructor, etc)
- **Analogi**: Go kayak Indomie (simple, jelas langkahnya), JS kayak resep chef gourmet (banyak cara, bisa kompleks)

### Perbedaan Fundamental

| Aspek | JavaScript/TypeScript | Go |
|-------|----------------------|-----|
| **Typing** | Dynamic (JS) / Static optional (TS) | Static wajib, compile-time check |
| **Compilation** | JIT compiled / Transpiled | AOT compiled ke binary |
| **OOP** | Class-based (TS), Prototype (JS) | No class, pakai struct + interface |
| **Error Handling** | try/catch exception | Error as value (if err != nil) |
| **Null** | null, undefined | nil |
| **Package Manager** | npm, yarn, pnpm | Go modules (built-in) |
| **Runtime** | Perlu Node.js | Binary standalone, no runtime |

## 📝 Materi + Kode Lengkap

### 1. Install Go di Linux

```bash
# Download Go (sesuaikan versi terbaru)
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz

# Extract ke /usr/local
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz

# Tambahkan ke PATH (edit ~/.bashrc atau ~/.zshrc)
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export GOPATH=$HOME/go' >> ~/.bashrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc

# Reload shell
source ~/.bashrc

# Verify installation
go version
```

**GOPATH vs Go Modules**:
- **GOPATH** (cara lama): Semua project harus di `$GOPATH/src`, ribet
- **Go Modules** (cara baru, sejak Go 1.11): Project bisa di mana aja, punya `go.mod` sendiri
- **Analogi**: GOPATH kayak semua project Next.js lo harus 1 folder, Go Modules kayak tiap project punya `package.json` sendiri

### 2. Setup Project Pertama

```bash
# Bikin folder project (bisa di mana aja)
mkdir go-fundamental-practice
cd go-fundamental-practice

# Init Go module (mirip npm init)
go mod init backend-mindset/go-practice

# go.mod akan dibuat otomatis
```

File `go.mod` yang dihasilkan:
```
module backend-mindset/go-practice

go 1.22
```

### 3. Variables

**JavaScript/TypeScript:**
```javascript
let name = "John";      // mutable
const age = 25;          // immutable
var old = "legacy";      // legacy, avoid
```

**Go:**

```go
// examples/01-variables.go
package main

import "fmt"

func main() {
	// Cara 1: var dengan type explicit
	var name string = "John"
	var age int = 25
	
	// Cara 2: var dengan type inference
	var city = "Jakarta" // Go otomatis tau ini string
	
	// Cara 3: Short declaration := (paling sering dipake)
	country := "Indonesia" // otomatis string
	score := 95.5          // otomatis float64
	
	// Const (immutable)
	const apiKey = "secret-key-123"
	const maxRetries = 3
	
	// Multiple declaration
	var (
		firstName string = "Budi"
		lastName  string = "Santoso"
		salary    int    = 10000000
	)
	
	// Multiple assignment (mirip destructure di JS)
	x, y := 10, 20
	
	fmt.Println(name, age, city, country, score)
	fmt.Println(apiKey, maxRetries)
	fmt.Println(firstName, lastName, salary)
	fmt.Println(x, y)
}
```

**Perbedaan penting:**
- `:=` hanya bisa di dalam function, tidak bisa di package level
- `var` bisa di package level (global variable)
- `const` di Go lebih strict, harus compile-time constant

### 4. Types & Zero Values

**Zero Values** (konsep yang ga ada di JS):
Di Go, setiap variable punya default value kalau ga di-assign:

```go
// examples/02-types-zero-values.go
package main

import "fmt"

func main() {
	// Zero values
	var s string  // "" (empty string)
	var i int     // 0
	var f float64 // 0.0
	var b bool    // false
	var p *int    // nil (pointer)
	
	fmt.Printf("string: '%s'\n", s)
	fmt.Printf("int: %d\n", i)
	fmt.Printf("float64: %f\n", f)
	fmt.Printf("bool: %v\n", b)
	fmt.Printf("pointer: %v\n", p)
	
	// Common types
	var name string = "Agus"
	var age int = 30
	var height float64 = 175.5
	var isActive bool = true
	
	// Specific int types (beda dari JS yang cuma number)
	var smallNum int8 = 127        // -128 to 127
	var mediumNum int16 = 32767    // -32768 to 32767
	var bigNum int64 = 9223372036854775807
	var unsigned uint = 4294967295 // unsigned (ga bisa negatif)
	
	// byte adalah alias untuk uint8 (sering buat data binary)
	var b1 byte = 255
	
	// rune adalah alias untuk int32 (sering buat Unicode character)
	var r rune = '🚀' // emoji/unicode
	
	fmt.Println(name, age, height, isActive)
	fmt.Println(smallNum, mediumNum, bigNum, unsigned)
	fmt.Println(b1, r)
	
	// Type conversion (explicit, ga ada automatic coercion kayak JS)
	var intVal int = 42
	var floatVal float64 = float64(intVal) // harus explicit cast
	var stringVal string = fmt.Sprintf("%d", intVal)
	
	fmt.Printf("int: %d, float: %f, string: %s\n", intVal, floatVal, stringVal)
}
```

**Analogi Zero Values:**
- **JS**: Variable ga di-assign → `undefined`
- **Go**: Variable ga di-assign → zero value type-nya (string = "", int = 0, bool = false)

### 5. Functions

Go functions punya fitur unik yang ga ada di JS biasa:

```go
// examples/03-functions.go
package main

import (
	"fmt"
	"errors"
)

// Basic function (mirip JS)
func greet(name string) string {
	return "Hello, " + name
}

// Multiple parameters same type (shorthand)
func add(a, b int) int {
	return a + b
}

// Multiple return values (PENTING! sering dipake buat error handling)
func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

// Named return values (bisa langsung return tanpa specify)
func getUser() (name string, age int) {
	name = "Budi" // langsung assign ke return variable
	age = 25
	return // naked return (ga perlu tulis name, age)
}

// Variadic function (mirip rest parameter di JS: ...args)
func sum(numbers ...int) int {
	total := 0
	for _, num := range numbers {
		total += num
	}
	return total
}

// Function as parameter (higher-order function)
func applyOperation(a, b int, op func(int, int) int) int {
	return op(a, b)
}

// Closure (sama kayak JS)
func counter() func() int {
	count := 0
	return func() int {
		count++
		return count
	}
}

func main() {
	// Basic call
	fmt.Println(greet("Agus"))
	
	// Multiple return values
	result, err := divide(10, 2)
	if err != nil {
		fmt.Println("Error:", err)
	} else {
		fmt.Println("Result:", result)
	}
	
	// Handle error case
	_, err2 := divide(10, 0)
	if err2 != nil {
		fmt.Println("Error:", err2)
	}
	
	// Named return
	name, age := getUser()
	fmt.Println(name, age)
	
	// Variadic
	fmt.Println(sum(1, 2, 3, 4, 5))
	
	// Higher-order function
	multiply := func(a, b int) int { return a * b }
	fmt.Println(applyOperation(5, 3, multiply))
	
	// Closure
	increment := counter()
	fmt.Println(increment()) // 1
	fmt.Println(increment()) // 2
	fmt.Println(increment()) // 3
}
```

**Analogi Multiple Return:**
- **JS** (biasanya): Return object `{ result, error }` atau throw exception
- **Go**: Return tuple `(result, error)` → explicit error handling

### 6. Error Handling Pattern

**JavaScript (try/catch):**
```javascript
try {
  const data = await fetchUser(id);
  console.log(data);
} catch (error) {
  console.error(error);
}
```

**Go (if err != nil):**

```go
// examples/04-error-handling.go
package main

import (
	"fmt"
	"errors"
)

func fetchUser(id int) (string, error) {
	if id <= 0 {
		return "", errors.New("invalid user ID")
	}
	
	// Simulate success
	return fmt.Sprintf("User-%d", id), nil
}

func getUserAge(id int) (int, error) {
	if id == 0 {
		return 0, fmt.Errorf("user not found: id %d", id)
	}
	return 25, nil
}

// Error wrapping (Go 1.13+)
func processUser(id int) error {
	_, err := fetchUser(id)
	if err != nil {
		return fmt.Errorf("processUser failed: %w", err) // %w for wrapping
	}
	return nil
}

func main() {
	// Pattern 1: Check immediately
	user, err := fetchUser(1)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("User:", user)
	
	// Pattern 2: Early return on error
	if age, err := getUserAge(1); err != nil {
		fmt.Println("Error:", err)
	} else {
		fmt.Println("Age:", age)
	}
	
	// Pattern 3: Ignore error (hati-hati, hanya kalau yakin ga penting)
	user2, _ := fetchUser(2) // underscore = ignore error
	fmt.Println("User2:", user2)
	
	// Error wrapping
	if err := processUser(-1); err != nil {
		fmt.Println("Wrapped error:", err)
		// Output: Wrapped error: processUser failed: invalid user ID
	}
}
```

**Kenapa ga pakai try/catch?**
- Go philosophy: "Errors are values, not exceptions"
- Lebih explicit, ga ada silent failure
- Performa lebih baik (no stack unwinding overhead)

### 7. Pointers

**Konsep paling asing buat JS developer!**

**JavaScript:**
```javascript
// JS pass by reference untuk object
let obj = { name: "Budi" };
function change(o) {
  o.name = "Agus"; // object dimutate
}
change(obj);
console.log(obj.name); // "Agus"
```

**Go:**

```go
// examples/05-pointers.go
package main

import "fmt"

// Struct untuk contoh
type Person struct {
	Name string
	Age  int
}

// Pass by value (copy seluruh struct)
func updateAgeByValue(p Person, newAge int) {
	p.Age = newAge // ini cuma mutate copy, bukan original
}

// Pass by pointer (pass address, bisa mutate original)
func updateAgeByPointer(p *Person, newAge int) {
	p.Age = newAge // ini mutate original
}

func main() {
	// & = address-of operator (ambil memory address)
	// * = dereference operator (akses value di address)
	
	num := 42
	ptr := &num // ptr adalah pointer ke num
	
	fmt.Println("Value:", num)        // 42
	fmt.Println("Address:", ptr)      // 0xc0000... (memory address)
	fmt.Println("Value via ptr:", *ptr) // 42 (dereference)
	
	*ptr = 100 // mutate via pointer
	fmt.Println("New value:", num) // 100
	
	// Dengan struct
	person := Person{Name: "Budi", Age: 25}
	fmt.Println("Before:", person)
	
	updateAgeByValue(person, 30)
	fmt.Println("After value:", person) // Age masih 25 (ga berubah)
	
	updateAgeByPointer(&person, 30) // pass address dengan &
	fmt.Println("After pointer:", person) // Age jadi 30 (berubah)
	
	// Nil pointer
	var p *int
	fmt.Println("Nil pointer:", p) // <nil>
	// fmt.Println(*p) // PANIC! ga bisa dereference nil pointer
	
	// Kapan pakai pointer?
	// 1. Mau mutate value di function
	// 2. Struct besar (hindari copy overhead)
	// 3. Optional value (bisa nil)
}
```

**Analogi:**
- **Value**: Fotocopy dokumen → edit fotocopy ga ngefek ke aslinya
- **Pointer**: Kasih address rumah → orang bisa langsung ke rumah asli & ubah isinya

**Kapan pakai pointer:**
1. Mau mutate original value
2. Struct besar (save memory, hindari copy)
3. Butuh optional value (bisa nil)

### 8. Arrays vs Slices

**JavaScript hanya punya 1: Array (dynamic)**
```javascript
let arr = [1, 2, 3];
arr.push(4); // bisa nambah
```

**Go punya 2: Array (fixed) vs Slice (dynamic)**

```go
// examples/06-arrays-slices.go
package main

import "fmt"

func main() {
	// ===== ARRAY (Fixed Length) =====
	// Jarang dipake langsung, biasanya pakai slice
	
	var arr1 [3]int           // array 3 element, zero values
	arr2 := [3]int{1, 2, 3}   // array dengan initial values
	arr3 := [...]int{1, 2, 3, 4, 5} // ... = auto count length
	
	fmt.Println("Array:", arr1, arr2, arr3)
	fmt.Println("Length:", len(arr2))
	
	// Access element
	arr2[0] = 10
	fmt.Println("Modified:", arr2)
	
	// ===== SLICE (Dynamic Length) ===== 
	// INI YANG SERING DIPAKE! Mirip JS array
	
	// Cara 1: Literal
	slice1 := []int{1, 2, 3, 4, 5}
	
	// Cara 2: Make dengan capacity
	slice2 := make([]int, 3)      // length 3, capacity 3, zero values
	slice3 := make([]int, 3, 10)  // length 3, capacity 10
	
	fmt.Println("Slice1:", slice1)
	fmt.Println("Slice2:", slice2)
	fmt.Println("Slice3:", slice3, "len:", len(slice3), "cap:", cap(slice3))
	
	// Append (mirip JS push)
	slice1 = append(slice1, 6)
	slice1 = append(slice1, 7, 8, 9) // append multiple
	fmt.Println("After append:", slice1)
	
	// Slicing (ambil sub-array)
	sub := slice1[1:4]  // index 1 sampai 3 (exclude 4)
	fmt.Println("Sub slice:", sub)
	
	first3 := slice1[:3]   // dari awal sampai index 2
	last3 := slice1[len(slice1)-3:] // 3 element terakhir
	fmt.Println("First 3:", first3, "Last 3:", last3)
	
	// Copy slice
	copied := make([]int, len(slice1))
	copy(copied, slice1)
	fmt.Println("Copied:", copied)
	
	// Iterate
	for i, val := range slice1 {
		fmt.Printf("Index %d: %d\n", i, val)
	}
	
	// Iterate tanpa index
	for _, val := range slice1 {
		fmt.Println(val)
	}
	
	// Slice of struct
	type User struct {
		Name string
		Age  int
	}
	
	users := []User{
		{Name: "Budi", Age: 25},
		{Name: "Agus", Age: 30},
	}
	
	users = append(users, User{Name: "Siti", Age: 28})
	
	for _, user := range users {
		fmt.Printf("%s is %d years old\n", user.Name, user.Age)
	}
}
```

**Perbedaan Array vs Slice:**
- **Array**: Fixed size, value type (copy by value)
- **Slice**: Dynamic, reference type (underlying array), punya capacity

**Analogi:**
- **Array**: Meja dengan 5 kursi (fixed, ga bisa nambah kursi)
- **Slice**: Meja dengan kursi bisa nambah (flexible, mirip JS array)

### 9. Maps

**JavaScript/TypeScript:**
```javascript
const user = { name: "Budi", age: 25 };
const map = new Map([["key", "value"]]);
```

**Go:**

```go
// examples/07-maps.go
package main

import "fmt"

func main() {
	// Deklarasi map
	// map[KeyType]ValueType
	
	// Cara 1: Make
	ages := make(map[string]int)
	ages["Budi"] = 25
	ages["Agus"] = 30
	ages["Siti"] = 28
	
	// Cara 2: Literal
	scores := map[string]int{
		"Math":    90,
		"English": 85,
		"Science": 88,
	}
	
	fmt.Println("Ages:", ages)
	fmt.Println("Scores:", scores)
	
	// Access value
	mathScore := scores["Math"]
	fmt.Println("Math score:", mathScore)
	
	// Check if key exists (PENTING!)
	englishScore, exists := scores["English"]
	if exists {
		fmt.Println("English score:", englishScore)
	}
	
	// Key yang ga ada return zero value
	missing := scores["History"] // 0 (zero value untuk int)
	fmt.Println("Missing:", missing)
	
	// Check safely
	if history, ok := scores["History"]; ok {
		fmt.Println("History:", history)
	} else {
		fmt.Println("History not found")
	}
	
	// Delete key
	delete(scores, "Science")
	fmt.Println("After delete:", scores)
	
	// Length
	fmt.Println("Map length:", len(scores))
	
	// Iterate (order not guaranteed!)
	for subject, score := range scores {
		fmt.Printf("%s: %d\n", subject, score)
	}
	
	// Map of struct
	type User struct {
		Name  string
		Email string
	}
	
	users := map[int]User{
		1: {Name: "Budi", Email: "budi@example.com"},
		2: {Name: "Agus", Email: "agus@example.com"},
	}
	
	// Access
	user1 := users[1]
	fmt.Printf("User 1: %s (%s)\n", user1.Name, user1.Email)
	
	// Modify
	user2 := users[2]
	user2.Email = "newemail@example.com"
	users[2] = user2 // harus reassign ke map
	
	fmt.Println("Updated users:", users)
	
	// Map of slice
	grades := map[string][]int{
		"Budi": {90, 85, 88},
		"Agus": {75, 80, 82},
	}
	
	fmt.Println("Budi grades:", grades["Budi"])
}
```

**Perbedaan dengan JS object:**
- Go map hanya bisa key type yang comparable (string, int, bool, dll. Ga bisa slice/map)
- Iterate order ga guaranteed (JS object di ES6+ ada order)
- Harus check key exists dengan `, ok` pattern

### 10. Structs

**Struct = pengganti Class di Go**

**TypeScript:**
```typescript
class User {
  name: string;
  age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    console.log(`Hello, ${this.name}`);
  }
}
```

**Go:**

```go
// examples/08-structs.go
package main

import "fmt"

// Define struct (mirip TS interface/class)
type User struct {
	Name  string
	Email string
	Age   int
}

// Struct dengan tag (buat JSON marshal/unmarshal)
type Product struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price float64 `json:"price"`
}

// Embedding (composition, bukan inheritance)
type Person struct {
	Name string
	Age  int
}

type Employee struct {
	Person      // embedded (anonymous field)
	CompanyName string
	Salary      int
}

// Method dengan receiver (mirip class method)
func (u User) Greet() string {
	return "Hello, " + u.Name
}

// Method dengan pointer receiver (bisa mutate)
func (u *User) UpdateEmail(newEmail string) {
	u.Email = newEmail
}

// Constructor function (convention: New prefix)
func NewUser(name, email string, age int) *User {
	return &User{
		Name:  name,
		Email: email,
		Age:   age,
	}
}

// Constructor dengan validation
func NewEmployee(name string, age int, company string, salary int) (*Employee, error) {
	if age < 18 {
		return nil, fmt.Errorf("age must be at least 18")
	}
	
	return &Employee{
		Person:      Person{Name: name, Age: age},
		CompanyName: company,
		Salary:      salary,
	}, nil
}

func main() {
	// Cara 1: Struct literal
	user1 := User{
		Name:  "Budi",
		Email: "budi@example.com",
		Age:   25,
	}
	
	// Cara 2: Positional (ga recommended, fragile)
	user2 := User{"Agus", "agus@example.com", 30}
	
	// Cara 3: Constructor function (RECOMMENDED)
	user3 := NewUser("Siti", "siti@example.com", 28)
	
	fmt.Println(user1)
	fmt.Println(user2)
	fmt.Println(*user3)
	
	// Access fields
	fmt.Println("Name:", user1.Name)
	fmt.Println("Email:", user1.Email)
	
	// Call method
	fmt.Println(user1.Greet())
	
	// Update via pointer method
	user1.UpdateEmail("newemail@example.com")
	fmt.Println("Updated email:", user1.Email)
	
	// Embedding
	emp, err := NewEmployee("Bambang", 35, "TechCorp", 15000000)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	
	// Bisa akses embedded field langsung
	fmt.Println("Employee name:", emp.Name) // dari Person
	fmt.Println("Employee age:", emp.Age)   // dari Person
	fmt.Println("Company:", emp.CompanyName)
	fmt.Println("Salary:", emp.Salary)
	
	// Anonymous struct (buat one-off use)
	config := struct {
		Host string
		Port int
	}{
		Host: "localhost",
		Port: 8080,
	}
	
	fmt.Printf("Server: %s:%d\n", config.Host, config.Port)
	
	// Pointer to struct
	user4 := &User{Name: "Rina", Email: "rina@example.com", Age: 27}
	user4.Age = 28 // Go otomatis dereference, ga perlu (*user4).Age
	fmt.Println("User4:", user4)
}
```

**Method Receiver: Value vs Pointer**

```go
// Value receiver: receive copy
func (u User) GetName() string {
	return u.Name // read-only, aman
}

// Pointer receiver: receive reference
func (u *User) SetName(name string) {
	u.Name = name // bisa mutate
}
```

**Kapan pakai pointer receiver:**
1. Method mau mutate struct
2. Struct besar (hindari copy overhead)
3. Consistency (kalau ada 1 method pointer, biasanya semua pointer)

### 11. Interfaces

**Interface di Go = implicit implementation (beda dari TS!)**

**TypeScript:**
```typescript
interface Speaker {
  speak(): void;
}

class Dog implements Speaker { // explicit implements
  speak() {
    console.log("Woof!");
  }
}
```

**Go:**

```go
// examples/09-interfaces.go
package main

import "fmt"

// Define interface
type Speaker interface {
	Speak() string
}

// Writer interface
type Writer interface {
	Write(data string) error
}

// Composite interface (embed interface)
type ReadWriter interface {
	Reader
	Writer
}

type Reader interface {
	Read() (string, error)
}

// Struct Dog - IMPLICIT implementation (ga perlu tulis "implements")
type Dog struct {
	Name string
}

func (d Dog) Speak() string {
	return "Woof! My name is " + d.Name
}

// Struct Cat - juga implement Speaker
type Cat struct {
	Name string
}

func (c Cat) Speak() string {
	return "Meow! My name is " + c.Name
}

// Struct Human - implement multiple interfaces
type Human struct {
	Name string
}

func (h Human) Speak() string {
	return "Hello, I'm " + h.Name
}

func (h Human) Write(data string) error {
	fmt.Println("Writing:", data)
	return nil
}

// Function yang terima interface
func MakeSpeak(s Speaker) {
	fmt.Println(s.Speak())
}

// Empty interface (interface{}) = any type
func PrintAnything(data interface{}) {
	fmt.Println("Data:", data)
}

// Interface untuk dependency injection
type UserRepository interface {
	GetByID(id int) (string, error)
	Save(name string) error
}

// Implementation 1: Database
type DBUserRepository struct{}

func (db DBUserRepository) GetByID(id int) (string, error) {
	return fmt.Sprintf("User from DB: %d", id), nil
}

func (db DBUserRepository) Save(name string) error {
	fmt.Println("Saving to DB:", name)
	return nil
}

// Implementation 2: Mock (buat testing)
type MockUserRepository struct{}

func (m MockUserRepository) GetByID(id int) (string, error) {
	return "Mock User", nil
}

func (m MockUserRepository) Save(name string) error {
	fmt.Println("Mock save:", name)
	return nil
}

// Service yang depend on interface (bukan concrete type)
type UserService struct {
	repo UserRepository // depend on interface
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetUser(id int) (string, error) {
	return s.repo.GetByID(id)
}

func main() {
	// Polymorphism via interface
	dog := Dog{Name: "Buddy"}
	cat := Cat{Name: "Whiskers"}
	human := Human{Name: "Budi"}
	
	MakeSpeak(dog)
	MakeSpeak(cat)
	MakeSpeak(human)
	
	// Empty interface
	PrintAnything(42)
	PrintAnything("hello")
	PrintAnything([]int{1, 2, 3})
	
	// Dependency injection
	dbRepo := DBUserRepository{}
	service := NewUserService(dbRepo)
	
	user, _ := service.GetUser(1)
	fmt.Println(user)
	
	// Ganti dengan mock (tanpa ubah UserService!)
	mockRepo := MockUserRepository{}
	mockService := NewUserService(mockRepo)
	
	mockUser, _ := mockService.GetUser(1)
	fmt.Println(mockUser)
}
```

**Kenapa implicit implementation?**
- Decoupling: Type ga perlu tau tentang interface
- Bisa bikin interface setelah implementation ada
- Testing lebih mudah (mock dengan interface)

**Best practice:**
- Interface kecil (1-3 method) lebih baik
- Accept interface, return concrete type
- Define interface di consumer, bukan provider

### 12. Type Assertion & Type Switch

**Handling interface{} / any**

```go
// examples/10-type-assertion.go
package main

import "fmt"

func main() {
	// Type assertion (mirip casting)
	var data interface{} = "Hello, World"
	
	// Unsafe assertion (panic kalau salah type)
	str := data.(string)
	fmt.Println("String:", str)
	
	// Safe assertion (dengan check)
	str2, ok := data.(string)
	if ok {
		fmt.Println("Valid string:", str2)
	} else {
		fmt.Println("Not a string")
	}
	
	// Type assertion ke wrong type
	num, ok := data.(int)
	if !ok {
		fmt.Println("Not an int, got:", num) // 0 (zero value)
	}
	
	// Type switch (switch based on type)
	checkType := func(val interface{}) {
		switch v := val.(type) {
		case int:
			fmt.Printf("Integer: %d\n", v)
		case string:
			fmt.Printf("String: %s\n", v)
		case bool:
			fmt.Printf("Boolean: %v\n", v)
		case []int:
			fmt.Printf("Int slice: %v\n", v)
		default:
			fmt.Printf("Unknown type: %T\n", v)
		}
	}
	
	checkType(42)
	checkType("hello")
	checkType(true)
	checkType([]int{1, 2, 3})
	checkType(3.14)
	
	// Practical example: handling API response
	type Response struct {
		Data interface{}
	}
	
	resp := Response{Data: map[string]string{"name": "Budi"}}
	
	switch data := resp.Data.(type) {
	case map[string]string:
		fmt.Println("User name:", data["name"])
	case []string:
		fmt.Println("List:", data)
	default:
		fmt.Println("Unknown data format")
	}
}
```

### 13. Goroutines

**Concurrency di Go = super mudah!**

**JavaScript:**
```javascript
// Async/await (still single-threaded)
async function fetchData() {
  const result = await fetch(url);
  return result;
}
```

**Go:**

```go
// examples/11-goroutines.go
package main

import (
	"fmt"
	"time"
)

// Regular function
func sayHello(name string) {
	for i := 0; i < 3; i++ {
		fmt.Printf("Hello %s (%d)\n", name, i)
		time.Sleep(100 * time.Millisecond)
	}
}

// Simulate API call
func fetchUser(id int) {
	fmt.Printf("Fetching user %d...\n", id)
	time.Sleep(500 * time.Millisecond) // simulate delay
	fmt.Printf("User %d fetched!\n", id)
}

func main() {
	// Sequential (satu-satu, lama)
	fmt.Println("=== Sequential ===")
	start := time.Now()
	fetchUser(1)
	fetchUser(2)
	fetchUser(3)
	fmt.Printf("Sequential took: %v\n\n", time.Since(start))
	
	// Concurrent dengan goroutine (paralel, cepat!)
	fmt.Println("=== Concurrent ===")
	start = time.Now()
	
	go fetchUser(1) // keyword "go" = run in goroutine
	go fetchUser(2)
	go fetchUser(3)
	
	// Wait sebentar (di real app pakai WaitGroup atau channel)
	time.Sleep(1 * time.Second)
	fmt.Printf("Concurrent took: %v\n\n", time.Since(start))
	
	// Multiple goroutines
	fmt.Println("=== Multiple Goroutines ===")
	go sayHello("Budi")
	go sayHello("Agus")
	go sayHello("Siti")
	
	time.Sleep(500 * time.Millisecond)
	
	// Anonymous goroutine
	go func() {
		fmt.Println("Anonymous goroutine!")
	}()
	
	// With parameters
	go func(msg string) {
		fmt.Println(msg)
	}("Goroutine with params!")
	
	time.Sleep(100 * time.Millisecond)
	
	// Note: main function exit = semua goroutine di-kill
	// Makanya perlu wait (nanti belajar WaitGroup & Channel)
	fmt.Println("\nMain function ending...")
}
```

**Analogi:**
- **Sequential**: 1 kasir melayani 3 customer berurutan
- **Goroutine**: 3 kasir melayani 3 customer paralel (lebih cepat!)

**Penting:**
- Goroutine super lightweight (2KB stack, bisa spawn ribuan)
- JS async: event loop (single thread)
- Go goroutine: true parallelism (multiple OS threads)

### 14. Channels

**Channel = cara goroutine komunikasi (message passing)**

**Analogi:**
- Goroutine = pekerja
- Channel = pipeline/pipa buat kirim data antar pekerja

```go
// examples/12-channels.go
package main

import (
	"fmt"
	"time"
)

func main() {
	// ===== Unbuffered Channel =====
	// Blocking: sender wait sampai receiver ready
	
	ch := make(chan string) // create channel
	
	// Send in goroutine (kalau di main langsung, deadlock!)
	go func() {
		ch <- "Hello from goroutine" // send ke channel
	}()
	
	msg := <-ch // receive from channel
	fmt.Println("Received:", msg)
	
	// ===== Buffered Channel =====
	// Non-blocking sampai buffer penuh
	
	bufCh := make(chan int, 3) // capacity 3
	
	bufCh <- 1 // ga blocking karena ada buffer
	bufCh <- 2
	bufCh <- 3
	// bufCh <- 4 // ini bakal blocking karena buffer penuh
	
	fmt.Println(<-bufCh) // 1
	fmt.Println(<-bufCh) // 2
	fmt.Println(<-bufCh) // 3
	
	// ===== Practical Example: Worker Pool =====
	
	jobs := make(chan int, 5)
	results := make(chan int, 5)
	
	// Worker function
	worker := func(id int, jobs <-chan int, results chan<- int) {
		for job := range jobs {
			fmt.Printf("Worker %d processing job %d\n", id, job)
			time.Sleep(100 * time.Millisecond)
			results <- job * 2
		}
	}
	
	// Start 3 workers
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}
	
	// Send 5 jobs
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs) // close channel (no more data)
	
	// Collect results
	for r := 1; r <= 5; r++ {
		result := <-results
		fmt.Println("Result:", result)
	}
	
	// ===== Select Statement =====
	// Mirip switch tapi buat channel
	
	ch1 := make(chan string)
	ch2 := make(chan string)
	
	go func() {
		time.Sleep(100 * time.Millisecond)
		ch1 <- "from ch1"
	}()
	
	go func() {
		time.Sleep(200 * time.Millisecond)
		ch2 <- "from ch2"
	}()
	
	// Select: wait for first available channel
	for i := 0; i < 2; i++ {
		select {
		case msg1 := <-ch1:
			fmt.Println("Received:", msg1)
		case msg2 := <-ch2:
			fmt.Println("Received:", msg2)
		case <-time.After(300 * time.Millisecond):
			fmt.Println("Timeout!")
		}
	}
	
	// ===== Pipeline Pattern =====
	
	// Generator
	gen := func(nums ...int) <-chan int {
		out := make(chan int)
		go func() {
			for _, n := range nums {
				out <- n
			}
			close(out)
		}()
		return out
	}
	
	// Square
	square := func(in <-chan int) <-chan int {
		out := make(chan int)
		go func() {
			for n := range in {
				out <- n * n
			}
			close(out)
		}()
		return out
	}
	
	// Chain them
	nums := gen(1, 2, 3, 4, 5)
	squared := square(nums)
	
	for result := range squared {
		fmt.Println("Squared:", result)
	}
}
```

**Channel Types:**

```go
chan T        // bidirectional (send & receive)
chan<- T      // send-only
<-chan T      // receive-only
```

**Best Practices:**
- Close channel di sender, bukan receiver
- Receive dari closed channel return zero value (tanpa block)
- Send ke closed channel = panic!
- Use `range` untuk iterate channel sampai closed

### 15. defer, panic, recover

**Error handling ekstrim**

```go
// examples/13-defer-panic-recover.go
package main

import (
	"fmt"
	"os"
)

// ===== DEFER =====
// Execute after function return (mirip finally di try/catch)

func deferExample() {
	defer fmt.Println("This runs last") // defer = stack (LIFO)
	defer fmt.Println("This runs second")
	
	fmt.Println("This runs first")
}

// Practical use: cleanup resource
func readFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer file.Close() // pasti close, mau error atau success
	
	// ... baca file ...
	fmt.Println("Reading file...")
}

// ===== PANIC =====
// Crash program (kayak throw error yang ga di-catch)

func panicExample(val int) {
	if val == 0 {
		panic("value cannot be zero!") // crash!
	}
	fmt.Println("Value:", val)
}

// ===== RECOVER =====
// Catch panic (kayak try/catch)

func recoverExample() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered from panic:", r)
		}
	}()
	
	fmt.Println("Before panic")
	panic("something went wrong!")
	fmt.Println("After panic") // tidak akan dieksekusi
}

// Practical example: HTTP middleware
func safeHandler(fn func()) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Panic caught: %v\n", r)
			// Log error, return 500, etc
		}
	}()
	
	fn() // run handler
}

func riskyOperation() {
	panic("oops!")
}

func main() {
	// Defer
	fmt.Println("=== Defer ===")
	deferExample()
	
	// Defer with file
	fmt.Println("\n=== Defer File ===")
	readFile("nonexistent.txt")
	
	// Panic (uncomment to crash)
	// fmt.Println("\n=== Panic ===")
	// panicExample(0)
	
	// Recover
	fmt.Println("\n=== Recover ===")
	recoverExample()
	fmt.Println("Program continues after recover")
	
	// Safe handler
	fmt.Println("\n=== Safe Handler ===")
	safeHandler(riskyOperation)
	fmt.Println("Program still running after panic in handler")
	
	// Multiple defer (LIFO order)
	fmt.Println("\n=== Multiple Defer ===")
	for i := 1; i <= 3; i++ {
		defer fmt.Println("Deferred:", i)
	}
	fmt.Println("Normal execution")
	// Output:
	// Normal execution
	// Deferred: 3
	// Deferred: 2
	// Deferred: 1
}
```

**Kapan pakai:**
- **defer**: Cleanup (close file, db connection, unlock mutex)
- **panic**: Unrecoverable error (misconfig, impossible state)
- **recover**: Middleware, prevent crash di HTTP handler

**JANGAN pakai panic untuk normal error handling!** Pakai `error` return value.

### 16. Go Modules

**Package management di Go**

```bash
# Init module (mirip npm init)
go mod init github.com/username/project-name

# Add dependency (mirip npm install)
go get github.com/gin-gonic/gin@latest
go get github.com/lib/pq@v1.10.9  # specific version

# Update dependencies
go get -u ./...

# Tidy (remove unused, add missing)
go mod tidy

# Vendor (copy deps ke vendor/)
go mod vendor

# Verify
go mod verify

# List dependencies
go list -m all
```

**go.mod file:**
```
module backend-mindset/go-practice

go 1.22

require (
    github.com/gin-gonic/gin v1.10.0
    github.com/lib/pq v1.10.9
)

require (
    // indirect dependencies...
)
```

**Import & use:**

```go
// examples/14-modules.go
package main

import (
	"fmt"
	
	// External package
	// "github.com/gin-gonic/gin"
	
	// Local package (dalam project)
	// "backend-mindset/go-practice/internal/utils"
)

func main() {
	fmt.Println("Go modules example")
	
	// Use imported package
	// router := gin.Default()
	// result := utils.Add(1, 2)
}
```

**Package structure:**

```
project/
├── go.mod
├── go.sum
├── main.go
├── internal/          # private packages
│   └── utils/
│       └── math.go
├── pkg/               # public packages
│   └── helpers/
│       └── string.go
└── cmd/               # binaries
    └── server/
        └── main.go
```

### 17. Clean Code di Go

**Naming Convention:**

```go
// examples/15-clean-code.go
package main

import (
	"fmt"
	"errors"
)

// ===== NAMING =====

// Exported (public): PascalCase
type User struct {
	Name  string // exported field
	email string // unexported (private)
}

// Exported function
func NewUser(name string) *User {
	return &User{Name: name}
}

// Unexported function
func privateHelper() {
	fmt.Println("private")
}

// ===== PACKAGE NAMING =====
// GOOD: lowercase, short, descriptive
// package user
// package http
// package encoding

// BAD: 
// package userPackage
// package user_package
// package User

// ===== ERROR HANDLING =====

// ❌ BAD: Naked return
func badDivide(a, b int) (result int, err error) {
	if b == 0 {
		err = errors.New("division by zero")
		return // naked return (unclear)
	}
	result = a / b
	return // naked return
}

// ✅ GOOD: Explicit return
func goodDivide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

// ✅ GOOD: Error wrapping
func processData(id int) error {
	data, err := fetchData(id)
	if err != nil {
		return fmt.Errorf("processData: %w", err) // wrap with context
	}
	
	if err := validateData(data); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	
	return nil
}

func fetchData(id int) (string, error) {
	if id < 0 {
		return "", errors.New("invalid id")
	}
	return "data", nil
}

func validateData(data string) error {
	if data == "" {
		return errors.New("empty data")
	}
	return nil
}

// ===== DEPENDENCY INJECTION =====

// ❌ BAD: Hard-coded dependency
type BadUserService struct{}

func (s *BadUserService) GetUser(id int) string {
	// Hard-coded DB connection
	// db := sql.Open("postgres", "...")
	// ...
	return "user"
}

// ✅ GOOD: Dependency injection via interface
type UserRepository interface {
	GetByID(id int) (string, error)
}

type GoodUserService struct {
	repo UserRepository // depend on interface
}

func NewGoodUserService(repo UserRepository) *GoodUserService {
	return &GoodUserService{repo: repo}
}

func (s *GoodUserService) GetUser(id int) (string, error) {
	return s.repo.GetByID(id) // use injected dependency
}

// ===== AVOID GLOBAL VARIABLES =====

// ❌ BAD: Global mutable state
var globalCounter int

func badIncrement() {
	globalCounter++ // race condition in concurrent env!
}

// ✅ GOOD: Pass state as parameter or use struct
type Counter struct {
	value int
}

func (c *Counter) Increment() {
	c.value++
}

// ===== AVOID GOD STRUCT =====

// ❌ BAD: God struct (terlalu banyak tanggung jawab)
type BadUserManager struct {
	// DB connection
	// Cache
	// Email service
	// Push notification
	// Payment gateway
	// ...semua dalam 1 struct
}

// ✅ GOOD: Single Responsibility
type UserService struct {
	repo  UserRepository
	cache CacheService
}

type EmailService struct {
	sender string
}

type CacheService interface {
	Get(key string) (string, error)
	Set(key, value string) error
}

// ===== SMALL INTERFACES =====

// ❌ BAD: Fat interface
type BadRepository interface {
	GetUser(id int) (string, error)
	CreateUser(name string) error
	UpdateUser(id int, name string) error
	DeleteUser(id int) error
	GetAllUsers() ([]string, error)
	SearchUsers(query string) ([]string, error)
	// ...20 more methods
}

// ✅ GOOD: Small, focused interfaces
type UserGetter interface {
	GetUser(id int) (string, error)
}

type UserCreator interface {
	CreateUser(name string) error
}

// Compose when needed
type UserManager interface {
	UserGetter
	UserCreator
}

func main() {
	// Clean code examples
	fmt.Println("Clean code practices")
	
	result, err := goodDivide(10, 2)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Result:", result)
}
```

**SOLID Principles di Go:**

1. **Single Responsibility**: Struct hanya punya 1 tanggung jawab
2. **Open/Closed**: Extend via interface, bukan modify struct
3. **Liskov Substitution**: Interface implementation harus interchangeable
4. **Interface Segregation**: Banyak interface kecil > 1 interface besar
5. **Dependency Inversion**: Depend on interface, bukan concrete type

## ❌ Common Mistakes + Fix

### Mistake 1: Lupa Check Error

```go
// ❌ BAD
result, _ := divide(10, 0) // ignore error
fmt.Println(result)

// ✅ GOOD
result, err := divide(10, 0)
if err != nil {
	log.Fatal(err) // atau handle dengan proper
}
fmt.Println(result)
```

### Mistake 2: Goroutine Tanpa Synchronization

```go
// ❌ BAD
for i := 0; i < 10; i++ {
	go fmt.Println(i) // race condition
}
// main exit sebelum goroutine selesai

// ✅ GOOD
import "sync"

var wg sync.WaitGroup
for i := 0; i < 10; i++ {
	wg.Add(1)
	go func(val int) {
		defer wg.Done()
		fmt.Println(val)
	}(i) // pass i as param, hindari closure bug
}
wg.Wait() // tunggu semua goroutine selesai
```

### Mistake 3: Slice/Map Pass by Reference

```go
// ❌ BAD: Mutate slice affects original
func badAppend(nums []int) {
	nums = append(nums, 4) // ini ga affect original kalau realloc
	nums[0] = 999          // ini affect original
}

// ✅ GOOD: Return new slice atau pakai pointer
func goodAppend(nums []int) []int {
	return append(nums, 4)
}

func goodAppendPointer(nums *[]int) {
	*nums = append(*nums, 4)
}
```

### Mistake 4: Nil Pointer Dereference

```go
// ❌ BAD
var user *User
fmt.Println(user.Name) // PANIC!

// ✅ GOOD
var user *User
if user != nil {
	fmt.Println(user.Name)
} else {
	fmt.Println("User is nil")
}
```

### Mistake 5: Range Loop Variable Capture

```go
// ❌ BAD
users := []string{"Budi", "Agus", "Siti"}
for _, user := range users {
	go func() {
		fmt.Println(user) // semua print "Siti" (last value)
	}()
}

// ✅ GOOD
for _, user := range users {
	go func(u string) {
		fmt.Println(u) // pass as param
	}(user)
}
```

### Mistake 6: Defer di Loop

```go
// ❌ BAD
func badDefer() {
	for i := 0; i < 5; i++ {
		file, _ := os.Open("file.txt")
		defer file.Close() // defer stack up, file ga close sampai function end
	}
}

// ✅ GOOD
func goodDefer() {
	for i := 0; i < 5; i++ {
		func() {
			file, _ := os.Open("file.txt")
			defer file.Close() // close setiap iteration
		}()
	}
}
```

### Mistake 7: Interface Nil Check

```go
// ❌ BAD
var repo UserRepository // nil interface
if repo == nil {
	// true
}

var concreteRepo *ConcreteRepo // nil pointer
repo = concreteRepo              // interface with nil value
if repo == nil {
	// FALSE! interface != nil (tapi value-nya nil)
}

// ✅ GOOD
if repo == nil || reflect.ValueOf(repo).IsNil() {
	// properly check
}
```

## ✅ Checklist Akhir

Setelah belajar materi ini, cek apakah lo bisa:

**Setup & Environment:**
- [ ] Install Go di Linux dengan benar
- [ ] Paham GOPATH vs Go Modules
- [ ] Bikin project baru dengan `go mod init`
- [ ] Install & manage dependencies dengan `go get`

**Syntax Dasar:**
- [ ] Deklarasi variable dengan `var`, `:=`, `const`
- [ ] Paham zero values untuk tiap type
- [ ] Bikin function dengan multiple return values
- [ ] Handle error dengan `if err != nil` pattern
- [ ] Paham pointer (`&` dan `*`) & kapan pakai

**Data Structures:**
- [ ] Bedain array vs slice, tau kapan pakai yang mana
- [ ] Operasi slice: append, slicing, copy, iterate
- [ ] CRUD operations di map
- [ ] Check key exists di map dengan `, ok` pattern

**OOP ala Go:**
- [ ] Bikin struct dengan fields & methods
- [ ] Bedain value receiver vs pointer receiver
- [ ] Pakai struct embedding (composition)
- [ ] Bikin constructor function `New*`

**Interface & Polymorphism:**
- [ ] Define interface & implicit implementation
- [ ] Tau kapan pakai interface (dependency injection)
- [ ] Type assertion & type switch
- [ ] Accept interface, return concrete

**Concurrency:**
- [ ] Spawn goroutine dengan keyword `go`
- [ ] Bikin & pakai channel (buffered vs unbuffered)
- [ ] Pakai `select` buat multiple channel
- [ ] Pattern: worker pool, pipeline

**Error Handling:**
- [ ] Wrap error dengan `fmt.Errorf` dan `%w`
- [ ] Pakai defer untuk cleanup
- [ ] Paham panic & recover (tapi jarang dipake)

**Clean Code:**
- [ ] Follow naming convention (PascalCase vs camelCase)
- [ ] Hindari naked return & global variable
- [ ] Dependency injection via interface
- [ ] Avoid common mistakes (nil check, goroutine sync, dll)

## 💭 Ide Pengembangan Mandiri

Sekarang lo udah punya fundamental-nya, saatnya praktek bikin project:

### Project 1: CLI Tool (Pemula)
Bikin command-line app sederhana:
- Todo list manager
- File organizer (move files by extension)
- Text analyzer (word count, char count)

**Skills yang dipake:**
- File I/O (`os`, `io/ioutil`)
- String manipulation
- Struct untuk data model
- Error handling

### Project 2: REST API (Intermediate)
Bikin backend API dengan framework:
- User CRUD (Create, Read, Update, Delete)
- Authentication (JWT)
- Database integration (PostgreSQL)
- Middleware (logging, auth)

**Framework options:**
- Gin (populer, mirip Express.js)
- Echo (minimalist, cepat)
- Standard library `net/http` (buat pure learning)

**Skills yang dipake:**
- HTTP handler & routing
- JSON marshal/unmarshal
- Database query
- Middleware pattern
- Interface untuk repository
- Goroutine untuk concurrent task

### Project 3: Microservice (Advanced)
Bikin 2-3 microservices yang komunikasi:
- User service (manage users)
- Product service (manage products)
- Order service (handle orders)
- API Gateway (routing)

**Skills yang dipake:**
- gRPC atau REST untuk inter-service communication
- Message queue (RabbitMQ, Kafka)
- Docker & Docker Compose
- Distributed tracing
- Error handling & retry logic

### Project 4: Real-time App
Bikin app dengan WebSocket:
- Chat application
- Live notification system
- Collaborative editing

**Skills yang dipake:**
- WebSocket (`gorilla/websocket`)
- Channel untuk broadcast
- Goroutine untuk handle multiple connections
- Redis untuk pub/sub

### Sumber Belajar Lanjutan:
1. **Official Go Tour**: tour.golang.org (interactive!)
2. **Go by Example**: gobyexample.com (kode pendek + jelas)
3. **Effective Go**: golang.org/doc/effective_go (best practices)
4. **Awesome Go**: github.com/avelino/awesome-go (curated packages)

### Tips Belajar:
1. **Tulis ulang kode di doc ini** tanpa liat → test hafalan
2. **Bikin variasi** dari contoh (ubah logic, tambah fitur)
3. **Baca kode orang** di GitHub (cari repo Go populer)
4. **Bikin project kecil** setiap minggu
5. **Join komunitas** (Go Discord, Reddit r/golang)

---

**Selamat belajar! Jangan lupa repetisi sampai hafal. Kalau ada yang bingung, baca lagi bagian "Konsep + Analogi" buat relate ke JS/TS yang udah lo kuasai.** 🚀

Sukses jadi Go backend developer! 💪
