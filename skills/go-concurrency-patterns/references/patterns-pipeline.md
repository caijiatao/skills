---
name: patterns-pipeline
description: Pipeline pattern with fan-out and fan-in
---

# Pattern: Pipeline

## What is a Pipeline?

A pipeline connects stages where each stage receives input, processes it, and sends output to the next stage.

## Basic Pipeline

### Linear Pipeline

```go
// Stage 1: Generate numbers
func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

// Stage 2: Square numbers
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}

// Stage 3: Print results
func print(in <-chan int) {
	for n := range in {
		fmt.Println(n)
	}
}

// Usage
func main() {
	// Chain stages: generate -> square -> print
	print(square(generate(1, 2, 3, 4, 5)))
	// Output: 1, 4, 9, 16, 25
}
```

## Fan-Out

Distribute work to multiple goroutines:

```go
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}

func main() {
	in := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

	// Fan-out to multiple squarers
	c1 := square(in)
	c2 := square(in)
	c3 := square(in)

	// Each will process some of the input
	for n := range merge(c1, c2, c3) {
		fmt.Println(n)
	}
}
```

## Fan-In

Merge multiple channels into one:

```go
func merge(cs ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	out := make(chan int)

	// Start output goroutine for each input channel
	output := func(c <-chan int) {
		defer wg.Done()
		for n := range c {
			out <- n
		}
	}

	wg.Add(len(cs))
	for _, c := range cs {
		go output(c)
	}

	// Wait for all inputs to finish
	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

// Usage
func main() {
	c1 := generate(1, 2, 3)
	c2 := generate(4, 5, 6)
	c3 := generate(7, 8, 9)

	// Fan-in: merge three channels
	for n := range merge(c1, c2, c3) {
		fmt.Println(n)
	}
}
```

## Complete Pipeline Example

### Multi-Stage Pipeline

```go
package main

import (
	"fmt"
	"sync"
)

// Stage 1: Generate numbers
func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

// Stage 2: Filter odd numbers
func filterOdd(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			if n%2 == 0 {
				out <- n
			}
		}
	}()
	return out
}

// Stage 3: Square numbers (fan-out)
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}

// Stage 4: Merge results (fan-in)
func merge(cs ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	out := make(chan int)

	output := func(c <-chan int) {
		defer wg.Done()
		for n := range c {
			out <- n
		}
	}

	wg.Add(len(cs))
	for _, c := range cs {
		go output(c)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

// Stage 5: Format results
func format(in <-chan int) <-chan string {
	out := make(chan string)
	go func() {
		defer close(out)
		for n := range in {
			out <- fmt.Sprintf("Result: %d", n)
		}
	}()
	return out
}

func main() {
	// Create pipeline: generate -> filter -> [square, square] -> merge -> format
	nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
	even := filterOdd(nums)

	// Fan-out
	sq1 := square(even)
	sq2 := square(even)

	// Fan-in
	merged := merge(sq1, sq2)

	// Format
	formatted := format(merged)

	// Print results
	for result := range formatted {
		fmt.Println(result)
	}
}
```

## Pipeline with Context

### Cancellable Pipeline

```go
func generateCtx(ctx context.Context, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			select {
			case <-ctx.Done():
				return
			case out <- n:
			}
		}
	}()
	return out
}

func squareCtx(ctx context.Context, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			select {
			case <-ctx.Done():
				return
			case out <- n * n:
			}
		}
	}()
	return out
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())

	nums := generateCtx(ctx, 1, 2, 3, 4, 5)
	squared := squareCtx(ctx, nums)

	// Consume some results
	for i := 0; i < 3; i++ {
		fmt.Println(<-squared)
	}

	// Cancel pipeline
	cancel()
}
```

## Pipeline with Error Handling

### Stages That Can Fail

```go
type Result struct {
	Value int
	Err   error
}

func squareWithErrors(in <-chan int) <-chan Result {
	out := make(chan Result)
	go func() {
		defer close(out)
		for n := range in {
			if n < 0 {
				out <- Result{Err: fmt.Errorf("negative number: %d", n)}
				continue
			}
			out <- Result{Value: n * n}
		}
	}()
	return out
}

func main() {
	nums := generate(1, -2, 3, -4, 5)
	results := squareWithErrors(nums)

	for result := range results {
		if result.Err != nil {
			fmt.Printf("Error: %v\n", result.Err)
		} else {
			fmt.Printf("Result: %d\n", result.Value)
		}
	}
}
```

## Batching Pipeline

### Batch Processing

```go
func batch(in <-chan int, batchSize int) <-chan []int {
	out := make(chan []int)
	go func() {
		defer close(out)
		batch := make([]int, 0, batchSize)
		for n := range in {
			batch = append(batch, n)
			if len(batch) == batchSize {
				out <- batch
				batch = make([]int, 0, batchSize)
			}
		}
		if len(batch) > 0 {
			out <- batch
		}
	}()
	return out
}

func processBatch(in <-chan []int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for batch := range in {
			// Process entire batch
			sum := 0
			for _, n := range batch {
				sum += n
			}
			out <- sum
		}
	}()
	return out
}

func main() {
	nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
	batches := batch(nums, 3)
	sums := processBatch(batches)

	for sum := range sums {
		fmt.Println("Batch sum:", sum)
	}
}
```

## Pipeline Patterns

### Map-Reduce Pattern

```go
// Map: Apply function to each item
func mapChan(in <-chan int, fn func(int) int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- fn(n)
		}
	}()
	return out
}

// Reduce: Reduce to single value
func reduce(in <-chan int, initial int, fn func(a, b int) int) int {
	result := initial
	for n := range in {
		result = fn(result, n)
	}
	return result
}

func main() {
	nums := generate(1, 2, 3, 4, 5)

	// Map: square each number
	squared := mapChan(nums, func(n int) int {
		return n * n
	})

	// Reduce: sum all
	sum := reduce(squared, 0, func(a, b int) int {
		return a + b
	})

	fmt.Println("Sum of squares:", sum)
	// Output: Sum of squares: 55 (1+4+9+16+25)
}
```

## Best Practices

1. **Close channels** when done sending
2. **Use separate goroutines** for each stage
3. **Fan-out for CPU-bound** work
4. **Fan-in to collect** results
5. **Add context** for cancellation
6. **Handle errors** in pipeline
7. **Use buffered channels** for throughput

## Pipeline Gotchas

### Blocking Stage

```go
// ✗ Problem: Slow stage blocks entire pipeline
func slowStage(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			time.Sleep(1 * time.Second)  // Too slow!
			out <- n
		}
		close(out)
	}()
	return out
}

// ✓ Solution: Fan-out to multiple workers
func fastStage(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		var wg sync.WaitGroup
		for i := 0; i < 5; i++ {  // 5 workers
			wg.Add(1)
			go func() {
				defer wg.Done()
				for n := range in {
					time.Sleep(1 * time.Second)
					out <- n
				}
			}()
		}
		wg.Wait()
		close(out)
	}()
	return out
}
```

### Goroutine Leaks

```go
// Always ensure stages can exit
func goodStage(ctx context.Context, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for {
			select {
			case <-ctx.Done():
				return
			case n, ok := <-in:
				if !ok {
					return
				}
				out <- n
			}
		}
	}()
	return out
}
```

<!--
Source references:
- https://go.dev/blog/pipelines
- https://go.dev/doc/effective_go#concurrency
-->
