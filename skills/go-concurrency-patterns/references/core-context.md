---
name: core-context
description: Context for cancellation, timeouts, and deadlines
---

# Core: Context

## What is Context?

Package `context` defines the `Context` type, which carries deadlines, cancellation signals, and other request-scoped values.

## Creating Contexts

### Background Context

```go
// Background context - never cancelled
ctx := context.Background()

// TODO context - for uncertain which to use
ctx := context.TODO()
```

### With Cancel

```go
ctx, cancel := context.WithCancel(context.Background())

// Use context
go doWork(ctx)

// Cancel when done
cancel()  // Signals all goroutines using ctx to stop
```

### With Timeout

```go
// Cancel after timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()  // Always call cancel to release resources

select {
case <-ctx.Done():
	fmt.Println("timed out:", ctx.Err())
}
```

### With Deadline

```go
// Cancel at specific time
deadline := time.Date(2026, 12, 31, 23, 59, 59, 0, time.UTC)
ctx, cancel := context.WithDeadline(context.Background(), deadline)
defer cancel()
```

### With Value

```go
type contextKey string

const userIDKey contextKey = "userID"

ctx := context.WithValue(context.Background(), userIDKey, "12345")

// Retrieve value
if userID := ctx.Value(userIDKey); userID != nil {
	fmt.Println("User ID:", userID.(string))
}
```

## Using Context

### Check for Cancellation

```go
func worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			// Context cancelled
			fmt.Println("worker stopped:", ctx.Err())
			return
		default:
			// Continue working
			doWork()
		}
	}
}
```

### Propagating Context

```go
func handleRequest(w http.ResponseWriter, r *http.Request) {
	// Start from request context
	ctx := r.Context()

	// Add timeout
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Pass to sub-operations
	result, err := fetchData(ctx)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			http.Error(w, "timeout", http.StatusRequestTimeout)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result)
}

func fetchData(ctx context.Context) ([]byte, error) {
	// Check context before expensive operation
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Do work...
	return data, nil
}
```

## Common Patterns

### HTTP Handler with Timeout

```go
func handler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	data, err := slowOperation(ctx)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			http.Error(w, "timeout", http.StatusRequestTimeout)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	json.NewEncoder(w).Encode(data)
}
```

### Cancellable Workers

```go
type Server struct {
	done chan struct{}
}

func (s *Server) Start() {
	ctx, cancel := context.WithCancel(context.Background())

	// Start workers
	for i := 0; i < 5; i++ {
		go s.worker(ctx, i)
	}

	// Save cancel for shutdown
	s.cancel = cancel
}

func (s *Server) worker(ctx context.Context, id int) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Printf("worker %d stopping\n", id)
			return
		case <-ticker.C:
			fmt.Printf("worker %d working\n", id)
		}
	}
}

func (s *Server) Shutdown() {
	if s.cancel != nil {
		s.cancel()  // Cancel context to stop all workers
	}
}
```

### Context with Values

```go
type contextKey string

const (
	userIDKey   contextKey = "userID"
	requestIDKey contextKey = "requestID"
)

func middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Add values to context
		ctx := context.WithValue(r.Context(), userIDKey, "123")
		ctx = context.WithValue(ctx, requestIDKey, uuid.New().String())

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func handler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve values
	userID := ctx.Value(userIDKey).(string)
	requestID := ctx.Value(requestIDKey).(string)

	log.Printf("User %s, request %s", userID, requestID)
}
```

## Context Tree

```
context.Background()
    |
    +-- WithCancel(ctx)
    |       |
    |       +-- WithTimeout(ctx, 5*time.Second)
    |       |
    |       +-- WithValue(ctx, key, value)
    |
    +-- WithTimeout(ctx, 10*time.Second)
            |
            +-- WithCancel(ctx)
```

Cancelling a parent cancels all its children.

## Best Practices

### 1. Always Call Cancel

```go
// ✓ Correct
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()  // Release resources

// Use ctx...

// ✗ Wrong - resource leak
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// forgot to call cancel()
```

### 2. Pass Context as First Parameter

```go
// ✓ Idiomatic
func ProcessUser(ctx context.Context, userID string) (*User, error) {
	// ...
}

// ✗ Non-idiomatic
func ProcessUser(userID string, ctx context.Context) (*User, error) {
	// ...
}
```

### 3. Don't Store Context in Structs

```go
// ✗ Wrong - don't store context
type Service struct {
	ctx context.Context
}

// ✓ Correct - pass as parameter
func (s *Service) Process(ctx context.Context) error {
	// ...
}
```

### 4. Use context.Background() at Entry Points

```go
// In main, HTTP handlers, RPC handlers
func main() {
	ctx := context.Background()
	// Or use context.TODO() if uncertain
	run(ctx)
}

func handler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()  // Start from request context
	// ...
}
```

### 5. Check Context Periodically

```go
func processLargeFile(ctx context.Context, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		// Check context every iteration
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		line := scanner.Text()
		processLine(line)
	}

	return scanner.Err()
}
```

## Context Errors

```go
select {
case <-ctx.Done():
	switch ctx.Err() {
	case context.Canceled:
		fmt.Println("explicitly cancelled")
	case context.DeadlineExceeded:
		fmt.Println("timeout or deadline passed")
	}
}
```

## When to Use Context

- Cancellation: Stop long-running operations
- Timeouts: Prevent operations from running too long
- Deadlines: Set specific time limits
- Values: Pass request-scoped data

## When NOT to Use Context

- As a global repository for all data
- To pass optional parameters
- For storing mutable state (context values are immutable)

<!--
Source references:
- https://go.dev/pkg/context
- https://go.dev/blog/context
- https://go.dev/doc/effective_go#interfaces_and_types
-->
