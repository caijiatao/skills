---
name: core-goroutines
description: Goroutine basics and lifecycle management
---

# Core: Goroutines

## What is a Goroutine?

A goroutine is a lightweight thread managed by the Go runtime.

```go
go f()  // run f concurrently; don't wait for it to return.
```

## Creating Goroutines

### Basic Syntax

```go
// Function call
func hello() {
	fmt.Println("hello")
}

go hello()  // runs concurrently

// Anonymous function
go func() {
	fmt.Println("anonymous")
}()

// With parameters
go func(msg string) {
	fmt.Println(msg)
}("hello world")
```

### Multiple Goroutines

```go
func main() {
	go say("hello")
	go say("world")

	// Wait for goroutines (using time.Sleep is not production code!)
	time.Sleep(time.Second)
}

func say(s string) {
	for i := 0; i < 5; i++ {
		time.Sleep(100 * time.Millisecond)
		fmt.Println(s)
	}
}
```

## Goroutine Lifecycle

### A Realistic Example

```go
// ✓ Good - goroutine with controlled lifecycle
func worker(ctx context.Context, jobs <-chan int, results chan<- int) {
	for {
		select {
		case <-ctx.Done():
			return  // Exit on context cancellation
		case job, ok := <-jobs:
			if !ok {
				return  // Exit when channel closed
			}
			results <- job * 2
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	jobs := make(chan int)
	results := make(chan int)

	// Start workers
	for i := 0; i < 3; i++ {
		go worker(ctx, jobs, results)
	}

	// Send work
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)  // Signal done

	// Collect results
	for i := 0; i < 5; i++ {
		fmt.Println(<-results)
	}
}
```

### Common Pitfall: Goroutine Leaks

```go
// ✗ Bad - goroutine that never exits
func leak() {
	ch := make(chan int)
	go func() {
		val := <-ch  // Blocks forever
		fmt.Println(val)
	}()
	// ch is never sent to or closed
	// Goroutine leaks forever
}

// ✓ Good - can exit
func noLeak() {
	ch := make(chan int)
	go func() {
		val := <-ch
		fmt.Println(val)
	}()
	ch <- 42  // Send value
	// Goroutine completes and exits
}
```

## Goroutine Scheduling

### Goroutines are Green Threads

- Managed by Go runtime, not OS
- M:N scheduling - M goroutines mapped to N OS threads
- Start with ~2KB stack (vs ~2MB for OS threads)
- Stack grows and shrinks as needed

### GOMAXPROCS

```go
// Use all available CPUs (default since Go 1.5)
runtime.GOMAXPROCS(0)

// Set to specific number
runtime.GOMAXPROCS(4)

// Check current value
n := runtime.GOMAXPROCS(0)
```

## Best Practices

### 1. Always Have Exit Path

```go
// ✓ Good - clear exit conditions
func worker(stop <-chan struct{}) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			doWork()
		}
	}
}
```

### 2. Use Context for Cancellation

```go
func worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return  // Exit on cancel
		default:
			doWork()
		}
	}
}
```

### 3. Don't Create Goroutines You Can't Control

```go
// ✗ Questionable - fire and forget
go func() {
	// Who monitors this?
	doSomethingUnmonitored()
}()

// ✓ Better - controlled lifecycle
go func() {
	for {
		select {
		case <-ctx.Done():
			return
		case task := <-tasks:
			process(task)
		}
	}
}()
```

### 4. Be Careful with Goroutines in Loops

```go
// ✗ Classic mistake - all goroutines use same loop variable
for i := 0; i < 3; i++ {
	go func() {
		fmt.Println(i)  // All print 3
	}()
}

// ✓ Fix 1 - pass parameter
for i := 0; i < 3; i++ {
	go func(n int) {
		fmt.Println(n)  // 0, 1, 2
	}(i)
}

// ✓ Fix 2 - local variable
for i := 0; i < 3; i++ {
	i := i  // Create new variable each iteration
	go func() {
		fmt.Println(i)  // 0, 1, 2
	}()
}
```

## Common Patterns

### Background Processing

```go
func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	results := processInBackground(ctx)

	// Do other work
	time.Sleep(2 * time.Second)

	// Get result if ready
	select {
	case result := <-results:
		fmt.Println("Result:", result)
	case <-ctx.Done():
		fmt.Println("Timed out")
	}
}

func processInBackground(ctx context.Context) <-chan string {
	out := make(chan string)
	go func() {
		defer close(out)
		// Simulate work
		time.Sleep(3 * time.Second)
		select {
		case out <- "done":
		case <-ctx.Done():
			return
		}
	}()
	return out
}
```

### Fan-Out (Multiple Workers)

```go
func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	// Start 3 workers
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	// Send 9 jobs
	for j := 1; j <= 9; j++ {
		jobs <- j
	}
	close(jobs)

	// Collect 9 results
	for a := 1; a <= 9; a++ {
		<-results
	}
}

func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		fmt.Printf("worker %d processing job %d\n", id, j)
		results <- j * 2
	}
}
```

## Inspecting Goroutines

### Runtime Stats

```go
func main() {
	fmt.Printf("Goroutines: %d\n", runtime.NumGoroutine())

	go func() {
		time.Sleep(time.Second)
	}()

	fmt.Printf("Goroutines after spawn: %d\n", runtime.NumGoroutine())
}
```

### Goroutine Dump

Send `SIGQUIT` (Ctrl+\ on Unix) to get goroutine stack traces.

Or programmatically:

```go
buf := make([]byte, 1<<16)
runtime.Stack(buf, true)
fmt.Print(string(buf))
```

<!--
Source references:
- https://go.dev/tour/concurrency/1
- https://go.dev/doc/effective_go#goroutines
- https://go.dev/blog/concurrency-time
-->
