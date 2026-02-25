---
name: core-concurrency
description: Go concurrency basics: channels vs mutexes
---

# Core: Concurrency

## The Go Mantra

```
Don't communicate by sharing memory;
share memory by communicating.
```

## Goroutines

### Spawning Goroutines

Use `go` keyword to spawn a goroutine:

```go
// Function call
go doSomething()

// Anonymous function
go func() {
	fmt.Println("running in goroutine")
}()

// With parameters
go func(msg string) {
	fmt.Println(msg)
}("hello")
```

### Goroutine Lifecycle

Always ensure goroutines can exit:

```go
// ✓ Good - goroutine exits when done
func worker() {
	for {
		// Do work
		select {
		case <-done:
			return // Exit gracefully
		default:
			// Continue work
		}
	}
}

// ✗ Bad - goroutine never exits
func worker() {
	for {
		// Do work forever - no way to stop
	}
}
```

## Channels

### Creating Channels

```go
// Unbuffered channel (synchronous)
ch := make(chan int)

// Buffered channel
ch := make(chan int, 10)

// Send
ch <- 42

// Receive
value := <-ch

// Close (only sender should close)
close(ch)
```

### Buffered vs Unbuffered

```go
// Unbuffered - sender blocks until receiver ready
ch1 := make(chan int)
go func() {
	ch1 <- 1      // Blocks until someone receives
}()
value := <-ch1  // Receive

// Buffered - sender blocks only when buffer full
ch2 := make(chan int, 3)
ch2 <- 1  // Doesn't block (buffer has space)
ch2 <- 2  // Doesn't block
ch2 <- 3  // Doesn't block
// ch2 <- 4  // Would block - buffer full
```

### Directional Channels

Restrict channel direction for clarity:

```go
// Send-only channel
func sender(ch chan<- int) {
	ch <- 42
}

// Receive-only channel
func receiver(ch <-chan int) {
	value := <-ch
	fmt.Println(value)
}

// Usage
ch := make(chan int)
go sender(ch)
receiver(ch)
```

### Ranging Over Channels

```go
// ✓ Idiomatic - range until channel closed
ch := make(chan int)

go func() {
	for i := 0; i < 5; i++ {
		ch <- i
	}
	close(ch) // Signal done
}()

for value := range ch {
	fmt.Println(value) // 0, 1, 2, 3, 4
}

// ✗ Manual approach - more error-prone
for {
	value, ok := <-ch
	if !ok {
		break // Channel closed
	}
	fmt.Println(value)
}
```

## Select

### Basic Select

Wait on multiple channel operations:

```go
select {
case msg := <-ch1:
	fmt.Println("from ch1:", msg)
case msg := <-ch2:
	fmt.Println("from ch2:", msg)
case val := <-ch3:
	fmt.Println("from ch3:", val)
}
```

### Non-Blocking Operations

Use `default` for non-blocking:

```go
select {
case msg := <-ch:
	fmt.Println("received:", msg)
default:
	fmt.Println("no message available")
}
```

### Timeout

```go
select {
case result := <-ch:
	fmt.Println("result:", result)
case <-time.After(5 * time.Second):
	fmt.Println("timeout")
}
```

## Mutex

### When to Use Mutex

Use mutex when:
- Protecting complex state
- Performance is critical
- Sharing memory is simpler than channels

```go
type SafeCounter struct {
	mu    sync.Mutex
	count int
}

func (c *SafeCounter) Increment() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.count++
}

func (c *SafeCounter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.count
}
```

### RWMutex

Use `RWMutex` when reads greatly outnumber writes:

```go
type Config struct {
	mu    sync.RWMutex
	value string
}

func (c *Config) Get() string {
	c.mu.RLock()         // Read lock
	defer c.mu.RUnlock()
	return c.value
}

func (c *Config) Set(v string) {
	c.mu.Lock()          // Write lock
	defer c.mu.Unlock()
	c.value = v
}
```

## Channels vs Mutex

### Prefer Channels When:

- Passing ownership of data
- Distributing work
- Communicating between goroutines
- Building pipelines

```go
// ✓ Good use of channels
func worker(jobs <-chan Job, results chan<- Result) {
	for job := range jobs {
		results <- process(job)
	}
}
```

### Prefer Mutex When:

- Protecting complex internal state
- Caching or memoization
- Performance-critical sections

```go
// ✓ Good use of mutex
type Cache struct {
	mu    sync.Mutex
	items map[string]interface{}
}

func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	item, ok := c.items[key]
	return item, ok
}
```

## sync.WaitGroup

Wait for multiple goroutines to complete:

```go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
	wg.Add(1) // Increment counter
	go func(id int) {
		defer wg.Done() // Decrement when done
		fmt.Printf("worker %d\n", id)
	}(i)
}

wg.Wait() // Wait for all
fmt.Println("all workers done")
```

## sync.Once

Do something exactly once:

```go
var (
	once   sync.Once
	config *Config
)

func GetConfig() *Config {
	once.Do(func() {
		config = loadConfig()
	})
	return config
}
```

## Common Patterns

### Worker Pool

```go
func worker(id int, jobs <-chan Job, results chan<- Result) {
	for job := range jobs {
		results <- process(job)
	}
}

func main() {
	jobs := make(chan Job, 100)
	results := make(chan Result, 100)

	// Start workers
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	// Send jobs
	for j := 1; j <= 9; j++ {
		jobs <- Job{j}
	}
	close(jobs)

	// Collect results
	for a := 1; a <= 9; a++ {
		<-results
	}
}
```

### Pipeline

```go
// Stage 1: Generate
func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

// Stage 2: Square
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}

// Usage
for n := range square(generate(1, 2, 3, 4, 5)) {
	fmt.Println(n)
}
```

## Pitfalls to Avoid

### Goroutine Leaks

Always ensure goroutines can exit:

```go
// ✗ Bad - goroutine leaks if timeout happens
go func() {
	<-time.After(10 * time.Minute)
	doSomething()
}()

// ✓ Good - can be cancelled
go func() {
	select {
	case <-time.After(10 * time.Minute):
		doSomething()
	case <-ctx.Done():
		return // Exit on cancel
	}
}()
```

### Forgetting to Close

Close channels when done:

```go
// ✓ Correct
go func() {
	for _, item := range items {
		ch <- item
	}
	close(ch) // Signal done
}()

// Receiver can range
for item := range ch {
	fmt.Println(item)
}
```

### Closing from Receiver

Never close from receiver side:

```go
// ✗ Wrong - close from sender side only
go func() {
	for item := range ch {
		// ...
	}
	close(ch) // PANIC if already closed!
}()
```

### Data Races

Use `go run -race` to detect:

```bash
go run -race main.go
go test -race ./...
```

<!--
Source references:
- https://go.dev/doc/effective_go#concurrency
- https://go.dev/blog/pipelines
-->
