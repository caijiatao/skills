---
name: review-structs
description: 结构体设计审查 - 字段设计、嵌入使用、构造函数、自定义类型
---

# 结构体设计审查

## 字段设计检查

### 字段顺序建议

1. 基础字段（ID、时间戳）
2. 核心业务字段
3. 可选字段
4. 关联字段

### 示例

```go
// ✗ 不好的例子 - 字段顺序混乱
type User struct {
	Address  string
	ID       int
	Profile  *Profile
	Name     string
	CreatedAt time.Time
}

// ✓ 正确的例子 - 按类别组织
type User struct {
	// 基础字段
	ID        int
	CreatedAt time.Time
	UpdatedAt time.Time

	// 核心业务字段
	Name  string
	Email string

	// 可选字段
	Phone   string
	Address string

	// 关联字段
	Profile *Profile
}
```

### 字段分组和注释

```go
// ✓ 正确 - 清晰的分组和注释
type Server struct {
	// 配置
	Host     string
	Port     int
	Timeout  time.Duration

	// 状态
	running  bool
	connCount int64

	// 依赖
	logger   *Logger
	db       *Database
}
```

## 嵌入（Embedding）使用检查

### is-a vs has-a

- **is-a 关系**：使用嵌入（Dog is an Animal）
- **has-a 关系**：使用组合（User has a Profile）

### 示例

```go
// ✓ 正确 - is-a 关系使用嵌入
type Animal struct {
	Name string
	Age  int
}

func (a *Animal) Speak() string {
	return "..."
}

type Dog struct {
	Animal  // Dog is an Animal
	Breed string
}

dog := &Dog{}
dog.Speak()  // 可以调用 Animal 的方法

// ✓ 正确 - has-a 关系使用组合
type User struct {
	ID    int
	Name  string
	// 不要嵌入 Profile，而是使用字段
	profile *Profile
}

type Profile struct {
	Avatar string
	Bio    string
}

func (u *User) GetProfile() *Profile {
	return u.profile
}
```

### 避免不必要的嵌入

```go
// ✗ 不好的例子 - 滥用嵌入
type UserService struct {
	Logger   // 不必要的嵌入
	Database // 不必要的嵌入
	config   *Config
}

// 问题：
// 1. Logger 和 Database 的所有方法都暴露给 UserService
// 2. 不清楚 UserService 是否真的 is-a Logger
// 3. 命名可能冲突

// ✓ 正确的例子 - 使用组合
type UserService struct {
	logger   *Logger
	db       *Database
	config   *Config
}

func (s *UserService) GetUser(id int) (*User, error) {
	s.logger.Info("getting user", "id", id)
	return s.db.FindUser(id)
}
```

### 嵌入的命名冲突问题

```go
type A struct {
	Name string
}

type B struct {
	Name string
}

type C struct {
	A
	B
}

// 访问字段时需要明确指定
c := &C{}
c.A.Name  // 明确访问 A 的 Name
c.B.Name  // 明确访问 B 的 Name
// c.Name  // 编译错误 - 有歧义
```

## 构造函数检查

### NewXxx 格式

```go
// ✓ 正确 - 使用 New 前缀
func NewUser(name, email string) (*User, error) {
	if name == "" {
		return nil, fmt.Errorf("name cannot be empty")
	}

	return &User{
		Name:      name,
		Email:     email,
		CreatedAt: time.Now(),
	}, nil
}

// ✗ 错误 - 不使用 New 前缀
func CreateUser(name, email string) (*User, error) {
	// ...
}

func MakeUser(name, email string) (*User, error) {
	// ...
}
```

### 验证必需参数

```go
// ✓ 正确 - 验证必需参数
func NewServer(host string, port int) (*Server, error) {
	if host == "" {
		return nil, fmt.Errorf("host cannot be empty")
	}
	if port <= 0 || port > 65535 {
		return nil, fmt.Errorf("invalid port: %d", port)
	}

	return &Server{
		Host: host,
		Port: port,
	}, nil
}

// ✗ 错误 - 不验证参数
func NewServer(host string, port int) *Server {
	return &Server{
		Host: host,
		Port: port,  // 可能是无效的端口
	}
}
```

### 设置合理的默认值

```go
// ✓ 正确 - 设置默认值
func NewClient(endpoint string) *Client {
	return &Client{
		Endpoint: endpoint,
		Timeout:  30 * time.Second,  // 默认超时
		MaxRetries: 3,               // 默认重试次数
		LogLevel:  "info",           // 默认日志级别
	}
}

// ✗ 错误 - 使用零值作为默认值
func NewClient(endpoint string) *Client {
	return &Client{
		Endpoint: endpoint,
		// Timeout 是 0 - 没有超时保护
		// MaxRetries 是 0 - 不会重试
	}
}
```

### 返回指针还是值

```go
// ✓ 正确 - 返回指针
func NewUser(name string) *User {
	return &User{Name: name}
}

// 何时返回值：
// 1. 结构体很小（不影响性能）
// 2. 不需要修改（不可变）
// 3. 值语义更自然

// ✓ 正确 - 返回值（不可变）
func NewPoint(x, y int) Point {
	return Point{X: x, Y: y}
}
```

## 自定义类型使用检查

### 何时使用自定义类型

```go
// ✓ 使用自定义类型避免混淆
type UserID int
type OrderID int
type ProductID int

func GetUserOrder(userID UserID) (*Order, error) {
	// 编译器会帮助检查类型
	// OrderID 不能传递给 UserID 参数
}

// ✗ 不使用自定义类型
func GetUserOrder(userID int) (*Order, error) {
	// 容易混淆 - int 可以是任何 ID
}
```

### 为类型添加方法

```go
// ✓ 正确 - 为类型添加方法
type Duration int64

func (d Duration) String() string {
	return fmt.Sprintf("%dms", d)
}

func (d Duration) Hours() float64 {
	return float64(d) / 3600000
}

// 使用
var d Duration = 3600000
fmt.Println(d)      // 3600000ms
fmt.Println(d.Hours())  // 1.0
```

### 底层类型转换

```go
type UserID int

// ✓ 正确 - 显式转换
func GetUserID(u User) UserID {
	return UserID(u.ID)  // 显式转换
}

// ✓ 正确 - 回退到底层类型
func (id UserID) Int() int {
	return int(id)
}
```

## 结构体标签（Tags）

### JSON 标签

```go
// ✓ 正确 - 使用 JSON 标签
type User struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"-"`  // 不序列化
}

// ✓ 正确 - 使用 omitempty
type Request struct {
	Query    string `json:"query"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"page_size,omitempty"`
}
```

### 其他常用标签

```go
type User struct {
	ID        int       `json:"id" db:"id" bson:"_id"`
	Name      string    `json:"name" db:"name" bson:"name"`
	Email     string    `json:"email" db:"email" bson:"email"`
	CreatedAt time.Time `json:"created_at" db:"created_at" bson:"created_at"`
}
```

## 常见问题检查清单

### 字段设计

- [ ] 字段按逻辑分组（基础、核心、可选、关联）？
- [ ] 字段顺序清晰易读？
- [ ] 相关的字段放在一起？
- [ ] 添加必要的分组注释？

### 嵌入使用

- [ ] is-a 关系使用嵌入？
- [ ] has-a 关系使用组合？
- [ ] 没有不必要的嵌入？
- [ ] 考虑了命名冲突问题？

### 构造函数

- [ ] 使用 NewXxx 格式命名？
- [ ] 验证必需参数？
- [ ] 设置合理的默认值？
- [ ] 返回类型正确（指针或值）？

### 自定义类型

- [ ] 需要类型安全时使用自定义类型？
- [ ] 为类型添加了有意义的方法？
- [ ] 类型转换清晰？

<!--
Source references:
- https://github.com/xxjwxc/uber_go_guide_cn
- https://go.dev/doc/effective_go#embedding
-->
