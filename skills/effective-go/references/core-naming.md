---
name: core-naming
description: Go naming conventions for packages, variables, functions, and constants
---

# Core: Naming

## Package Names

### Rules

1. **Lowercase, single word** - No underscores or mixed caps
2. **Short, concise** - Usually one word
3. **Descriptive** - Should describe what's in the package
4. **Not standard library** - Avoid names that conflict

```go
// ✓ Good package names
package http
package fmt
package time
package user
package auth

// ✗ Bad package names
package httpServer      // mixed caps
package http_server     // underscore
package util            // too generic
package data            // too generic
```

### Import with Alias

When package names conflict, use an import alias:

```go
import (
	stdhttp "net/http"
	myhttp "myproject/http"
)
```

## Exported vs Unexported

**First letter determines visibility:**

- **Uppercase first letter** = Exported (public)
- **Lowercase first letter** = Unexported (private)

```go
type User struct {
	ID       int    // Exported
	name     string // Unexported
	Email    string // Exported
	password string // Unexported
}

func GetUser() *User   { } // Exported
func createUser() *User { } // Unexported
```

## Variable Names

### MixedCaps Convention

Go uses `MixedCaps` or `mixedCaps` (no underscores):

```go
// ✓ Correct
userName := "alice"
requestCount := 42
httpServer := &Server{}

// ✗ Wrong
user_name := "alice"
request_count := 42
http_server := &Server{}
```

### Acronyms

Capitalize acronyms consistently:

```go
// ✓ Correct
userID       // not userId
httpServer   // not HTTPServer
xmlParser    // not XMLParser
apiURL       // not apiUrl or APIURL
```

### Abbreviations

Avoid obscure abbreviations:

```go
// ✓ Good
userConnection
requestHandler

// ✗ Bad - unclear
usrConn
reqHdlr
```

## Constant Names

Constants also use `MixedCaps`:

```go
// ✓ Correct
const maxRetries = 3
const defaultTimeout = 30 * time.Second

// ✗ Wrong - Go doesn't use ALL_CAPS
const MAX_RETRIES = 3
const DEFAULT_TIMEOUT = 30 * time.Second
```

### iota Constants

When using `iota`, add comments:

```go
const (
	StatusPending Status = iota // 0
	StatusActive                // 1
	StatusInactive              // 2
	StatusDeleted               // 3
)
```

## Interface Names

Single-method interfaces use method name + `er` suffix:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Runner interface {
	Run() error
}
```

When method ends in `r`, use a creative variant:

```go
type Runnable interface {
	Run() error
}

type Callable interface {
	Call() error
}
```

## Function Names

### Constructors

Use `NewXxx` for constructors:

```go
// ✓ Correct
func NewUser() *User {
	return &User{}
}

func NewServer(port int) *Server {
	return &Server{port: port}
}
```

### Verbs

Functions should start with verbs:

```go
// ✓ Good names
func GetUser() *User
func ValidateEmail() error
func ParseConfig() (*Config, error)
func CalculateTotal() int

// ✗ Bad names - unclear intent
func User() *User
func Email() error
func Config() (*Config, error)
```

### Getters

Go doesn't use `Get` prefix for simple getters:

```go
// ✓ Correct - idiomatic Go
func (u *User) ID() int {
	return u.id
}

func (u *User) Name() string {
	return u.name
}

// ✗ Wrong - not idiomatic
func (u *User) GetID() int {
	return u.id
}

func (u *User) GetName() string {
	return u.name
}
```

However, `Get` is acceptable if it returns something computed:

```go
// ✓ Acceptable
func (u *User) GetFullName() string {
	return u.firstName + " " + u.lastName
}
```

## Boolean Names

Boolean names should start with `Is`, `Has`, `Can`, `Should`:

```go
// ✓ Correct
func IsEnabled() bool
func HasPermission() bool
func CanWrite() bool
func ShouldRetry() bool

// ✗ Worse
func Enabled() bool
func Permission() bool
```

## Common Pitfalls

### Generic Names

Avoid overly generic names:

```go
// ✗ Avoid
util
data
info
handle
process
do
run

// ✓ Use descriptive names
userService
httpClient
configParser
```

### Single-Letter Variables

Use single letters only in specific contexts:

```go
// ✓ Acceptable - loop indices
for i := 0; i < 10; i++ { }

// ✓ Acceptable - receivers
func (u *User) method() { }
func (s *Server) method() { }

// ✓ Acceptable - coordinates
for x := 0; x < width; x++ {
	for y := 0; y < height; y++ {
		// ...
	}
}

// ✗ Avoid in other contexts
func process(d any) { } // What is 'd'?
```

<!--
Source references:
- https://go.dev/doc/effective_go#names
- https://github.com/golang/go/wiki/CodeReviewComments#variable-names
-->
