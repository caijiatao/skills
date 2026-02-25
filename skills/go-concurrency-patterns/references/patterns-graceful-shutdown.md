---
name: patterns-graceful-shutdown
description: Graceful shutdown patterns for Go services
---

# Pattern: Graceful Shutdown

## What is Graceful Shutdown?

Graceful shutdown ensures your service:
1. Stops accepting new work
2. Finishes processing in-flight work
3. Releases resources properly
4. Exits cleanly

## Basic Graceful Shutdown

### Handling SIGINT/SIGTERM

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Create server
	server := &http.Server{
		Addr:    ":8080",
		Handler: newHandler(),
	}

	// Start server in background
	go func() {
		fmt.Println("Server starting on :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	fmt.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		fmt.Printf("Server forced to shutdown: %v\n", err)
	}

	fmt.Println("Server exited")
}

func newHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second) // Simulate work
		w.Write([]byte("Hello, World!"))
	})
	return mux
}
```

## Worker Pool with Graceful Shutdown

### Stop Workers Cleanly

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Server struct {
	jobs    chan int
	workers int
	wg      sync.WaitGroup
	ctx     context.Context
	cancel  context.CancelFunc
}

func NewServer(workers int, bufferSize int) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	return &Server{
		jobs:    make(chan int, bufferSize),
		workers: workers,
		ctx:     ctx,
		cancel:  cancel,
	}
}

func (s *Server) Start() {
	for i := 0; i < s.workers; i++ {
		s.wg.Add(1)
		go s.worker(i)
	}
	fmt.Printf("Started %d workers\n", s.workers)
}

func (s *Server) worker(id int) {
	defer s.wg.Done()
	for {
		select {
		case <-s.ctx.Done():
			fmt.Printf("Worker %d shutting down\n", id)
			return
		case job, ok := <-s.jobs:
			if !ok {
				fmt.Printf("Worker %d: jobs channel closed\n", id)
				return
			}
			fmt.Printf("Worker %d processing job %d\n", id, job)
			time.Sleep(500 * time.Millisecond) // Simulate work
			fmt.Printf("Worker %d finished job %d\n", id, job)
		}
	}
}

func (s *Server) Submit(job int) {
	s.jobs <- job
}

func (s *Server) Shutdown() {
	fmt.Println("Initiating shutdown...")

	// Stop accepting new jobs
	close(s.jobs)

	// Cancel context to signal workers
	s.cancel()

	// Wait for workers to finish with timeout
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		fmt.Println("All workers finished gracefully")
	case <-time.After(10 * time.Second):
		fmt.Println("Shutdown timed out")
	}
}

func main() {
	server := NewServer(3, 100)
	server.Start()

	// Simulate work
	go func() {
		for i := 1; i <= 10; i++ {
			server.Submit(i)
			time.Sleep(200 * time.Millisecond)
		}
	}()

	// Let it run for a bit
	time.Sleep(3 * time.Second)

	// Shutdown
	server.Shutdown()
	fmt.Println("Server shutdown complete")
}
```

## HTTP Server with Graceful Shutdown

### Complete Example

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type Server struct {
	httpServer *http.Server
}

func NewServer(addr string) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:    addr,
			Handler: newHandler(),
		},
	}
}

func (s *Server) Start() error {
	fmt.Printf("Starting server on %s\n", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(timeout time.Duration) error {
	fmt.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	fmt.Println("Server gracefully stopped")
	return nil
}

func newHandler() http.Handler {
	mux := http.NewServeMux()

	// Long-running endpoint
	mux.HandleFunc("/long", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Processing long request...")
		time.Sleep(5 * time.Second)
		w.Write([]byte("Long request complete"))
	})

	// Quick endpoint
	mux.HandleFunc("/quick", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Quick response"))
	})

	return mux
}

func main() {
	server := NewServer(":8080")

	// Start server in background
	go func() {
		if err := server.Start(); err != nil {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	if err := server.Shutdown(10 * time.Second); err != nil {
		fmt.Printf("Error during shutdown: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Bye!")
}
```

## Multi-Component Shutdown

### Shutdown Order Matters

```go
type Application struct {
	httpServer  *http.Server
	db          *Database
	msgQueue    *MessageQueue
	workers     *WorkerPool
}

func (app *Application) Shutdown() error {
	fmt.Println("Starting shutdown...")

	// Step 1: Stop accepting HTTP requests
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.httpServer.Shutdown(ctx); err != nil {
		fmt.Printf("HTTP server shutdown error: %v\n", err)
	}
	fmt.Println("HTTP server stopped")

	// Step 2: Stop workers (finish in-flight jobs)
	if err := app.workers.Shutdown(10 * time.Second); err != nil {
		fmt.Printf("Workers shutdown error: %v\n", err)
	}
	fmt.Println("Workers stopped")

	// Step 3: Stop consuming from message queue
	app.msgQueue.Stop()
	fmt.Println("Message queue stopped")

	// Step 4: Close database connections
	if err := app.db.Close(); err != nil {
		fmt.Printf("Database close error: %v\n", err)
	}
	fmt.Println("Database closed")

	fmt.Println("Shutdown complete")
	return nil
}
```

## Connection Drain

### Drain Active Connections

```go
func (s *Server) ShutdownWithDrain(timeout time.Duration) error {
	fmt.Println("Initiating shutdown with drain...")

	// Create context for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Track active connections
	activeConns := make(map[net.Conn]struct{})
	var mu sync.Mutex

	// Wrap handler to track connections
	originalHandler := s.httpServer.Handler
	s.httpServer.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn := r.Context().Value(http.ConnContextKey).(net.Conn)
		mu.Lock()
		activeConns[conn] = struct{}{}
		defer func() {
			mu.Lock()
			delete(activeConns, conn)
			mu.Unlock()
		}()
		mu.Unlock()

		originalHandler.ServeHTTP(w, r)
	})

	// Start shutdown (stops accepting new connections)
	go s.httpServer.Shutdown(ctx)

	// Wait for active connections to drain
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			mu.Lock()
			count := len(activeConns)
			mu.Unlock()

			if count == 0 {
				fmt.Println("All connections drained")
				return nil
			}
			fmt.Printf("Waiting for %d active connections...\n", count)

		case <-ctx.Done():
			fmt.Println("Shutdown timeout, forcing exit")
			return fmt.Errorf("timeout waiting for connections to drain")
		}
	}
}
```

## Health Check During Shutdown

### Refuse Traffic During Shutdown

```go
type Server struct {
	httpServer  *http.Server
	shuttingDown atomic.Bool
}

func (s *Server) handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if s.shuttingDown.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/work", func(w http.ResponseWriter, r *http.Request) {
		if s.shuttingDown.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Shutting down"))
			return
		}
		// Do work...
		w.Write([]byte("Work complete"))
	})

	return mux
}

func (s *Server) Shutdown() error {
	s.shuttingDown.Store(true)
	fmt.Println("Marked as shutting down")

	// Wait a bit for load balancer to detect
	time.Sleep(5 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return s.httpServer.Shutdown(ctx)
}
```

## Best Practices

1. **Handle signals** - Catch SIGINT/SIGTERM
2. **Set timeout** - Don't wait forever
3. **Shutdown order** - HTTP -> Workers -> DB
4. **Release resources** - Close connections, files
5. **Log progress** - Track shutdown steps
6. **Health checks** - Report unhealthy during shutdown
7. **Test shutdown** - Verify it works

## Gotchas

### Not Waiting for Shutdown

```go
// ✗ Wrong - doesn't wait
go server.Shutdown(context.Background())
// Main exits immediately, killing everything

// ✓ Correct
if err := server.Shutdown(context.Background()); err != nil {
	log.Fatal(err)
}
```

### Too Short Timeout

```go
// ✗ May not finish in-flight work
server.Shutdown(context.WithTimeout(context.Background(), 1*time.Second))

// ✓ More reasonable
server.Shutdown(context.WithTimeout(context.Background(), 30*time.Second))
```

### Not Checking Active Connections

```go
// During shutdown, always check if connections are still active
// Use connection tracking or keep-alive timeouts
```

<!--
Source references:
- https://go.dev/doc/effective_go#concurrency
- https://go.dev/blog/context
- https://github.com/golang/go/wiki/StopExample
-->
