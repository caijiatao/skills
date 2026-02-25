---
name: core-interfaces
description: Go interface design principles and patterns
---

# Core: Interfaces

## The Golden Rule

**Accept interfaces, return structs.**

## Interface Size

### Keep Interfaces Small

Interfaces should have 1-3 methods ideally:

```go
// ✓ Perfect - single method
type Reader interface {
	Read(p []byte) (n int, err error)
}

// ✓ Good - two methods
type ReadWriter interface {
	Reader
	Writer
}

// ✗ Bad - too many methods
type UserService interface {
	CreateUser(name, email string) error
	GetUser(id int) (*User, error)
	UpdateUser(user *User) error
	DeleteUser(id int) error
	ListUsers() ([]*User, error)
	ValidateUser(user *User) error
	SendEmail(user *User, msg string) error
}
```

### The Standard Library's Example

The `io` package shows the power of small interfaces:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Closer interface {
	Close() error
}

// Compose as needed
type ReadWriter interface {
	Reader
	Writer
}

type ReadCloser interface {
	Reader
	Closer
}

type WriteCloser interface {
	Writer
	Closer
}

type ReadWriteCloser interface {
	Reader
	Writer
	Closer
}
```

## Interface Naming

### Single Method Interfaces

Use method name + `er` suffix:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Stringer interface {
	String() string
}

type Runner interface {
	Run() error
}
```

When the method ends in `r`, use a creative variant:

```go
// ✗ Would be Conflicter
type Conflicter interface {
	Conflict() error
}

// ✓ Correct
type ConflictResolver interface {
	Conflict() error
}

// ✓ Or use Runnable pattern
type Runnable interface {
	Run() error
}
```

## Interface Definition

### Define by Consumers

Interfaces should be defined by the consumer, not the producer:

```go
// ✓ Correct - interface defined by consumer
// package service

type UserGetter interface {
	GetUser(id int) (*User, error)
}

func (s *OrderService) ProcessOrder(userID int) error {
	// OrderService only needs GetUser
	user, err := s.userRepo.GetUser(userID)
	// ...
}

// ✗ Wrong - interface defined by producer
// package repository

type UserRepository interface {
	CreateUser(u *User) error
	GetUser(id int) (*User, error)
	UpdateUser(u *User) error
	DeleteUser(id int) error
	ListUsers() ([]*User, error)
}
```

### Benefits of Consumer-Defined Interfaces

1. **Minimal** - Only includes methods the consumer needs
2. **Decoupled** - Producer doesn't need to know about the interface
3. **Flexible** - Easy to create different implementations (e.g., mocks)

## Interface Satisfaction

### Implicit Satisfaction

Types implicitly satisfy interfaces - no explicit declaration needed:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

// MyType implicitly satisfies Reader
type MyType struct{}

func (m *MyType) Read(p []byte) (n int, err error) {
	// implementation
}

// Can use MyType wherever Reader is expected
func ReadAll(r Reader) []byte {
	// ...
}

var m *MyType
ReadAll(m) // Works! No explicit "implements Reader" needed
```

### Checking Satisfaction

Use the compiler to check interface satisfaction:

```go
// Compile-time check - fails if MyType doesn't satisfy Reader
var _ Reader = (*MyType)(nil)

// Or use a helper
func _() {
	var _ Reader = (*MyType)(nil)
}
```

## Empty Interface

### Use Cases

The empty interface `interface{}` (or `any` in Go 1.18+) can hold any value:

```go
// ✓ Acceptable - storing arbitrary types
func PrintAnything(v any) {
	fmt.Println(v)
}

// ✓ Acceptable - JSON unmarshaling
var data map[string]any
json.Unmarshal(bytes, &data)

// ✓ Acceptable - heterogeneous collection
items := []any{1, "hello", true, 3.14}
```

### When NOT to Use Empty Interface

```go
// ✗ Wrong - defeats type safety
func Process(data any) error {
	user, ok := data.(*User)
	if !ok {
		return fmt.Errorf("invalid type")
	}
	// ...
}

// ✓ Correct - use concrete type
func ProcessUser(user *User) error {
	// ...
}
```

## Interface Composition

### Basic Composition

Compose interfaces by embedding them:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type ReadWriter interface {
	Reader
	Writer
}

type ReadWriteCloser interface {
	Reader
	Writer
	Close() error
}
```

### Adding Methods

Add methods when composing:

```go
type ReadSeeker interface {
	Reader
	Seek(offset int64, whence int) (int64, error)
}
```

## The io Package

### Common Interfaces

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Closer interface {
	Close() error
}

type Seeker interface {
	Seek(offset int64, whence int) (int64, error)
}

type ReaderAt interface {
	ReadAt(p []byte, off int64) (n int, err error)
}

type WriterAt interface {
	WriteAt(p []byte, off int64) (n int, err error)
}
```

### Helper Functions

```go
// ReadAll - reads until EOF
func ReadAll(r Reader) ([]byte, error)

// Copy - copies from Reader to Writer
func Copy(dst Writer, src Reader) (written int64, err error)

// CopyBuffer - copies with provided buffer
func CopyBuffer(dst Writer, src Reader, buf []byte) (written int64, err error)

// Limit - wraps Reader to limit reads
func LimitReader(r Reader, n int64) Reader
```

## Value vs Pointer Receivers

### Choosing Receiver Type

```go
// ✓ Use value receiver if:
// - The method doesn't modify the receiver
// - The receiver is small (no copying overhead)

type User struct {
	ID int
}

func (u User) String() string {
	return fmt.Sprintf("User(%d)", u.ID)
}

// ✓ Use pointer receiver if:
// - The method modifies the receiver
// - The receiver is large (avoid copying)
// - Consistency - other methods use pointer

type Counter struct {
	count int
}

func (c *Counter) Increment() {
	c.count++
}
```

### Interface Satisfaction

```go
type Stringer interface {
	String() string
}

// User satisfies Stringer with value receiver
var _ Stringer = User{}     // ✓ Works
var _ Stringer = &User{}    // ✓ Also works

// Counter would need pointer receiver
type Incrementer interface {
	Increment()
}

var _ Incrementer = &Counter{}  // ✓ Works
var _ Incrementer = Counter{}   // ✗ Doesn't work
```

## Common Patterns

### Mocking for Tests

Small interfaces make mocking easy:

```go
// Define interface
type UserRepository interface {
	GetUser(id int) (*User, error)
}

// Production implementation
type PostgresUserRepository struct {
	db *sql.DB
}

func (r *PostgresUserRepository) GetUser(id int) (*User, error) {
	// database access
}

// Mock for testing
type MockUserRepository struct {
	GetUserFunc func(id int) (*User, error)
}

func (m *MockUserRepository) GetUser(id int) (*User, error) {
	return m.GetUserFunc(id)
}
```

### Dependency Injection

Accept interfaces for dependencies:

```go
type Service struct {
	userRepo UserRepository  // Interface, not concrete type
	logger   Logger          // Interface
}

func NewService(repo UserRepository, logger Logger) *Service {
	return &Service{
		userRepo: repo,
		logger:   logger,
	}
}
```

<!--
Source references:
- https://go.dev/doc/effective_go#interfaces_and_types
- https://go.dev/blog/laws-of-reflection
- https://github.com/golang/go/wiki/CodeReviewComments#interfaces
-->
