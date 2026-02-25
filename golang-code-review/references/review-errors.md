---
name: review-errors
description: 错误处理审查 - 错误创建、包装、判断、信息设计
---

# 错误处理审查

## 错误创建与包装

### 创建错误

```go
// ✓ 正确 - 使用 fmt.Errorf 创建错误
return fmt.Errorf("user not found")

// ✓ 正确 - 包含有用的上下文
return fmt.Errorf("failed to create user %s: %w", username, err)

// ✗ 错误 - 错误信息不够具体
return fmt.Errorf("operation failed")
return fmt.Errorf("error")
```

### 错误包装（Go 1.13+）

```go
// ✓ 正确 - 使用 %w 动词包装错误
func (r *UserRepo) GetUser(id int) (*User, error) {
	user, err := r.db.QueryUser(id)
	if err != nil {
		return nil, fmt.Errorf("query user %d: %w", id, err)
	}
	return user, nil
}

// ✗ 错误 - 使用 %v 会丢失原始错误类型
return nil, fmt.Errorf("query user %d: %v", id, err)
```

### 错误包装链

```go
// 多层包装
func (s *Service) ProcessUser(id int) error {
	user, err := s.repo.GetUser(id)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}
	// ...
}

// 调用链
// Database: connection failed
//   -> Repo: query user 123: connection failed
//     -> Service: get user: query user 123: connection failed
```

## 错误判断与处理

### errors.Is - 判断特定错误

```go
// 定义哨兵错误
var (
	ErrUserNotFound = errors.New("user not found")
	ErrInvalidInput = errors.New("invalid input")
)

// 返回错误
func (r *UserRepo) GetUser(id int) (*User, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	user, err := r.db.Find(id)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// 判断错误
user, err := repo.GetUser(1)
if errors.Is(err, ErrUserNotFound) {
	// 处理用户不存在
	return nil, err
}
if errors.Is(err, ErrInvalidInput) {
	// 处理无效输入
	return nil, err
}
if err != nil {
	// 处理其他错误
	return nil, err
}
```

### errors.As - 获取底层类型

```go
// 自定义错误类型
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error: %s", e.Message)
}

// 创建自定义错误
func ValidateUser(u *User) error {
	if u.Name == "" {
		return &ValidationError{
			Field:   "name",
			Message: "name is required",
		}
	}
	return nil
}

// 获取底层类型
err := ValidateUser(user)
var validationErr *ValidationError
if errors.As(err, &validationErr) {
	fmt.Printf("Field %s failed: %s\n", validationErr.Field, validationErr.Message)
}
```

### 错误判断优先级

```go
// ✓ 正确 - 先判断特定错误，后判断一般错误
user, err := repo.GetUser(id)
if errors.Is(err, ErrUserNotFound) {
	return nil, &HTTPError{
		Code:    404,
		Message: "user not found",
	}
}
if err != nil {
	return nil, fmt.Errorf("get user: %w", err)
}
return user, nil
```

## 错误信息设计

### 错误信息应该包含足够的上下文

```go
// ✓ 正确 - 包含关键参数值
return fmt.Errorf("failed to connect to database %s:%d: %w", host, port, err)

// ✓ 正确 - 说明操作的目的
return fmt.Errorf("failed to send email to %s: %w", email, err)

// ✗ 错误 - 缺少上下文
return fmt.Errorf("connection failed: %w", err)
return fmt.Errorf("send failed: %w", err)
```

### 错误信息格式

```go
// ✓ 正确的格式
// 1. 说明操作失败
// 2. 包含关键参数
// 3. 包含原始错误

return fmt.Errorf("failed to read config file %s: %w", path, err)

// 格式说明：
// - 不以大写字母开头
// - 不以标点符号结尾
// - 使用 %w 包装原始错误
```

### 面向用户的错误信息

```go
// 技术错误（面向开发者）
return fmt.Errorf("failed to parse JSON: %w", err)

// 用户错误（面向用户）
type UserError struct {
	Message string
}

func (e *UserError) Error() string {
	return e.Message
}

// 返回用户友好的错误
if errors.Is(err, ErrUserNotFound) {
	return &UserError{Message: "用户不存在"}
}
```

## 错误处理模式

### Early Return

```go
// ✓ 正确 - Early Return 模式
func ProcessUser(id int) error {
	user, err := repo.GetUser(id)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	if err := validateUser(user); err != nil {
		return fmt.Errorf("validate user: %w", err)
	}

	if err := processUser(user); err != nil {
		return fmt.Errorf("process user: %w", err)
	}

	return nil
}
```

### 错误收集

```go
// 收集多个错误
type MultiError struct {
	Errors []error
}

func (m *MultiError) Error() string {
	var sb strings.Builder
	sb.WriteString("multiple errors:")
	for _, err := range m.Errors {
		sb.WriteString("\n  - ")
		sb.WriteString(err.Error())
	}
	return sb.String()
}

func ValidateAll(users []User) error {
	var errs []error
	for _, user := range users {
		if err := ValidateUser(user); err != nil {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 {
		return &MultiError{Errors: errs}
	}
	return nil
}
```

### 错误恢复

```go
// panic 不应该在正常流程中
func SafeProcess() (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic recovered: %v", r)
		}
	}()

	// 可能 panic 的代码
	return nil
}
```

## 常见反模式

### 忽略错误

```go
// ✗ 错误 - 忽略错误
file, _ := os.Open("file.txt")
data, _ := ioutil.ReadAll(file)

// ✓ 正确 - 检查错误
file, err := os.Open("file.txt")
if err != nil {
	return fmt.Errorf("open file: %w", err)
}
defer file.Close()

data, err := ioutil.ReadAll(file)
if err != nil {
	return fmt.Errorf("read file: %w", err)
}
```

### 重复记录错误

```go
// ✗ 错误 - log and return
func Process() error {
	result, err := doSomething()
	if err != nil {
		log.Printf("error: %v", err)  // 不应该在这里 log
		return err
	}
	return nil
}

// ✓ 正确 - 只返回错误（由调用方决定是否 log）
func Process() error {
	result, err := doSomething()
	if err != nil {
		return fmt.Errorf("do something: %w", err)
	}
	return nil
}
```

### Defer 中忽略错误

```go
// ✗ 错误 - defer 中忽略错误
file, _ := os.Open("file.txt")
defer file.Close()  // 忽略了错误

// ✓ 正确 - 处理 defer 中的错误
file, err := os.Open("file.txt")
if err != nil {
	return err
}
defer func() {
	if err := file.Close(); err != nil {
		log.Printf("warning: failed to close file: %v", err)
	}
}()
```

### 使用 panic 处理可预期的错误

```go
// ✗ 错误 - 使用 panic
func GetUser(id int) *User {
	if id <= 0 {
		panic("invalid id")  // 不应该用 panic
	}
	// ...
}

// ✓ 正确 - 返回错误
func GetUser(id int) (*User, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid id: %d", id)
	}
	// ...
}
```

### 错误信息过于技术化

```go
// ✗ 错误 - 面向开发者的错误信息给用户
return fmt.Errorf("ECONNREFUSED: Connection refused to database at 127.0.0.1:5432")

// ✓ 正确 - 面向用户的错误信息
return &UserError{
	Message: "服务暂时不可用，请稍后再试",
	Err:     fmt.Errorf("database connection failed"),
}
```

## 错误上下文

### 逐层添加上下文

```go
// 数据库层
func (db *DB) QueryUser(id int) (*User, error) {
	row := db.QueryRow("SELECT * FROM users WHERE id = ?", id)
	var user User
	if err := row.Scan(&user.ID, &user.Name); err != nil {
		return nil, fmt.Errorf("scan row: %w", err)
	}
	return &user, nil
}

// Repository 层
func (r *UserRepo) GetUser(id int) (*User, error) {
	user, err := r.db.QueryUser(id)
	if err != nil {
		return nil, fmt.Errorf("query user %d: %w", id, err)
	}
	return user, nil
}

// Service 层
func (s *UserService) GetUser(id int) (*User, error) {
	user, err := s.repo.GetUser(id)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

// HTTP Handler 层
func (h *Handler) HandleGetUser(w http.ResponseWriter, r *http.Request) {
	id := getID(r)
	user, err := h.service.GetUser(id)
	if err != nil {
		http.Error(w, "failed to get user", http.StatusInternalServerError)
		return
	}
	// ...
}
```

## 常见问题检查清单

### 错误创建

- [ ] 使用 fmt.Errorf 创建错误？
- [ ] 错误信息包含上下文？
- [ ] 使用 %w 包装原始错误？

### 错误判断

- [ ] 使用 errors.Is 判断错误？
- [ ] 使用 errors.As 获取类型？
- [ ] 正确处理哨兵错误？

### 错误处理

- [ ] 不忽略错误？
- [ ] 不重复记录错误？
- [ ] defer 中的错误被处理？

### 错误设计

- [ ] 错误信息足够上下文？
- [ ] 区分技术错误和用户错误？

<!--
Source references:
- https://github.com/xxjwxc/uber_go_guide_cn
- https://go.dev/blog/go1.13-errors
- https://github.com/golang/go/wiki/CodeReviewComments#error-strings
-->
