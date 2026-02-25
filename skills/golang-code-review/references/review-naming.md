---
name: review-naming
description: 命名规范审查 - 包名、变量名、函数名、常量名、接口名
---

# 命名规范审查

## 包命名检查

### 规则

- 包名应该是小写的单个单词
- 不应该使用下划线或驼峰命名
- 不应该与标准库包名冲突
- 包名应该简洁且描述性强

### 示例

```go
// ✓ 正确的包名
package user
package auth
package http
package json

// ✗ 错误的包名
package userServer      // 驼峰命名
package user_service     // 使用下划线
package Util             // 与标准库冲突或过于通用
package data             // 过于抽象
package info             // 过于抽象
```

## 变量命名检查

### 常见反模式（应该避免）

```go
// ✗ 过于通用的命名
var util *Helper
var temp *Buffer
var data []byte
var info string
var handle *Connection

// ✓ 使用描述性的命名
var helper *Helper
var buffer *Buffer
var payload []byte
var message string
var conn *Connection
```

### 驼峰命名规范

```go
// ✓ 正确 - 使用驼峰命名
var userID int
var httpRequest *http.Request
var xmlData []byte

// ✗ 错误 - 使用下划线
var user_id int
var http_request *http.Request
var xml_data []byte
```

### 缩写规范

缩写应该保持一致：

```go
// ✓ 正确 - 缩写保持一致
var userID int          // 不是 userId
var httpServer *Server  // 不是 HTTPServer 或 httpserver
var xmlParser *Parser   // 不是 XMLParser 或 xmlparser

// 特例：URL 可以全大写
var apiURL string       // 可以
var apiURL string       // 也可以
```

### 布尔值命名

布尔值应该以 `Is`、`Has`、`Can`、`Should` 开头：

```go
// ✓ 正确
var isActive bool
var hasPermission bool
var canWrite bool
var shouldRetry bool

// ✗ 错误 - 不清楚是布尔值
var active bool
var permission bool
var write bool
var retry bool
```

## 函数命名检查

### 函数名应该动词或动词短语开头

```go
// ✓ 正确 - 动词开头
func GetUser() *User
func ValidateInput() error
func ProcessData() error
func CalculateTotal() int

// ✗ 错误 - 名词开头或模糊词
func User() *User
func Input() error
func Process() error
func Handle() error
func Do() error
```

### 构造函数命名

```go
// ✓ 正确 - 使用 New 前缀
func NewUser() *User
func NewServer(config *Config) *Server
func NewClient(addr string) (*Client, error)

// ✗ 错误 - 不使用 New 前缀
func CreateUser() *User
func MakeServer() *Server
func GetClient() *Client
```

### Get 前缀的使用

Go 中通常不需要 `Get` 前缀：

```go
// ✓ 正确 - 直接使用字段名
func (u *User) ID() int {
	return u.id
}
func (u *User) Name() string {
	return u.name
}

// ✗ 错误 - 不必要的 Get 前缀
func (u *User) GetID() int {
	return u.id
}
func (u *User) GetName() string {
	return u.name
}

// ✓ 使用 Get 的场景 - 计算或获取
func (c *Cache) Get(key string) (any, bool) {
	// 需要查找缓存，不是简单返回字段
}

func (u *User) GetFullName() string {
	// 需要拼接 firstName 和 lastName
}
```

## 常量命名检查

### 驼峰命名（不是全大写）

```go
// ✓ 正确 - 使用驼峰命名
const maxRetries = 3
const defaultTimeout = 30 * time.Second
const apiVersion = "v1"

// ✗ 错误 - Go 不使用全大写加下划线
const MAX_RETRIES = 3
const DEFAULT_TIMEOUT = 30 * time.Second
const API_VERSION = "v1"
```

### iota 常量组

```go
// ✓ 正确 - 使用 iota 并添加注释
type Status int

const (
	StatusPending Status = iota // 0 - 待处理
	StatusActive                // 1 - 活跃
	StatusInactive              // 2 - 非活跃
	StatusDeleted               // 3 - 已删除
)

// ✗ 错误 - 缺少注释说明
const (
	StatusPending Status = iota
	StatusActive
	StatusInactive
	StatusDeleted
)
```

## 接口命名检查

### 单方法接口

单方法接口应该使用方法名 + `er` 后缀：

```go
// ✓ 正确 - 单方法接口命名
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Runner interface {
	Run() error
}

type Stringer interface {
	String() string
}
```

### 方法名以 r 结尾时的处理

```go
// ✗ 会产生奇怪的名字
type Carer interface {
	Car() error  // 不合理
}

type Fixer interface {
	Fix() error  // FixCar 会和 Fix 方法混淆
}

// ✓ 正确 - 使用变体
type CarFactory interface {
	Car() (*Car, error)
}

type Repairable interface {
	Fix() error
}

type Runnable interface {
	Run() error
}
```

### 多方法接口

多方法接口应该有描述性的名称：

```go
// ✓ 正确 - 描述性的名称
type UserService interface {
	GetUser(id int) (*User, error)
	CreateUser(u *User) error
	UpdateUser(u *User) error
	DeleteUser(id int) error
}

type Filesystem interface {
	Create(path string) (*File, error)
	Open(path string) (*File, error)
	Remove(path string) error
}
```

## 常见命名问题检查清单

### 包命名

- [ ] 包名是小写的单个单词？
- [ ] 没有使用下划线或驼峰命名？
- [ ] 包名简洁且描述性强？
- [ ] 没有与标准库包名冲突？

### 变量命名

- [ ] 使用驼峰命名？
- [ ] 没有使用过于通用的命名（util, temp, data, info, handle）？
- [ ] 布尔值以 Is/Has/Can/Should 开头？
- [ ] 缩写保持一致？

### 函数命名

- [ ] 函数名以动词或动词短语开头？
- [ ] 构造函数使用 New 前缀？
- [ ] 简单 getter 没有 Get 前缀？
- [ ] 函数名清楚地表达功能？

### 常量命名

- [ ] 使用驼峰命名（不是全大写加下划线）？
- [ ] iota 常量有清晰的注释？

### 接口命名

- [ ] 单方法接口使用方法名 + er 后缀？
- [ ] 多方法接口有描述性名称？
- [ ] 接口名清楚表达其用途？

<!--
Source references:
- https://github.com/xxjwxc/uber_go_guide_cn
- https://go.dev/doc/effective_go#names
- https://github.com/golang/go/wiki/CodeReviewComments#package-names
-->
