---
name: patterns-worker-pool
description: Worker pool pattern for concurrent processing
---

# Pattern: Worker Pool

## What is a Worker Pool?

A worker pool is a set of goroutines that process work from a shared queue.

## Basic Worker Pool

### Structure

```go
func worker(id int, jobs <-chan Job, results chan<- Result) {
	for job := range jobs {
		results <- processJob(job)
	}
}

func main() {
	jobs := make(chan Job, 100)
	results := make(chan Result, 100)

	// Start workers
	for w := 1; w <= 5; w++ {
		go worker(w, jobs, results)
	}

	// Send jobs
	for j := 1; j <= 20; j++ {
		jobs <- Job{j}
	}
	close(jobs)

	// Collect results
	for a := 1; a <= 20; a++ {
		<-results
	}
}
```

## Complete Example

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Job struct {
	ID   int
	Data string
}

type Result struct {
	JobID  int
	Output string
	Err    error
}

func worker(id int, jobs <-chan Job, wg *sync.WaitGroup, results chan<- Result) {
	defer wg.Done()
	for job := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, job.ID)
		time.Sleep(100 * time.Millisecond) // Simulate work
		results <- Result{
			JobID:  job.ID,
			Output: fmt.Sprintf("Processed: %s", job.Data),
		}
		fmt.Printf("Worker %d finished job %d\n", id, job.ID)
	}
}

func main() {
	// Create channels
	jobs := make(chan Job, 100)
	results := make(chan Result, 100)

	// Number of workers
	numWorkers := 3

	var wg sync.WaitGroup

	// Start workers
	for i := 1; i <= numWorkers; i++ {
		wg.Add(1)
		go worker(i, jobs, &wg, results)
	}

	// Send jobs
	numJobs := 10
	go func() {
		for j := 1; j <= numJobs; j++ {
			jobs <- Job{ID: j, Data: fmt.Sprintf("job-%d", j)}
		}
		close(jobs)
	}()

	// Wait for workers to finish in background
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	for result := range results {
		fmt.Printf("Result: %+v\n", result)
	}

	fmt.Println("All jobs completed")
}
```

## Worker Pool with Context

### Cancellable Worker Pool

```go
func worker(ctx context.Context, id int, jobs <-chan Job, results chan<- Result) {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d stopping\n", id)
			return
		case job, ok := <-jobs:
			if !ok {
				return // Channel closed
			}
			results <- processJob(job)
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	jobs := make(chan Job, 100)
	results := make(chan Result, 100)

	// Start workers
	for w := 1; w <= 3; w++ {
		go worker(ctx, w, jobs, results)
	}

	// Send jobs
	go func() {
		for j := 1; j <= 20; j++ {
			jobs <- Job{ID: j}
		}
		close(jobs)
	}()

	// Can cancel to stop all workers
	// cancel()

	// Collect results...
}
```

### Worker Pool with Timeout

```go
func workerWithTimeout(ctx context.Context, id int, jobs <-chan Job, results chan<- Result) {
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}

			// Process with per-job timeout
			result := make(chan Result, 1)
			go func() {
				result <- processJob(job)
			}()

			select {
			case r := <-result:
				results <- r
			case <-time.After(5 * time.Second):
				results <- Result{
					JobID: job.ID,
					Err:   fmt.Errorf("timeout processing job %d", job.ID),
				}
			}
		}
	}
}
```

## Worker Pool with Results

### Return Results in Order

```go
func worker(id int, jobs <-chan int, results chan<- int) {
	for n := range jobs {
		results <- n * n
	}
}

func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	// Start workers
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	// Send jobs
	for j := 1; j <= 10; j++ {
		jobs <- j
	}
	close(jobs)

	// Collect results
	for i := 1; i <= 10; i++ {
		fmt.Println(<-results)
	}
}
```

### Collect Results into Slice

```go
func processConcurrently(items []Item, numWorkers int) []Result {
	jobs := make(chan Item, len(items))
	results := make(chan Result, len(items))

	// Start workers
	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for item := range jobs {
				results <- processItem(item)
			}
		}()
	}

	// Send jobs
	for _, item := range items {
		jobs <- item
	}
	close(jobs)

	// Wait for completion
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var output []Result
	for result := range results {
		output = append(output, result)
	}

	return output
}
```

## Worker Pool with Error Handling

```go
func worker(id int, jobs <-chan Job, results chan<- Result) {
	for job := range jobs {
		result, err := processJob(job)
		results <- Result{
			JobID:  job.ID,
			Output: result,
			Err:    err,
		}
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
	for j := 1; j <= 20; j++ {
		jobs <- Job{ID: j}
	}
	close(jobs)

	// Collect results and handle errors
	for i := 1; i <= 20; i++ {
		result := <-results
		if result.Err != nil {
			fmt.Printf("Job %d failed: %v\n", result.JobID, result.Err)
		} else {
			fmt.Printf("Job %d succeeded: %s\n", result.JobID, result.Output)
		}
	}
}
```

## Dynamic Worker Pool

```go
type WorkerPool struct {
	jobs    chan Job
	results chan Result
	workers int
	wg      sync.WaitGroup
	ctx     context.Context
	cancel  context.CancelFunc
}

func NewWorkerPool(numWorkers int, bufferSize int) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WorkerPool{
		jobs:    make(chan Job, bufferSize),
		results: make(chan Result, bufferSize),
		workers: numWorkers,
		ctx:     ctx,
		cancel:  cancel,
	}
}

func (p *WorkerPool) Start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

func (p *WorkerPool) worker(id int) {
	defer p.wg.Done()
	for {
		select {
		case <-p.ctx.Done():
			return
		case job, ok := <-p.jobs:
			if !ok {
				return
			}
			p.results <- processJob(job)
		}
	}
}

func (p *WorkerPool) Submit(job Job) {
	p.jobs <- job
}

func (p *WorkerPool) Results() <-chan Result {
	return p.results
}

func (p *WorkerPool) Stop() {
	close(p.jobs)
	p.wg.Wait()
	close(p.results)
	p.cancel()
}

func (p *WorkerPool) Shutdown() {
	p.cancel()  // Cancel context
	close(p.jobs)
	p.wg.Wait()
	close(p.results)
}

// Usage
func main() {
	pool := NewWorkerPool(5, 100)
	pool.Start()

	// Submit jobs
	for i := 0; i < 100; i++ {
		pool.Submit(Job{ID: i})
	}
	close(pool.jobs)

	// Collect results
	for result := range pool.Results() {
		fmt.Println(result)
	}
}
```

## Batching with Worker Pool

```go
func batchWorker(id int, batches <-chan []Item, results chan<- []Result) {
	for batch := range batches {
		var batchResults []Result
		for _, item := range batch {
			batchResults = append(batchResults, processItem(item))
		}
		results <- batchResults
	}
}

func main() {
	items := generateItems(1000)
	batchSize := 50

	batches := make(chan []Item, 10)
	results := make(chan []Result, 10)

	// Start workers
	for w := 1; w <= 3; w++ {
		go batchWorker(w, batches, results)
	}

	// Send batches
	go func() {
		for i := 0; i < len(items); i += batchSize {
			end := i + batchSize
			if end > len(items) {
				end = len(items)
			}
			batches <- items[i:end]
		}
		close(batches)
	}()

	// Collect results
	var allResults []Result
	for i := 0; i < (len(items)+batchSize-1)/batchSize; i++ {
		batchResults := <-results
		allResults = append(allResults, batchResults...)
	}

	fmt.Printf("Processed %d items\n", len(allResults))
}
```

## Best Practices

1. **Close jobs channel** after sending all jobs
2. **Use WaitGroup** to wait for workers to finish
3. **Buffer channels** appropriately
4. **Handle context cancellation** for graceful shutdown
5. **Collect results** from separate channel
6. **Tune worker count** based on CPU cores

## Tuning Worker Count

```go
import "runtime"

// Use number of CPUs
numWorkers := runtime.NumCPU()

// Or based on workload type
// CPU-bound: numWorkers = numCPU
// IO-bound: numWorkers = numCPU * 2 or more
```

<!--
Source references:
- https://go.dev/blog/pipelines
- https://go.dev/doc/effective_go#concurrency
-->
