---
name: review-interfaces
description: 接口设计审查 - 接口大小、定义位置、组合、空接口使用
---

# 接口设计审查

## 接口大小检查

### 原则：接口应该小而专注

```go
// ✗ 不好的例子 - 接口过大
type UserService interface {
	CreateUser(name, email string) error
	GetUser(id int) (*User, error)
	UpdateUser(user *User) error
	DeleteUser(id int) error
	ListUsers() ([]*User, error)
	ValidateUser(user *User) error
	SendEmail(user *User, msg string) error
}

// 问题：
// 1. 方法太多（7 个）
// 2. 包含不相关的方法（SendEmail）
// 3. 难以实现和 mock

// ✓ 正确的例子 - 拆分为小接口
type UserGetter interface {
	GetUser(id int) (*User, error)
}

type UserCreator interface {
	CreateUser(name, email string) error
}

type UserUpdater interface {
	UpdateUser(user *User) error
}

type UserDeleter interface {
	DeleteUser(id int) error
}

type UserLister interface {
	ListUsers() ([]*User, error)
}

type UserValidator interface {
	ValidateUser(user *User) error
}
```

### 接口方法数量指南

- **最佳**：1 个方法
- **很好**：2-3 个方法
- **可接受**：4-5 个方法
- **警告**：超过 5 个方法，考虑拆分

## 单方法接口的价值

### 易于实现

```go
// 单方法接口 - 实现简单
type Reader interface {
	Read(p []byte) (n int, err error)
}

// 实现只需一个函数
type StringReader string

func (s StringReader) Read(p []byte) (n int, err error) {
	n = copy(p, s)
	s = s[n:]
	if len(s) == 0 {
		err = io.EOF
	}
	return
}
```

### 易于 Mock

```go
// ✓ 单方法接口 - mock 容易
type Logger interface {
	Log(msg string)
}

// 测试中的 mock
type MockLogger struct {
	LogFunc func(msg string)
}

func (m *MockLogger) Log(msg string) {
	if m.LogFunc != nil {
		m.LogFunc(msg)
	}
}

// 使用 mock
logger := &MockLogger{
	LogFunc: func(msg string) {
		fmt.Println("Logged:", msg)
	},
}
```

### 可以组合

```go
// 小接口可以组合成大接口
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Closer interface {
	Close() error
}

// 组合多个接口
type ReadWriter interface {
	Reader
	Writer
}

type ReadWriteCloser interface {
	Reader
	Writer
	Closer
}
```

## 接口定义位置

### 由使用者定义接口

```go
// ✓ 正确 - 接口在使用者包中定义
// package order

// 接口由 OrderService 定义（使用者）
type UserGetter interface {
	GetUser(id int) (*User, error)
}

type OrderService struct {
	userRepo UserGetter  // 依赖接口，不是具体实现
}

func (s *OrderService) ProcessOrder(userID int) error {
	user, err := s.userRepo.GetUser(userID)
	if err != nil {
		return err
	}
	// 处理订单...
	return nil
}

// package user

// UserRepo 不需要知道 OrderService 的需求
type UserRepo struct {
	db *Database
}

func (r *UserRepo) GetUser(id int) (*User, error) {
	// 实现...
}
```

### 为什么由使用者定义？

1. **最小化依赖** - 使用者只定义需要的方法
2. **灵活性** - 可以有多个实现
3. **解耦** - 实现不需要知道使用者

```go
// ✗ 不好的例子 - 接口在实现包中定义
// package user

type UserRepository interface {
	GetUser(id int) (*User, error)
	SaveUser(user *User) error
}

// package order

type OrderService struct {
	// 依赖 user 包的接口
	userRepo user.UserRepository  // 与 user 包耦合
}
```

## 接口组合

### 延迟组合

```go
// ✓ 正确 - 先定义小接口，再组合
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Flusher interface {
	Flush() error
}

// 需要时才组合
type ReadWriter interface {
	Reader
	Writer
}

type ReadWriteFlusher interface {
	Reader
	Writer
	Flusher
}

// ✗ 不好的例子 - 提前定义大接口
type ReadWriteFlusher interface {
	Read(p []byte) (n int, err error)
	Write(p []byte) (n int, err error)
	Flush() error
}
```

### 避免接口爆炸

```go
// ✓ 正确 - 组合使用
func Process(rw ReadWriteFlusher) error {
	// ...
}

// ✗ 不必要 - 为每个组合都定义接口
type ReadWriter interface {
	Reader
	Writer
}

type ReadFlusher interface {
	Reader
	Flusher
}

type WriteFlusher interface {
	Writer
	Flusher
}

type ReadWriterFlusher interface {
	Reader
	Writer
	Flusher
}
// 太多组合，维护困难
```

## 空接口（any）使用

### 合理使用场景

```go
// ✓ 合理 - 边界层（JSON 解析）
func ParseJSON(data []byte) (map[string]any, error) {
	var result map[string]any
	err := json.Unmarshal(data, &result)
	return result, err
}

// ✓ 合理 - 存储任意类型
type Cache struct {
	data map[string]any
	mu   sync.RWMutex
}

func (c *Cache) Set(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = value
}

func (c *Cache) Get(key string) (any, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.data[key]
	return val, ok
}

// ✓ 合理 - 泛型容器（Go 1.18+ 之前）
type Stack struct {
	items []any
}

func (s *Stack) Push(item any) {
	s.items = append(s.items, item)
}

func (s *Stack) Pop() any {
	if len(s.items) == 0 {
		return nil
	}
	item := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return item
}
```

### 避免在业务核心使用

```go
// ✗ 不好的例子 - 业务核心使用 any
func Process(data any) error {
	user, ok := data.(*User)
	if !ok {
		return fmt.Errorf("invalid type")
	}
	// 处理 user...
	return nil
}

// ✓ 正确 - 使用具体类型
func ProcessUser(user *User) error {
	// 处理 user...
	return nil
}

// ✓ 或使用接口
type Processor interface {
	Process() error
}

func Process(p Processor) error {
	return p.Process()
}
```

## 接口设计的坏味道检查

### 1. 接口是否过大？

```go
// 检查方法数量
// 超过 5 个方法就要警惕

type BigInterface interface {
	Method1() error
	Method2() error
	Method3() error
	Method4() error
	Method5() error
	Method6() error  // 太多了
}

// 建议：拆分成小接口
```

### 2. 接口是否由使用者定义？

```go
// 在实现包中定义接口通常是信号灯

// package impl
type MyInterface interface {  // ✗ 不好的信号
	Do() error
}

// package user
type Service struct {
	impl impl.MyInterface  // 与实现包耦合
}
```

### 3. 调用方是否只用到少数方法？

```go
type Service interface {
	Method1() error
	Method2() error
	Method3() error
	Method4() error
	Method5() error
}

// 如果调用方只用 Method1，应该定义小接口
type Method1Only interface {
	Method1() error
}
```

### 4. 是否为了抽象而抽象？

```go
// ✗ 不必要的抽象
type UserRepository interface {
	GetUser(id int) (*User, error)
}

type UserService struct {
	repo UserRepository
}

// 问题：
// 1. 只有一个实现（UserRepo）
// 2. 不太可能替换实现
// 3. 增加了不必要的复杂性

// ✓ 直接使用具体类型
type UserService struct {
	repo *UserRepo
}
```

### 5. 是否滥用 any？

```go
// ✗ 业务核心使用 any
func Process(data any) error {
	// 类型断言...
}

// ✓ 使用具体类型或接口
func ProcessUser(u *User) error { }
func ProcessProcessor(p Processor) error { }
```

## 常见问题检查清单

### 接口大小

- [ ] 接口方法不超过 3 个？
- [ ] 单方法接口优先？
- [ ] 相关方法组织在一起？

### 定义位置

- [ ] 接口由使用者定义？
- [ ] 不在实现包中定义接口？

### 组合

- [ ] 先定义小接口？
- [ ] 需要时才组合？
- [ ] 避免接口爆炸？

### 空接口

- [ ] 只在边界层使用 any？
- [ ] 业务核心类型明确？

### 必要性

- [ ] 不是为了抽象而抽象？
- [ ] 有多个实现或可能替换？

<!--
Source references:
- https://github.com/xxjwxc/uber_go_guide_cn
- https://go.dev/doc/effective_go#interfaces_and_types
- https://github.com/golang/go/wiki/CodeReviewComments#interfaces
-->
