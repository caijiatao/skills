---
name: core-channels
description: Channel basics, buffered/unbuffered, and select statements
---

# Core: Channels

## What is a Channel?

A channel is a typed conduit through which you can send and receive values.

```go
ch := make(chan int)  // create channel of ints
ch <- value            // send value
value := <-ch          // receive value
```

## Creating Channels

### Unbuffered Channels

```go
// Unbuffered - synchronous
ch := make(chan int)

// Sender blocks until receiver is ready
go func() {
	ch <- 42  // Will block until someone receives
}()

val := <-ch  // Receive
fmt.Println(val)  // 42
```

### Buffered Channels

```go
// Buffered - asynchronous up to buffer size
ch := make(chan int, 3)

// Sends don't block while buffer has space
ch <- 1  // Doesn't block
ch <- 2  // Doesn't block
ch <- 3  // Doesn't block
// ch <- 4  // Would block - buffer full

// Receives don't block if buffer has data
fmt.Println(<-ch)  // 1
fmt.Println(<-ch)  // 2
fmt.Println(<-ch)  // 3
```

## Channel Direction

### Specify Direction

```go
// Send-only channel
func sender(ch chan<- int) {
	ch <- 42
}

// Receive-only channel
func receiver(ch <-chan int) {
	fmt.Println(<-ch)
}

// Usage
ch := make(chan int)
go sender(ch)
receiver(ch)
```

### Why Direction Matters

```go
// ✓ Clear intent - only sends
func producer(ch chan<- int) {
	for i := 0; i < 10; i++ {
		ch <- i
	}
	// close(ch)  // Can't close send-only (actually you can, but be careful)
}

// ✓ Clear intent - only receives
func consumer(ch <-chan int) {
	for v := range ch {
		fmt.Println(v)
	}
	// Can't close receive-only
}
```

## Closing Channels

### Close from Sender Side

```go
// ✓ Correct - sender closes
func producer(ch chan<- int) {
	for i := 0; i < 5; i++ {
		ch <- i
	}
	close(ch)  // Signal done
}

func consumer(ch <-chan int) {
	for v := range ch {
		fmt.Println(v)  // 0, 1, 2, 3, 4
	}
}
```

### Detect Closed Channel

```go
// Using range (idiomatic)
for val := range ch {
	fmt.Println(val)
}
// Loop exits when channel closed

// Using comma-ok
val, ok := <-ch
if !ok {
	// Channel closed
}
```

### Only Close from Sender

```go
// ✗ Wrong - receiver closes
func receiver(ch <-chan int) {
	val := <-ch
	// close(ch)  // Would panic - can't close receive-only
}

// ✗ Also wrong - multiple senders
func worker(ch chan<- int) {
	ch <- 42
	// close(ch)  // DON'T - other workers might still send
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

### Non-Blocking with Default

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
	fmt.Println("timeout!")
}
```

### Priority Select

```go
for {
	select {
	case high := <-highPriority:
		fmt.Println("high:", high)
	default:
		select {
		case high := <-highPriority:
			fmt.Println("high:", high)
		case low := <-lowPriority:
			fmt.Println("low:", low)
		}
	}
}
```

## Ranging Over Channels

### Idiomatic Pattern

```go
// ✓ Idiomatic - range until channel closed
func main() {
	ch := make(chan int)

	go func() {
		for i := 0; i < 5; i++ {
			ch <- i
		}
		close(ch)  // Signal done
	}()

	for val := range ch {
		fmt.Println(val)
	}
}
```

### Manual Approach

```go
for {
	val, ok := <-ch
	if !ok {
		break  // Channel closed
	}
	fmt.Println(val)
}
```

## Common Patterns

### Semaphore Pattern

```go
// Limit concurrency with buffered channel
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
	return make(chan struct{}, n)
}

func (s Semaphore) Acquire() {
	s <- struct{}{}
}

func (s Semaphore) Release() {
	<-s
}

// Usage
sem := NewSemaphore(3)  // Max 3 concurrent

for i := 0; i < 100; i++ {
	sem.Acquire()
	go func(id int) {
		defer sem.Release()
		doWork(id)
	}(i)
}
```

### Fan-In Pattern

```go
// Merge multiple channels into one
func fanIn(input1, input2 <-chan string) <-chan string {
	output := make(chan string)
	go func() {
		defer close(output)
		for {
			select {
			case s := <-input1:
				output <- s
			case s := <-input2:
				output <- s
			}
		}
	}()
	return output
}
```

### Fan-Out Pattern

```go
// Distribute work to multiple workers
func fanOut(input <-chan int, workers int) []<-chan int {
	outputs := make([]<-chan int, workers)

	for i := 0; i < workers; i++ {
		outputs[i] = worker(input)
	}

	return outputs
}

func worker(input <-chan int) <-chan int {
	output := make(chan int)
	go func() {
		defer close(output)
		for n := range input {
			output <- n * n
		}
	}()
	return output
}
```

## Buffered vs Unbuffered: When to Use

### Use Buffered When:

- You know the buffer size upfront
- Producer and consumer have different rates
- Building pipelines

```go
// ✓ Good use of buffered channel
results := make(chan Result, 100)  // Buffer known work
go process(results)
```

### Use Unbuffered When:

- You need synchronization (handoff)
- Want to guarantee immediate processing

```go
// ✓ Good use of unbuffered channel
ch := make(chan Result)
go func() {
	result := doWork()
	ch <- result  // Blocks until someone receives
}()
handleResult(<-ch)
```

## Channel Gotchas

### Sending on Closed Channel

```go
ch := make(chan int, 1)
close(ch)
// ch <- 42  // PANIC: send on closed channel
```

### Closing Twice

```go
ch := make(chan int)
close(ch)
// close(ch)  // PANIC: close of closed channel
```

### Receiving from Closed Channel

```go
ch := make(chan int, 2)
ch <- 1
ch <- 2
close(ch)

// Still can receive buffered values
fmt.Println(<-ch)  // 1
fmt.Println(<-ch)  // 2

// Now gets zero value
val, ok := <-ch
fmt.Println(val, ok)  // 0 false
```

### Nil Channels

```go
var ch chan int  // nil channel

// <-ch      // Blocks forever
// ch <- 1    // Blocks forever

// Use in select for disabling cases
select {
case v := <-ch:
	fmt.Println(v)  // Never selected if ch is nil
case v := <-otherCh:
	fmt.Println(v)  // This gets selected
}
```

## Best Practices

1. **Close from sender side only**
2. **Use range for receiving**
3. **Specify direction when clear**
4. **Prefer unbuffered unless you need buffering**
5. **Use select for multiple channels**

<!--
Source references:
- https://go.dev/doc/effective_go#channels
- https://go.dev/blog/pipelines
- https://go.dev/ref/spec#Select_statements
-->
