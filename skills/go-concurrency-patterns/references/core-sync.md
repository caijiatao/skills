---
name: core-sync
description: Synchronization primitives: WaitGroup, Mutex, RWMutex, Once, Cond, and atomic
---

# Core: Sync

## sync.WaitGroup

Wait for goroutines to finish.

### Basic Usage

```go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
	wg.Add(1)  // Increment counter
	go func(id int) {
		defer wg.Done()  // Decrement when done
		fmt.Printf("worker %d\n", id)
	}(i)
}

wg.Wait()  // Wait for all
fmt.Println("all done")
```

### Common Pattern

```go
func processItems(items []Item) []Result {
	var wg sync.WaitGroup
	results := make([]Result, len(items))

	for i, item := range items {
		wg.Add(1)
		go func(idx int, item Item) {
			defer wg.Done()
			results[idx] = process(item)
		}(i, item)
	}

	wg.Wait()
	return results
}
```

### Gotcha: Wrong Order

```go
// ✗ Wrong - Add not in spawning goroutine
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
	go func() {
		wg.Add(1)  // Too late - race condition
		defer wg.Done()
		fmt.Println(i)
	}()
}
wg.Wait()

// ✓ Correct
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
	wg.Add(1)  // Add before spawning
	go func(id int) {
		defer wg.Done()
		fmt.Println(id)
	}(i)
}
wg.Wait()
```

## sync.Mutex

Mutual exclusion lock.

### Basic Usage

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

### Lock Unlock

```go
// ✓ Idiomatic
func (s *SafeMap) Get(key string) (int, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	val, ok := s.data[key]
	return val, ok
}

// When you need to unlock early
func (s *SafeMap) Contains(key string) bool {
	s.mu.Lock()
	_, ok := s.data[key]
	s.mu.Unlock()
	return ok
}
```

## sync.RWMutex

Read-write mutex - allows multiple readers or one writer.

### When to Use

Use when reads greatly outnumber writes:

```go
type Config struct {
	mu    sync.RWMutex
	value string
}

// Read lock - multiple goroutines can read simultaneously
func (c *Config) Get() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.value
}

// Write lock - exclusive access
func (c *Config) Set(v string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value = v
}
```

### Performance

```go
// RWMutex is slower than Mutex for writes
// Use plain Mutex if you don't need concurrent reads

type Bad struct {
	mu sync.RWMutex  // Not needed - no concurrent reads
}

type Good struct {
	mu sync.Mutex  // Simpler, faster
}
```

## sync.Once

Do something exactly once.

### Common Use: Singleton

```go
var (
	instance *Database
	once     sync.Once
)

func GetDatabase() *Database {
	once.Do(func() {
		instance = &Database{/* init */}
	})
	return instance
}
```

### Initialization

```go
type Cache struct {
	once sync.Once
	data map[string]string
}

func (c *Cache) init() {
	c.once.Do(func() {
		c.data = make(map[string]string)
	})
}

func (c *Cache) Set(key, value string) {
	c.init()
	c.mu.Lock()
	c.data[key] = value
	c.mu.Unlock()
}
```

### Gotcha: Panic in Once

If the function panics, Once will not retry:

```go
var once sync.Once

once.Do(func() {
	panic("something bad")
})

// This will never run
once.Do(func() {
	fmt.Println("never runs")
})
```

## sync.Cond

Condition variable - wait for or announce condition changes.

### Basic Usage

```go
type Queue struct {
	items []int
	cond  *sync.Cond
}

func NewQueue() *Queue {
	return &Queue{
		cond: sync.NewCond(&sync.Mutex{}),
	}
}

func (q *Queue) Push(item int) {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()
	q.items = append(q.items, item)
	q.cond.Signal()  // Wake one waiter
}

func (q *Queue) Pop() int {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()

	for len(q.items) == 0 {
		q.cond.Wait()  // Wait for signal
	}

	item := q.items[0]
	q.items = q.items[1:]
	return item
}
```

### Broadcast vs Signal

```go
// Signal - wake one goroutine
q.cond.Signal()

// Broadcast - wake all waiting goroutines
q.cond.Broadcast()
```

## sync.Map

Like map but safe for concurrent use.

### When to Use

Use for:
- Cache-like workloads (many reads, few writes)
- Key sets that are disjoint (don't overlap)

```go
var cache sync.Map

// Store
cache.Store("key", "value")

// Load
if value, ok := cache.Load("key"); ok {
	fmt.Println(value.(string))
}

// LoadOrStore
actual, loaded := cache.LoadOrStore("key", "newValue")
// loaded is true if key already existed
// actual is the existing value or the value just stored

// Range
cache.Range(func(key, value any) bool {
	fmt.Printf("%s: %v\n", key, value)
	return true  // return false to stop iteration
})
```

### When NOT to Use

Use regular map + mutex for most cases:

```go
// ✓ Better for most use cases
type SafeMap struct {
	mu   sync.Mutex
	data map[string]string
}

func (m *SafeMap) Get(key string) (string, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	val, ok := m.data[key]
	return val, ok
}
```

## sync.Pool

Pool of temporary objects to reduce GC pressure.

### Basic Usage

```go
var bufferPool = sync.Pool{
	New: func() any {
		return new(bytes.Buffer)
	},
}

func process(data []byte) {
	buf := bufferPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		bufferPool.Put(buf)
	}()

	buf.Write(data)
	// Use buf...
}
```

### Use Case: Buffer Reuse

```go
var bufPool = sync.Pool{
	New: func() any {
		return make([]byte, 1024)
	},
}

func sendData(data []byte) error {
	buf := bufPool.Get().([]byte)
	defer bufPool.Put(buf)

	// Use buffer...
	return nil
}
```

## sync/atomic

Low-level atomic memory primitives.

### Basic Operations

```go
import "sync/atomic"

var counter int64

// Atomic add
atomic.AddInt64(&counter, 1)

// Atomic load
val := atomic.LoadInt64(&counter)

// Atomic store
atomic.StoreInt64(&counter, 42)

// Compare and swap
atomic.CompareAndSwapInt64(&counter, 42, 100)
```

### Atomic Value

```go
var config atomic.Value

// Store
config.LoadOrStore(newConfig)

// Load
cfg := config.Load().(*Config)
```

### When to Use

Use atomic when:
- Performance is critical
- Simple operations (load/store/add)

```go
// ✓ Good use of atomic
var done int32

func isDone() bool {
	return atomic.LoadInt32(&done) == 1
}

func markDone() {
	atomic.StoreInt32(&done, 1)
}
```

For complex state, prefer mutex:

```go
// ✗ Use mutex instead
type State struct {
	mu    sync.Mutex
	value int
	ready bool
}
```

## Best Practices

1. **Prefer channels for coordination**
2. **Use mutex for protecting state**
3. **Keep locks minimal**
4. **Don't copy mutex values**
5. **Use RWMutex when reads >> writes**
6. **Use Once for single initialization**

## Gotchas

### Copying Locks

```go
// ✗ WRONG - copying lock
type Container struct {
	mu sync.Mutex  // Don't copy this
}

func (c Container) Method() {
	c.mu.Lock()  // Copy of lock, not the original!
}

// ✓ Correct
func (c *Container) Method() {
	c.mu.Lock()  // Using pointer
}
```

### Deadlock

```go
// ✗ Deadlock - same goroutine acquires twice
mu.Lock()
mu.Lock()  // Deadlock!

// ✗ Deadlock - circular wait
// Goroutine 1:
mu1.Lock()
mu2.Lock()

// Goroutine 2:
mu2.Lock()
mu1.Lock()  // Deadlock!

// ✓ Fix - consistent ordering
func safeLock() {
	mu1.Lock()
	defer mu1.Unlock()
	mu2.Lock()
	defer mu2.Unlock()
}
```

<!--
Source references:
- https://go.dev/pkg/sync
- https://go.dev/doc/effective_go#mutual_exclusion
- https://go.dev/ref/mem
-->
