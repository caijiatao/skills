---
name: core-error-handling
description: Go error handling patterns and best practices
---

# Core: Error Handling

## The Golden Rule

**Always check errors** - Never ignore returned errors.

## Basic Error Handling

```go
// ✓ Correct - always check errors
file, err := os.Open("file.txt")
if err != nil {
	return fmt.Errorf("failed to open file: %w", err)
}
defer file.Close()

// ✗ Wrong - ignoring error
file, _ := os.Open("file.txt")
```

## Error Creation

### Simple Errors

Use `fmt.Errorf` for simple errors:

```go
return fmt.Errorf("user not found")
return fmt.Errorf("invalid input: %s", input)
```

### Error Wrapping (Go 1.13+)

Use `%w` verb to wrap errors while preserving the original:

```go
// ✓ Correct - wraps error
return fmt.Errorf("failed to read config: %w", err)

// ✗ Wrong - loses error type
return fmt.Errorf("failed to read config: %v", err)
```

### Custom Error Types

Define error types for specific cases:

```go
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed for field %s: %s", e.Field, e.Message)
}

// Usage
return &ValidationError{Field: "email", Message: "invalid format"}
```

## Error Inspection

### errors.Is

Check if an error is a specific error:

```go
var ErrNotFound = errors.New("not found")

func GetUser(id int) (*User, error) {
	// ...
	return nil, ErrNotFound
}

// Caller
user, err := GetUser(1)
if errors.Is(err, ErrNotFound) {
	// Handle not found
}
```

### errors.As

Extract the underlying error type:

```go
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error: %s", e.Message)
}

// Caller
err := Validate(input)
var validationErr *ValidationError
if errors.As(err, &validationErr) {
	fmt.Printf("Field %s failed: %s\n", validationErr.Field, validationErr.Message)
}
```

## Sentinel Errors

Define package-level sentinel errors:

```go
var (
	ErrUserNotFound    = errors.New("user not found")
	ErrInvalidPassword = errors.New("invalid password")
	ErrEmailTaken      = errors.New("email already taken")
)
```

**Never** add context to sentinel errors:

```go
// ✓ Correct
return ErrUserNotFound

// ✗ Wrong - creates new error
return fmt.Errorf("user not found: %w", ErrUserNotFound)
```

## Error Messages

### Good Error Messages

Error messages should:
- Not start with uppercase (unless proper noun)
- Not end with punctuation
- Be concise but informative
- Include relevant context

```go
// ✓ Good
return fmt.Errorf("failed to connect to database %s: %w", dbHost, err)

// ✗ Bad
return fmt.Errorf("Error occurred while trying to connect to the database at %s: %v", dbHost, err)
```

## Common Patterns

### Early Returns

```go
// ✓ Good - early returns
func Process() error {
	if err := validate(); err != nil {
		return err
	}

	if err := prepare(); err != nil {
		return err
	}

	return execute()
}

// ✗ Worse - deep nesting
func Process() error {
	if err := validate(); err != nil {
		// ...
	} else {
		if err := prepare(); err != nil {
			// ...
		} else {
			return execute()
		}
	}
}
```

### Resource Cleanup

Use `defer` for cleanup:

```go
file, err := os.Open("file.txt")
if err != nil {
	return fmt.Errorf("failed to open file: %w", err)
}
defer file.Close() // Always closed, even on error

// Process file
```

### Temporary Errors (Retry)

Use `errors.Is` to check for temporary errors:

```go
import "net"

err := doSomething()
if err != nil {
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		// Retry
	}
}
```

## What NOT to Do

### Don't Panic

Don't use `panic` for expected errors:

```go
// ✗ Wrong - panic for normal errors
func GetUser(id int) *User {
	if id <= 0 {
		panic("invalid id") // Don't do this!
	}
	// ...
}

// ✓ Correct - return error
func GetUser(id int) (*User, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid id: %d", id)
	}
	// ...
}
```

### Don't Ignore Errors

```go
// ✗ Wrong
file.Close()

// ✓ Correct
if err := file.Close(); err != nil {
	log.Printf("warning: failed to close file: %v", err)
}
```

### Don't Double Log

```go
// ✗ Wrong - log and return
log.Printf("failed to open file: %v", err)
return err // Caller will also log

// ✓ Correct - just return
return fmt.Errorf("failed to open file: %w", err)
```

## Context in Errors

Add helpful context at each layer:

```go
// Layer 1 - Database
func (db *DB) QueryUser(id int) (*User, error) {
	// ...
	return nil, fmt.Errorf("execute query: %w", err)
}

// Layer 2 - Service
func (s *Service) GetUser(id int) (*User, error) {
	user, err := s.db.QueryUser(id)
	if err != nil {
		return nil, fmt.Errorf("query user %d: %w", id, err)
	}
	return user, nil
}

// Layer 3 - Handler
func (h *Handler) HandleGetUser(w http.ResponseWriter, r *http.Request) {
	user, err := h.service.GetUser(123)
	if err != nil {
		http.Error(w, "failed to get user", http.StatusInternalServerError)
		return
	}
	// ...
}
```

<!--
Source references:
- https://go.dev/doc/effective_go#errors
- https://go.dev/blog/go1.13-errors
- https://github.com/golang/go/wiki/CodeReviewComments#error-strings
-->
