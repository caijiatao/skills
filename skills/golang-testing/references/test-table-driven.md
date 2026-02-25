---
name: test-table-driven
description: 表格驱动测试 - Go 测试的标准模式
---

# 表格驱动测试

## 基本模式

表格驱动测试是 Go 测试的标准模式，以最少代码达到完整覆盖。

### 基本结构

```go
func TestAdd(t *testing.T) {
 tests := []struct {
 name     string
 a, b     int
 expected int
 }{
 {"positive numbers", 2, 3, 5},
 {"negative numbers", -1, -2, -3},
 {"zero values", 0, 0, 0},
 {"mixed signs", -1, 1, 0},
 {"large numbers", 1000000, 2000000, 3000000},
 }

 for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 got := Add(tt.a, tt.b)
 if got != tt.expected {
 t.Errorf("Add(%d, %d) = %d; want %d",
 tt.a, tt.b, got, tt.expected)
 }
 })
 }
}
```

## 带错误案例的表格驱动测试

```go
func TestParseConfig(t *testing.T) {
 tests := []struct {
 name    string
 input   string
 want    *Config
 wantErr bool
 }{
 {
 name:  "valid config",
 input: `{"host": "localhost", "port": 8080}`,
 want:  &Config{Host: "localhost", Port: 8080},
 },
 {
 name:    "invalid JSON",
 input:   `{invalid}`,
 wantErr: true,
 },
 {
 name:    "empty input",
 input:   "",
 wantErr: true,
 },
 {
 name:  "minimal config",
 input: `{}`,
 want:  &Config{},
 },
 }

 for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 got, err := ParseConfig(tt.input)

 if tt.wantErr {
 if err == nil {
 t.Error("expected error, got nil")
 }
 return
 }

 if err != nil {
 t.Fatalf("unexpected error: %v", err)
 }

 if !reflect.DeepEqual(got, tt.want) {
 t.Errorf("got %+v; want %+v", got, tt.want)
 }
 })
 }
}
```

## 复杂测试用例

### HTTP Handler 测试

```go
func TestAPIHandler(t *testing.T) {
 tests := []struct {
 name       string
 method     string
 path       string
 body       string
 wantStatus int
 wantBody   string
 }{
 {
 name:       "get user",
 method:     http.MethodGet,
 path:       "/users/123",
 wantStatus: http.StatusOK,
 wantBody:   `{"id":"123","name":"Alice"}`,
 },
 {
 name:       "not found",
 method:     http.MethodGet,
 path:       "/users/999",
 wantStatus: http.StatusNotFound,
 },
 {
 name:       "create user",
 method:     http.MethodPost,
 path:       "/users",
 body:       `{"name":"Bob"}`,
 wantStatus: http.StatusCreated,
 },
 }

 handler := NewAPIHandler()

 for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 var body io.Reader
 if tt.body != "" {
 body = strings.NewReader(tt.body)
 }

 req := httptest.NewRequest(tt.method, tt.path, body)
 req.Header.Set("Content-Type", "application/json")
 w := httptest.NewRecorder()

 handler.ServeHTTP(w, req)

 if w.Code != tt.wantStatus {
 t.Errorf("got status %d; want %d", w.Code, tt.wantStatus)
 }

 if tt.wantBody != "" && w.Body.String() != tt.wantBody {
 t.Errorf("got body %q; want %q", w.Body.String(), tt.wantBody)
 }
 })
 }
}
```

### 字符串处理测试

```go
func TestTrimSpace(t *testing.T) {
 tests := []struct {
 name  string
 input string
 want  string
 }{
 {
 name:  "no spaces",
 input: "hello",
 want:  "hello",
 },
 {
 name:  "leading spaces",
 input: "  hello",
 want:  "hello",
 },
 {
 name:  "trailing spaces",
 input: "hello  ",
 want:  "hello",
 },
 {
 name:  "both sides",
 input: "  hello  ",
 want:  "hello",
 },
 {
 name:  "all spaces",
 input: "     ",
 want:  "",
 },
 {
 name:  "empty",
 input: "",
 want:  "",
 },
 {
 name:  "internal spaces preserved",
 input: "hello  world",
 want:  "hello  world",
 },
 }

 for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 got := strings.TrimSpace(tt.input)
 if got != tt.want {
 t.Errorf("TrimSpace(%q) = %q; want %q", tt.input, got, tt.want)
 }
 })
 }
}
```

## 使用 t.Run 的好处

### 独立的子测试

```go
for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 // 每个子测试独立运行
 // 一个失败不影响其他
 })
}
```

### 运行特定子测试

```bash
# 运行所有测试
go test

# 运行特定子测试
go test -run TestAdd/"positive numbers"
go test -run TestAdd/"negative"
```

### 并行执行

```go
func TestParallel(t *testing.T) {
 tests := []struct {
 name  string
 input string
 }{
 {"case1", "input1"},
 {"case2", "input2"},
 {"case3", "input3"},
 }

 for _, tt := range tests {
 tt := tt  // 捕获循环变量
 t.Run(tt.name, func(t *testing.T) {
 t.Parallel()  // 并行执行
 result := Process(tt.input)
 // 断言...
 _ = result
 })
 }
}
```

## 表格驱动测试最佳实践

### 1. 使用描述性的测试名称

```go
// ✓ 正确 - 清晰的名称
{
 name: "valid input with positive numbers",
 ...
},

// ✗ 错误 - 不清楚的名称
{
 name: "test1",
 ...
},
```

### 2. 测试用例覆盖所有场景

```go
func TestDivide(t *testing.T) {
 tests := []struct {
 name      string
 a, b      int
 expected  int
 wantError bool
 }{
 {"normal division", 10, 2, 5, false},
 {"negative numbers", -10, 2, -5, false},
 {"divide by zero", 10, 0, 0, true},  // 错误案例
 {"zero divided", 0, 5, 0, false},
 }
 // ...
}
```

### 3. 结构体字段清晰

```go
// ✓ 正确 - 字段名清晰
tests := []struct {
 name        string
 input       string
 expected    string
 expectError bool
}{
 // ...
}

// ✗ 可读性差
tests := []struct {
 s, e, x string
 b       bool
}{
 // ...
}
```

### 4. 使用辅助函数

```go
func assertEqual[T comparable](t *testing.T, got, want T) {
 t.Helper()
 if got != want {
 t.Errorf("got %v; want %v", got, want)
 }
}

// 使用
for _, tt := range tests {
 t.Run(tt.name, func(t *testing.T) {
 got := Add(tt.a, tt.b)
 assertEqual(t, got, tt.expected)
 })
}
```

## 常见模式

### 测试边界值

```go
func TestClamp(t *testing.T) {
 tests := []struct {
 name   string
 value  int
 min    int
 max    int
 expect int
 }{
 {"within range", 5, 0, 10, 5},
 {"at min", 0, 0, 10, 0},
 {"at max", 10, 0, 10, 10},
 {"below min", -1, 0, 10, 0},
 {"above max", 11, 0, 10, 10},
 }
 // ...
}
```

### 测试空值和零值

```go
func TestProcess(t *testing.T) {
 tests := []struct {
 name    string
 input   string
 want    string
 wantErr bool
 }{
 {"normal input", "hello", "HELLO", false},
 {"empty input", "", "", false},
 {"whitespace", "   ", "   ", false},
 }
 // ...
}
```

### 测试多种类型

```go
func TestParse(t *testing.T) {
 tests := []struct {
 name    string
 input   string
 want    any
 wantErr bool
 }{
 {"int", "42", 42, false},
 {"float", "3.14", 3.14, false},
 {"bool", "true", true, false},
 {"string", `"hello"`, "hello", false},
 {"invalid", "abc", nil, true},
 }
 // ...
}
```

<!--
Source references:
- https://go.dev/doc/tutorial/add-a-test
- https://github.com/golang/go/wiki/TableDrivenTests
-->
