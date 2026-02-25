---
name: core-documentation
description: Go documentation conventions and godoc
---

# Core: Documentation

## The Golden Rule

**Document all exported symbols.**

## Godoc Comments

### Format

Godoc comments are regular Go comments:

```go
// Package cosine computes cosine functions.
package cosine

// Cosine computes the cosine of x.
//
// The precision is within 1e-6.
func Cosine(x float64) float64 {
	// implementation
}
```

### The Godoc Template

Every exported function should follow this template:

```go
// FunctionName does something.
//
// Optional: Additional details about how it works.
// Optional: Edge cases or special behavior.
// Optional: Examples or usage notes.
func FunctionName(param Type) Type {
	// implementation
}
```

## Package Documentation

### Package Comments

Every package should have a package comment:

```go
// Package http provides HTTP client and server implementations.
//
// Get, Head, Post, and PostForm make HTTP requests.
//
//    resp, err := http.Get("http://example.com/")
//
// The Client and Transport types allow fine-grained control.
package http
```

### Package Comment Location

Put package comments in a `doc.go` file if the package is small:

```go
// File: doc.go
// Package math provides basic constants and mathematical functions.
package math
```

Or in the main file of the package:

```go
// File: handler.go
// Package http implements HTTP handlers for the web application.
package http
```

## Function Documentation

### Basic Function Doc

```go
// ReadAll reads from r until an error or EOF and returns the data it read.
// A successful call returns err == nil, not err == EOF.
// Because ReadAll is defined to read from src until EOF,
// it does not treat an EOF from Read as an error to be reported.
func ReadAll(r Reader) ([]byte, error) {
	// implementation
}
```

### Function Documentation with Details

```go
// Marshal returns the JSON encoding of v.
//
// Marshal traverses the value v recursively.
// If an encountered value implements the Marshaler interface
// and is not a nil pointer, Marshal calls its MarshalJSON method
// to produce JSON.
//
// Marshal handles circular references by creating an error.
func Marshal(v any) ([]byte, error) {
	// implementation
}
```

### Return Values in Doc

Document return values, especially errors:

```go
// Lookup returns the value associated with key in the map.
// It returns the zero value for the value type and false if no value exists.
func Lookup(m map[string]int, key string) (int, bool) {
	val, ok := m[key]
	return val, ok
}
```

## Type Documentation

### Struct Documentation

```go
// User represents a user account in the system.
// It contains authentication data and profile information.
type User struct {
	ID        int       // Unique identifier
	Name      string    // Display name
	Email     string    // Contact email
	CreatedAt time.Time // Account creation timestamp
}
```

### Interface Documentation

```go
// Reader is the interface that wraps the basic Read method.
//
// Read reads up to len(p) bytes into p. It returns the number of bytes
// read (0 <= n <= len(p)) and any error encountered.
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

## Best Practices

### What to Document

- **All exported packages** - Always document
- **All exported functions** - Always document
- **All exported types** - Always document
- **All exported constants** - Always document
- **All exported variables** - Always document
- **Unexported exports** - Document if not obvious

### What Not to Document

- **Obvious code** - Don't repeat what the code says
- **Internal implementation** - Unless important for users
- **Commented-out code** - Delete it instead

```go
// ✗ Bad - repeats the code
// Increment increments the counter.
func (c *Counter) Increment() {
	c.count++
}

// ✓ Good - adds useful information
// Increment increments the counter and returns the new value.
// It's safe to call concurrently from multiple goroutines.
func (c *Counter) Increment() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.count++
	return c.count
}
```

## Comments in Code

### Package-Level Declarations

```go
const (
	// Integer limit values.
	MaxInt64  = 1<<63 - 1
	MinInt64  = -1 << 63
	MaxUint64 = 1<<64 - 1
)

var (
	// ErrNotFound is returned when a resource is not found.
	ErrNotFound = errors.New("not found")
)
```

### Comments on Fields

```go
type Server struct {
	// Addr is the address to listen on, ":http" if empty.
	Addr string

	// Handler is the handler to invoke.
	Handler http.Handler

	// ReadTimeout is the maximum duration before timing out read.
	ReadTimeout time.Duration
}
```

## Examples

### Example Functions

Provide examples that `go test` can verify:

```go
// Example demonstrates how to use Abs.
func ExampleAbs() {
	fmt.Println(math.Abs(-5))
	// Output: 5
}

// Example_suffix provides multiple examples.
func ExampleStringLength_short() {
	fmt.Println(StringLength("hello"))
	// Output: 5
}

func ExampleStringLength_empty() {
	fmt.Println(StringLength(""))
	// Output: 0
}
```

### Example with Output

```go
func ExampleQuote() {
	fmt.Println(Quote("Hello, world!"))
	// Output: "Hello, world!"
}
```

### Example Without Output

For side effects (e.g., HTTP server):

```go
func ExampleServer() {
	srv := NewServer(":8080")
	// Use srv...
	// (no Output comment)
}
```

## Formatting

### Paragraphs

Separate paragraphs with blank lines:

```go
// ReadAll reads from r until an error or EOF.
//
// A successful call returns err == nil, not err == EOF.
// Because ReadAll is defined to read from src until EOF,
// it does not treat an EOF from Read as an error to be reported.
func ReadAll(r Reader) ([]byte, error) {
	// ...
}
```

### Code Blocks

Indent code blocks with a tab:

```go
// To decode JSON, use Unmarshal:
//
//	var data map[string]any
//	err := json.Unmarshal(bytes, &data)
//
// Unmarshal parses the JSON-encoded data and stores the result.
func Unmarshal(data []byte, v any) error {
	// ...
}
```

### Lists

Use plain text for lists:

```go
// ReadAll reads from r until EOF. It returns:
//   - the data read
//   - any error encountered (excluding io.EOF)
//
// Only use ReadAll for small inputs.
func ReadAll(r Reader) ([]byte, error) {
	// ...
}
```

## Links and References

### Package References

```go
// NewClient returns a new http.Client.
// It connects to the server specified in the configuration.
//
// See https://go.dev/pkg/net/http/ for more details.
func NewClient() *http.Client {
	// ...
}
```

## Common Pitfalls

### Starting with Function Name

```go
// ✗ Bad - starts with function name
// MarshalFunction marshals the input to JSON.

// ✓ Good - describes what it does
// Marshal returns the JSON encoding of v.
func Marshal(v any) ([]byte, error) {
	// ...
}
```

### Empty Comments

```go
// ✗ Bad - empty comment
// User struct
type User struct {
	// ...
}

// ✓ Good - describes purpose
// User represents a user account in the system.
type User struct {
	// ...
}
```

### Obvious Comments

```go
// ✗ Bad - obvious
// Get returns the value.
func (c *Cache) Get(key string) (any, bool) {
	// ...
}

// ✓ Better - adds context
// Get returns the value for key.
// The boolean result indicates whether the key was found.
func (c *Cache) Get(key string) (any, bool) {
	// ...
}
```

## Running Godoc

### View Documentation Locally

```bash
# View documentation for current directory
godoc -http=:6060

# Or use go tool
go install golang.org/x/tools/cmd/godoc@latest
godoc -http=:6060
```

Then open `http://localhost:6060` in a browser.

### Package Documentation Online

https://pkg.go.dev/ hosts all Go package documentation.

<!--
Source references:
- https://go.dev/doc/effective_go#commentary
- https://tip.golang.org/doc/effective_go.html#commentary
-->
