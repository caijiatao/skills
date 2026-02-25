---
name: review-functions
description: 函数设计审查 - 职责分析、长度、参数、返回值
---

# 函数设计审查

## 函数职责分析

### 单一职责原则

一个函数应该只做一件事。

```go
// ✗ 不好的例子 - 函数做了太多事
func ProcessUser(id int) error {
	// 1. 验证用户
	if id <= 0 {
		return fmt.Errorf("invalid id")
	}

	// 2. 查询数据库
	user, err := db.QueryUser(id)
	if err != nil {
		return err
	}

	// 3. 处理数据
	user.Name = strings.TrimSpace(user.Name)
	user.Email = strings.ToLower(user.Email)

	// 4. 计算积分
	points := calculatePoints(user)

	// 5. 更新数据库
	user.Points = points
	err = db.UpdateUser(user)
	if err != nil {
		return err
	}

	// 6. 发送通知
	sendEmail(user)

	// 7. 记录日志
	log.Printf("processed user %d", id)

	return nil
}

// ✓ 正确的例子 - 拆分为多个小函数
func ProcessUser(id int) error {
	user, err := validateAndFetchUser(id)
	if err != nil {
		return err
	}

	if err := processUserData(user); err != nil {
		return err
	}

	return notifyUser(user)
}

func validateAndFetchUser(id int) (*User, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid id: %d", id)
	}
	return db.QueryUser(id)
}

func processUserData(user *User) error {
	user.Name = strings.TrimSpace(user.Name)
	user.Email = strings.ToLower(user.Email)
	user.Points = calculatePoints(user)
	return db.UpdateUser(user)
}

func notifyUser(user *User) error {
	if err := sendEmail(user); err != nil {
		return err
	}
	log.Printf("processed user %d", user.ID)
	return nil
}
```

### 识别职责过多的信号

- 函数名包含 "and"、"or"
- 函数内部有多层缩进
- 函数有多个注释段落
- 函数做了不同抽象层次的事

## 函数长度检查

### 控制长度

```go
// ✓ 好的函数 - 简短清晰
func CalculateAverage(numbers []int) float64 {
	if len(numbers) == 0 {
		return 0
	}

	sum := 0
	for _, n := range numbers {
		sum += n
	}

	return float64(sum) / float64(len(numbers))
}

// ✗ 不好的函数 - 过长（超过 50 行应该警惕）
func ProcessLargeFile(path string) error {
	// 100+ 行代码
	// ...
}
```

### 函数长度指南

- **理想**：10-20 行
- **可接受**：20-30 行
- **警告**：超过 50 行，考虑拆分
- **必须重构**：超过 100 行

## 参数设计检查

### 参数数量

```go
// ✗ 不好的例子 - 参数过多（超过 4 个）
func CreateUser(name, email, phone, address, city, state, zip string) error {
	// ...
}

// ✓ 正确的例子 - 使用结构体
type CreateUserRequest struct {
	Name    string
	Email   string
	Phone   string
	Address string
	City    string
	State   string
	Zip     string
}

func CreateUser(req CreateUserRequest) error {
	// ...
}
```

### 参数顺序

```go
// ✓ 正确的参数顺序
func ProcessData(ctx context.Context, data []byte, opts Options) error {
	// 1. context 在最前
	// 2. 主要输入数据
	// 3. 可选配置在最后
}

// ✗ 错误的参数顺序
func ProcessData(data []byte, opts Options, ctx context.Context) error {
	// context 不应该在后面
}
```

### 可选参数使用 Options 模式

```go
// ✓ 正确 - 使用 Functional Options 模式
type Option func(*Server)

func WithTimeout(timeout time.Duration) Option {
	return func(s *Server) {
		s.timeout = timeout
	}
}

func WithLogger(logger *Logger) Option {
	return func(s *Server) {
		s.logger = logger
	}
}

func NewServer(addr string, opts ...Option) *Server {
	s := &Server{
		addr:    addr,
		timeout: 30 * time.Second,
		logger:  &DefaultLogger{},
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

// 使用
server := NewServer("localhost:8080",
	WithTimeout(10*time.Second),
	WithLogger(logger),
)
```

### 可变参数

```go
// ✓ 正确 - 使用可变参数
func SendNotification(msg string, recipients ...string) error {
	for _, r := range recipients {
		if err := sendTo(r, msg); err != nil {
			return err
		}
	}
	return nil
}

// 使用
SendNotification("Hello", "user1@example.com", "user2@example.com")
SendNotification("Hello")  // 没有收件人也可以
```

## 返回值设计检查

### 错误作为最后一个返回值

```go
// ✓ 正确 - 错误在最后
func GetUser(id int) (*User, error) {
	// ...
}

func ReadFile(path string) ([]byte, error) {
	// ...
}

// ✗ 错误 - 错误不在最后
func GetUser(id int) (error, *User) {
	// ...
}
```

### 返回值数量

```go
// ✓ 正确 - 返回值不超过 3 个
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("division by zero")
	}
	return a / b, nil
}

// ✗ 不好的例子 - 返回值过多
func Process(data []byte) (result []byte, meta Metadata, stats Stats, err error) {
	// 太多返回值
}

// ✓ 改进 - 使用结构体
type ProcessResult struct {
	Result []byte
	Meta   Metadata
	Stats  Stats
}

func Process(data []byte) (ProcessResult, error) {
	// ...
}
```

### 命名返回值

```go
// ✓ 使用命名返回值有助于文档
func ReadFile(path string) (data []byte, err error) {
	data, err = os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}
	return data, nil
}

// ✓ 延迟修改返回值
func CountLines(path string) (count int, err error) {
	defer func() {
		if err != nil {
			err = fmt.Errorf("count lines: %w", err)
		}
	}()

	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		count++
	}

	return count, scanner.Err()
}

// ✗ 不需要时不要使用命名返回值
func Add(a, b int) (sum int) {  // 没有必要
	return a + b
}

func Add(a, b int) int {  // 更清晰
	return a + b
}
```

## 错误处理检查

### 不要忽略错误

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

### Early Return

```go
// ✓ 正确 - Early Return 模式
func ValidateUser(u *User) error {
	if u == nil {
		return fmt.Errorf("user is nil")
	}

	if u.Name == "" {
		return fmt.Errorf("name is required")
	}

	if u.Email == "" {
		return fmt.Errorf("email is required")
	}

	if !isValidEmail(u.Email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ✗ 不好的例子 - 深层嵌套
func ValidateUser(u *User) error {
	if u != nil {
		if u.Name != "" {
			if u.Email != "" {
				if isValidEmail(u.Email) {
					return nil
				} else {
					return fmt.Errorf("invalid email")
				}
			} else {
				return fmt.Errorf("email required")
			}
		} else {
			return fmt.Errorf("name required")
		}
	} else {
		return fmt.Errorf("user is nil")
	}
}
```

## 函数命名检查

### 动词开头

```go
// ✓ 正确 - 动词开头
func GetUser() *User
func ValidateInput() error
func CalculateTotal() int
func ProcessData() error
func HandleRequest() error

// ✗ 错误 - 名词开头或模糊词
func User() *User
func Input() error
func Total() int
func Data() error
func Request() error
```

### 一致的命名风格

```go
// ✓ 正确 - 一致的命名
func GetUser() *User
func CreateUser() error
func UpdateUser() error
func DeleteUser() error

// ✗ 不一致的命名
func GetUser() *User
func MakeUser() error
func ModifyUser() error
func RemoveUser() error
```

## 常见问题检查清单

### 职责

- [ ] 函数只做一件事？
- [ ] 函数名清楚表达功能？
- [ ] 没有多层嵌套？
- [ ] 可以独立测试？

### 长度

- [ ] 函数长度合理（< 50 行）？
- [ ] 复杂逻辑拆分为子函数？

### 参数

- [ ] 参数数量不超过 4 个？
- [ ] 参数过多时使用结构体？
- [ ] context 在最前面？
- [ ] 可选配置在最后？

### 返回值

- [ ] 错误作为最后一个返回值？
- [ ] 返回值数量不超过 3 个？
- [ ] 命名返回值有助于理解？

### 错误处理

- [ ] 不忽略错误？
- [ ] 使用 Early Return？
- [ ] 错误信息包含上下文？

<!--
Source references:
- https://github.com/xxjwxc/uber_go_guide_cn
- https://go.dev/doc/effective_go#named-results
-->
