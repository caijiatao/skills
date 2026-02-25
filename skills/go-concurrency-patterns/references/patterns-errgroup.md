---
name: patterns-errgroup
description: Error group pattern for concurrent operations
---

# Pattern: ErrGroup

## What is ErrGroup?

`errgroup.Group` synchronizes goroutine groups:
- Waits for all goroutines to complete
- Cancels all on first error
- Propagates first error

## Basic Usage

### Simple ErrGroup

```go
package main

import (
	"fmt"
	"golang.org/x/sync/errgroup"
	"net/http"
)

func main() {
	g := new(errgroup.Group)

	var urls = []string{
		"http://example.com/",
		"http://google.com/",
		"http://nonexistent.example/",  // This will fail
	}

	for _, url := range urls {
		url := url  // Capture loop variable
		g.Go(func() error {
			resp, err := http.Get(url)
			if err != nil {
				return err  // First error stops all
			}
			resp.Body.Close()
			fmt.Printf("%s: status %d\n", url, resp.StatusCode)
			return nil
		})
	}

	// Wait for all goroutines to complete
	if err := g.Wait(); err != nil {
		fmt.Printf("Error occurred: %v\n", err)
	}
}
```

## ErrGroup with Context

### Context Cancellation on Error

```go
func main() {
	g, ctx := errgroup.WithContext(context.Background())

	// Goroutine 1
	g.Go(func() error {
		time.Sleep(2 * time.Second)
		fmt.Println("Goroutine 1 finished")
		return nil
	})

	// Goroutine 2 - will fail
	g.Go(func() error {
		time.Sleep(1 * time.Second)
		fmt.Println("Goroutine 2 failing")
		return fmt.Errorf("something went wrong")
	})

	// Goroutine 3
	g.Go(func() error {
		<-ctx.Done()  // Will be cancelled when goroutine 2 fails
		fmt.Println("Goroutine 3: context cancelled")
		return ctx.Err()
	})

	if err := g.Wait(); err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}
```

## Parallel Fetching

### Fetch Multiple URLs

```go
func fetchAll(ctx context.Context, urls []string) ([][]byte, error) {
	g, ctx := errgroup.WithContext(ctx)

	results := make([][]byte, len(urls))

	for i, url := range urls {
		i, url := i, url  // Capture loop variables

		g.Go(func() error {
			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				return fmt.Errorf("creating request for %s: %w", url, err)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return fmt.Errorf("fetching %s: %w", url, err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return fmt.Errorf("%s returned status %d", url, resp.StatusCode)
			}

			data, err := io.ReadAll(resp.Body)
			if err != nil {
				return fmt.Errorf("reading %s: %w", url, err)
			}

			results[i] = data
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}
```

## Rate Limiting with ErrGroup

### Limit Concurrency

```go
func fetchWithLimit(ctx context.Context, urls []string, limit int) ([][]byte, error) {
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(limit)  // Max concurrent goroutines

	results := make([][]byte, len(urls))
	var mu sync.Mutex

	for i, url := range urls {
		i, url := i, url

		g.Go(func() error {
			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				return err
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return err
			}
			defer resp.Body.Close()

			data, err := io.ReadAll(resp.Body)
			if err != nil {
				return err
			}

			mu.Lock()
			results[i] = data
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}

func main() {
	urls := []string{
		"http://example.com/1",
		"http://example.com/2",
		"http://example.com/3",
		// ... 100 URLs
	}

	results, err := fetchWithLimit(context.Background(), urls, 10)  // Max 10 concurrent
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Fetched %d URLs\n", len(results))
}
```

## Pipeline with ErrGroup

### Multi-Stage Pipeline

```go
func pipeline(ctx context.Context, input []int) ([]int, error) {
	g, ctx := errgroup.WithContext(ctx)

	// Stage 1: Generate numbers
	stage1 := make(chan int, 10)
	g.Go(func() error {
		defer close(stage1)
		for _, n := range input {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case stage1 <- n:
			}
		}
		return nil
	})

	// Stage 2: Square numbers
	stage2 := make(chan int, 10)
	g.Go(func() error {
		defer close(stage2)
		for n := range stage1 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case stage2 <- n * n:
			}
		}
		return nil
	})

	// Stage 3: Collect results
	var results []int
	g.Go(func() error {
		for n := range stage2 {
			results = append(results, n)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}
```

## Processing Batches

### Batch Processing with Error Handling

```go
func processBatch(ctx context.Context, items []Item) ([]Result, error) {
	g, ctx := errgroup.WithContext(ctx)

	batchSize := 10
	var results []Result
	var mu sync.Mutex

	for i := 0; i < len(items); i += batchSize {
		batch := items[i:min(i+batchSize, len(items))]

		batch := batch  // Capture
		g.Go(func() error {
			batchResults, err := processItems(ctx, batch)
			if err != nil {
				return fmt.Errorf("processing batch starting at %d: %w", i, err)
			}

			mu.Lock()
			results = append(results, batchResults...)
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}
```

## Retry with ErrGroup

### Retry Failed Operations

```go
func fetchWithRetry(ctx context.Context, url string, maxRetries int) error {
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return err
		}

		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
			lastErr = fmt.Errorf("status %d", resp.StatusCode)
		} else {
			lastErr = err
		}

		// Wait before retry
		select {
		case <-time.After(time.Second):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return lastErr
}

func fetchAllWithRetry(ctx context.Context, urls []string) error {
	g, ctx := errgroup.WithContext(ctx)

	for _, url := range urls {
		url := url
		g.Go(func() error {
			return fetchWithRetry(ctx, url, 3)
		})
	}

	return g.Wait()
}
```

## Resource Cleanup

### Cleanup on Error

```go
func processWithCleanup(ctx context.Context, items []Item) error {
	g, ctx := errgroup.WithContext(ctx)

	// Resources to cleanup
	var resources []io.Closer
	var mu sync.Mutex

	for _, item := range items {
		item := item
		g.Go(func() error {
			resource, err := openResource(item)
			if err != nil {
				return err
			}

			mu.Lock()
			resources = append(resources, resource)
			mu.Unlock()

			// Process resource
			if err := processResource(resource); err != nil {
				return err
			}

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		// Cleanup all resources on error
		for _, res := range resources {
			res.Close()
		}
		return err
	}

	return nil
}
```

## Best Practices

1. **Capture loop variables** - `i, url := i, url`
2. **Use context** - `errgroup.WithContext`
3. **Limit concurrency** - `g.SetLimit(n)`
4. **Check error** - Always check `g.Wait()`
5. **Cancel on error** - Context auto-cancelled
6. **Share data safely** - Use mutex for shared state

## Gotchas

### Not Capturing Loop Variables

```go
// ✗ Wrong - all goroutines use last value
for _, url := range urls {
	g.Go(func() error {
		return fetch(url)  // Always uses last URL
	})
}

// ✓ Correct
for _, url := range urls {
	url := url  // Capture
	g.Go(func() error {
		return fetch(url)
	})
}
```

### Ignoring Context Cancellation

```go
// ✗ Wrong - doesn't check context
g.Go(func() error {
	for {
		doWork()  // Never stops!
	}
})

// ✓ Correct
g.Go(func() error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			doWork()
		}
	}
})
```

### Data Race on Shared State

```go
// ✗ Wrong - data race
results := []int{}
for _, n := range nums {
	g.Go(func() error {
		results = append(results, n)  // DATA RACE!
		return nil
	})
}

// ✓ Correct
var results []int
var mu sync.Mutex
for _, n := range nums {
	g.Go(func() error {
		mu.Lock()
		results = append(results, n)
		mu.Unlock()
		return nil
	})
}
```

<!--
Source references:
- https://pkg.go.dev/golang.org/x/sync/errgroup
- https://go.dev/blog/context
-->
