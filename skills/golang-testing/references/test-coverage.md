---
name: test-coverage
description: 测试覆盖率
---

# 测试覆盖率

## 执行覆盖率

### 基本覆盖率

```bash
# 基本覆盖率
go test -cover ./...

# 输出示例:
# ok      mypackage    0.5s    coverage: 85.3% of statements
```

### 生成覆盖率 profile

```bash
# 生成覆盖率 profile
go test -coverprofile=coverage.out ./...

# 查看覆盖率
go tool cover -func=coverage.out

# 输出示例:
# mypackage/file.go:15:    NewFunction      100.0%
# mypackage/file.go:25:    Process           66.7%
# mypackage/file.go:50:    Helper           0.0%
# total:                   80.5%
```

### 在浏览器查看覆盖率

```bash
# 在浏览器查看
go tool cover -html=coverage.out

# 自动打开浏览器
go tool cover -html=coverage.out -o coverage.html && start coverage.html  # Windows
```

## 覆盖率选项

### 按包查看

```bash
# 只查看特定包
go test -coverprofile=coverage.out ./mypackage

# 多个包
go test -coverprofile=coverage.out ./...
```

### 模式匹配

```bash
# 匹配包路径
go test -coverprofile=coverage.out ./... -coverpkg=./mypackage/...
```

### 覆盖率模式

```bash
# set: 是否覆盖（默认）
go test -covermode=set -coverprofile=coverage.out

# count: 执行次数
go test -covermode=count -coverprofile=coverage.out

# atomic: 原子计数（并行安全）
go test -covermode=atomic -coverprofile=coverage.out
```

## 覆盖率目标

### 代码类型目标

| 代码类型 | 目标 |
|-----------|------|
| 关键业务逻辑 | 100% |
| 公开 API | 90%+ |
| 一般代码 | 80%+ |
| 生成的代码 | 排除 |
| 错误处理 | 高覆盖 |

### 设置覆盖率阈值

```bash
# 检查覆盖率是否达标
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total | \
 awk '{if ($3+0 < 80) exit 1}'
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests with coverage
        run: go test -race -coverprofile=coverage.out ./...

      - name: Check coverage threshold
        run: |
          go tool cover -func=coverage.out | grep total | \
          awk '{if ($3+0 < 80) {print "Coverage " $3 " is below 80%"; exit 1}}'

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.out
```

### 显示覆盖率徽章

```yaml
# 生成覆盖率报告
- name: Generate coverage report
  run: go tool cover -html=coverage.out -o coverage.html

# 上传 artifact
- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage.html
```

## 排除代码

### 生成标签

```go
//go:generate go run github.com/path/to/generator

// 生成的函数
func GeneratedFunction() int {
 return 42
}
```

```bash
# 排除生成的文件
go test -coverprofile=coverage.out ./... -coverpkg=./mypackage,!./mypackage/generated
```

### 构建标签

```go
//go:build !ignore_coverage

// +build !ignore_coverage

package mypackage

func TestedFunction() int {
 return 42
}

//go:build ignore_coverage

// +build ignore_coverage

package mypackage

func IgnoredFunction() int {
 return 1
}
```

## 覆盖率分析

### 查看未覆盖的代码

```bash
# 生成 HTML 报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# 在浏览器中：
# - 红色: 未覆盖
# - 绿色: 已覆盖
# - 灰色: 不需要覆盖（如生成的代码）
```

### 针对性测试

```bash
# 针对特定包测试
go test -coverprofile=coverage.out -coverpkg=./mypackage ./mypackage/...

# 针对特定文件
go test -coverprofile=coverage.out -run TestSpecificFunction
```

## 覆盖率最佳实践

### 1. 关注质量而非数量

```go
// ✓ 好的测试 - 验证行为
func TestAdd(t *testing.T) {
 if Add(2, 3) != 5 {
 t.Error("expected 5")
 }
}

// ✗ 坏的测试 - 只是为了覆盖率
func TestDummy(t *testing.T) {
 Add(1, 1)  // 只是为了覆盖代码
}
```

### 2. 测试边界条件

```go
func TestBoundaryConditions(t *testing.T) {
 tests := []struct {
 input    int
 expected int
 }{
 {0, 0},      // 边界
 {1, 1},
 {100, 100},  // 边界
 {-1, -1},    // 负数
 }

 for _, tt := range tests {
 t.Run(fmt.Sprintf("input=%d", tt.input), func(t *testing.T) {
 if Process(tt.input) != tt.expected {
 t.Errorf("got unexpected result")
 }
 })
 }
}
```

### 3. 测试错误路径

```go
func TestErrorPaths(t *testing.T) {
 // 测试各种错误情况
 _, err := Process("")
 if err == nil {
 t.Error("expected error for empty input")
 }

 _, err = Process("invalid")
 if err == nil {
 t.Error("expected error for invalid input")
 }
}
```

### 4. 集成测试覆盖率

```bash
# 单元测试覆盖率
go test -coverprofile=unit_coverage.out ./...

# 集成测试覆盖率
go test -coverprofile=integration_coverage.out -tags=integration ./...

# 合并覆盖率
go tool cover -func=unit_coverage.out > coverage.txt
go tool cover -func=integration_coverage.out >> coverage.txt
```

## 覆盖率陷阱

### 1. 盲目追求 100%

```go
// ✓ 合理 - 关键代码需要高覆盖
func ValidateInput(input string) error {
 if input == "" {
 return fmt.Errorf("input is required")
 }
 return nil
}

// ✓ 可接受 - 简单的错误处理
func Process() error {
 defer func() {
 if r := recover(); r != nil {
 log.Printf("panic recovered: %v", r)
 }
 }()
 // 处理逻辑...
 return nil
}
```

### 2. 测试实现细节

```go
// ✗ 测试实现
func TestInternalCache(t *testing.T) {
 // 测试内部缓存机制
}

// ✓ 测试行为
func TestPerformance(t *testing.T) {
 // 测试性能是否满足要求
}
```

### 3. 脆弱的测试

```go
// ✗ 脆弱 - 依赖具体实现
func TestExactOutput(t *testing.T) {
 got := Format(time.Now())
 want := "2024-01-15 10:30:00"
 if got != want {
 t.Errorf("got %q; want %q", got, want)  // 时间相关，总是失败
 }
}

// ✓ 稳定 - 验证格式
func TestFormat(t *testing.T) {
 got := Format(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
 if len(got) != 19 {
 t.Errorf("unexpected format length")
 }
}
```

## 覆盖率和竞态检测

### 同时运行

```bash
# 覆盖率 + 竞态检测
go test -race -coverprofile=coverage.out ./...
```

### CI 配置

```yaml
# 测试矩阵
strategy:
  matrix:
    test-mode:
      - race
      - coverage

steps:
  - name: Test with race detection
    if: matrix.test-mode == 'race'
    run: go test -race ./...

  - name: Test with coverage
    if: matrix.test-mode == 'coverage'
    run: go test -coverprofile=coverage.out ./...
```

<!--
Source references:
- https://go.dev/doc/effective_go#testing
- https://go.dev/blog/cover
- https://pkg.go.dev/cmd/go/internal/test
-->
