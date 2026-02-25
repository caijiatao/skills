---
name: test-mocking
description: 接口 Mock 测试
---

# 接口 Mock 测试

## 基于接口的 Mock

### 定义接口

```go
// 定义依赖的接口
type UserRepository interface {
 GetUser(id string) (*User, error)
 SaveUser(user *User) error
}

type EmailService interface {
 SendEmail(to, subject, body string) error
}
```

### 生产实现

```go
// 生产实现
type PostgresUserRepository struct {
 db *sql.DB
}

func (r *PostgresUserRepository) GetUser(id string) (*User, error) {
 var user User
 err := r.db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", id).
 Scan(&user.ID, &user.Name, &user.Email)
 if err != nil {
 return nil, err
 }
 return &user, nil
}

func (r *PostgresUserRepository) SaveUser(user *User) error {
 _, err := r.db.Exec(
 "INSERT INTO users (id, name, email) VALUES ($1, $2, $3)",
 user.ID, user.Name, user.Email,
 )
 return err
}
```

### Mock 实现

```go
// 测试用 Mock 实现
type MockUserRepository struct {
 GetUserFunc  func(id string) (*User, error)
 SaveUserFunc func(user *User) error
}

func (m *MockUserRepository) GetUser(id string) (*User, error) {
 if m.GetUserFunc != nil {
 return m.GetUserFunc(id)
 }
 return nil, fmt.Errorf("not implemented")
}

func (m *MockUserRepository) SaveUser(user *User) error {
 if m.SaveUserFunc != nil {
 return m.SaveUserFunc(user)
 }
 return fmt.Errorf("not implemented")
}
```

### 使用 Mock 测试

```go
func TestUserService(t *testing.T) {
 // 创建 mock
 mock := &MockUserRepository{
 GetUserFunc: func(id string) (*User, error) {
 if id == "123" {
 return &User{ID: "123", Name: "Alice"}, nil
 }
 return nil, ErrNotFound
 },
 SaveUserFunc: func(user *User) error {
 if user.Name == "" {
 return fmt.Errorf("name is required")
 }
 return nil
 },
 }

 service := NewUserService(mock)

 // 测试 Get
 user, err := service.GetUser("123")
 if err != nil {
 t.Fatalf("unexpected error: %v", err)
 }
 if user.Name != "Alice" {
 t.Errorf("got name %q; want %q", user.Name, "Alice")
 }

 // 测试 not found
 _, err = service.GetUser("999")
 if err == nil {
 t.Error("expected error for non-existent user")
 }

 // 测试验证
 err = service.SaveUser(&User{ID: "456"})
 if err == nil {
 t.Error("expected error for user without name")
 }
}
```

## 记录调用

### 记录调用次数和参数

```go
type MockLogger struct {
 Calls []string
 mu    sync.Mutex
}

func (m *MockLogger) Log(msg string) {
 m.mu.Lock()
 defer m.mu.Unlock()
 m.Calls = append(m.Calls, msg)
}

func (m *MockLogger) Info(msg string) {
 m.mu.Lock()
 defer m.mu.Unlock()
 m.Calls = append(m.Calls, "INFO: "+msg)
}

// 测试调用次数
func TestLogging(t *testing.T) {
 mock := &MockLogger{}

 service := NewService(mock)
 service.Process("test")

 if len(mock.Calls) != 2 {
 t.Errorf("got %d calls; want 2", len(mock.Calls))
 }

 if mock.Calls[0] != "INFO: starting" {
 t.Errorf("got %q; want %q", mock.Calls[0], "INFO: starting")
 }
}
```

## 接口最佳实践

### 接口应该由使用者定义

```go
// ✓ 正确 - 接口在使用者包中定义
// package service

type UserGetter interface {
 GetUser(id int) (*User, error)
}

type OrderService struct {
 userRepo UserGetter
}

func (s *OrderService) ProcessOrder(userID int) error {
 user, err := s.userRepo.GetUser(userID)
 if err != nil {
 return err
 }
 // 处理订单...
 return nil
}

// package repository

type UserRepo struct {
 db *sql.DB
}

func (r *UserRepo) GetUser(id int) (*User, error) {
 // 实现...
}
```

### 小接口更容易 Mock

```go
// ✓ 小接口 - 容易实现
type Reader interface {
 Read(p []byte) (n int, err error)
}

// ✗ 大接口 - 难以实现
type FileSystem interface {
 Create(path string) (*File, error)
 Open(path string) (*File, error)
 Remove(path string) error
 Rename(old, new string) error
 MkdirAll(path string) error
 // ... 更多方法
}
```

## 常见模式

### HTTP Handler Mock

```go
// 定义接口
type HTTPClient interface {
 Do(req *http.Request) (*http.Response, error)
}

// Mock
type MockHTTPClient struct {
 DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
 if m.DoFunc != nil {
 return m.DoFunc(req)
 }
 return nil, fmt.Errorf("not implemented")
}

// 使用
func TestAPIClient(t *testing.T) {
 mock := &MockHTTPClient{
 DoFunc: func(req *http.Request) (*http.Response, error) {
 return &http.Response{
 StatusCode: http.StatusOK,
 Body:       io.NopCloser(strings.NewReader(`{"id":"123"}`)),
 }, nil
 },
 }

 client := NewAPIClient(mock)
 user, err := client.GetUser("123")
 if err != nil {
 t.Fatal(err)
 }
 if user.ID != "123" {
 t.Errorf("got id %q; want %q", user.ID, "123")
 }
}
```

### 数据库 Mock

```go
// 定义接口
type Database interface {
 Query(query string, args ...any) (*sql.Rows, error)
 Exec(query string, args ...any) (sql.Result, error)
}

// Mock
type MockDatabase struct {
 QueryFunc func(query string, args ...any) (*sql.Rows, error)
 ExecFunc  func(query string, args ...any) (sql.Result, error)
}

func (m *MockDatabase) Query(query string, args ...any) (*sql.Rows, error) {
 if m.QueryFunc != nil {
 return m.QueryFunc(query, args...)
 }
 return nil, fmt.Errorf("not implemented")
}

func (m *MockDatabase) Exec(query string, args ...any) (sql.Result, error) {
 if m.ExecFunc != nil {
 return m.ExecFunc(query, args...)
 }
 return nil, fmt.Errorf("not implemented")
}
```

## 表驱动 Mock 测试

```go
func TestServiceWithTable(t *testing.T) {
 tests := []struct {
 name         string
 mockSetup    func(*MockUserRepository)
 input        string
 expectedUser *User
 expectError  bool
 }{
 {
 name: "success",
 mockSetup: func(m *MockUserRepository) {
 m.GetUserFunc = func(id string) (*User, error) {
 return &User{ID: id, Name: "Alice"}, nil
 }
 },
 input:        "123",
 expectedUser: &User{ID: "123", Name: "Alice"},
 expectError:  false,
 },
 {
 name: "not found",
 mockSetup: func(m *MockUserRepository) {
 m.GetUserFunc = func(id string) (*User, error) {
 return nil, ErrNotFound
 }
 },
 input:        "999",
 expectError:  true,
 },
 }

 for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 mock := &MockUserRepository{}
 if tt.mockSetup != nil {
 tt.mockSetup(mock)
 }

 service := NewUserService(mock)
 user, err := service.GetUser(tt.input)

 if tt.expectError {
 if err == nil {
 t.Error("expected error")
 }
 return
 }

 if err != nil {
 t.Fatalf("unexpected error: %v", err)
 }
 if !reflect.DeepEqual(user, tt.expectedUser) {
 t.Errorf("got %+v; want %+v", user, tt.expectedUser)
 }
 })
 }
}
```

## Mock 库

### 使用 gomock

```go
//go:generate mockgen -source=repository.go -destination=mock_repository.go

// 生成的 mock
type MockUserRepository struct {
 ctrl     *gomock.Controller
 recorder *MockUserRepositoryMockRecorder
}

func (m *MockUserRepository) GetUser(id string) (*User, error) {
 m.ctrl.T.Helper()
 ret := m.ctrl.Call(m, "GetUser", id)
 ret0, _ := ret[0].(*User)
 ret1, _ := ret[1].(error)
 return ret0, ret1
}

// 测试
func TestWithGomock(t *testing.T) {
 ctrl := gomock.NewController(t)
 defer ctrl.Finish()

 mock := NewMockUserRepository(ctrl)

 mock.EXPECT().
 GetUser("123").
 Return(&User{ID: "123", Name: "Alice"}, nil)

 service := NewUserService(mock)
 user, err := service.GetUser("123")
 if err != nil {
 t.Fatal(err)
 }
 if user.Name != "Alice" {
 t.Errorf("got name %q; want %q", user.Name, "Alice")
 }
}
```

## 最佳实践

### 1. 接口应该小

```go
// ✓ 好的接口 - 单个方法
type Reader interface {
 Read(p []byte) (n int, err error)
}
```

### 2. 只 Mock 需要的

```go
// ✓ 只定义需要的方法
type UserGetter interface {
 GetUser(id int) (*User, error)
}

// ✗ 不要 mock 不需要的方法
type UserRepository interface {
 GetUser(id int) (*User, error)
 SaveUser(user *User) error
 DeleteUser(id int) error
 // ... 不需要这些
}
```

### 3. 使用函数字段 Mock

```go
// ✓ 简单场景使用函数字段
type Mock struct {
 GetUserFunc func(id int) (*User, error)
}

// 复杂场景使用 mock 库
```

### 4. 清理 Mock 状态

```go
func TestWithCleanup(t *testing.T) {
 mock := &MockService{}
 t.Cleanup(func() {
 mock.Reset()  // 清理状态
 })

 // 测试...
}
```

<!--
Source references:
- https://go.dev/doc/effective_go#interfaces
- https://github.com/uber-go/mock
- https://github.com/golang/mock
-->
