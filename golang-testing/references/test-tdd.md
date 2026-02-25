---
name: test-tdd
description: TDD 方法论 - RED-GREEN-REFACTOR 循环
---

# TDD 方法论

## RED-GREEN-REFACTOR 循环

```
RED     → 先写失败的测试
GREEN   → 编写最少代码使测试通过
REFACTOR → 在保持测试绿色的同时改善代码
REPEAT  → 继续下一个需求
```

## Go 中的 TDD 实践

### 步骤 1：定义接口/签名

```go
// calculator.go
package calculator

func Add(a, b int) int {
	panic("not implemented") // 占位符
}
```

### 步骤 2：编写失败测试（RED）

```go
// calculator_test.go
package calculator

import "testing"

func TestAdd(t *testing.T) {
	got := Add(2, 3)
	want := 5
	if got != want {
		t.Errorf("Add(2, 3) = %d; want %d", got, want)
	}
}
```

### 步骤 3：执行测试 - 验证失败

```bash
$ go test
--- FAIL: TestAdd (0.00s)
panic: not implemented [recovered]
	panic: not implemented

FAIL
```

### 步骤 4：实现最少代码（GREEN）

```go
// calculator.go
func Add(a, b int) int {
	return a + b
}
```

### 步骤 5：执行测试 - 验证通过

```bash
$ go test
PASS
ok      calculator
```

### 步骤 6：重构（REFACTOR）

在保持测试绿色的同时改善代码：

```go
// 改善代码质量、可读性、性能等
// 确保测试仍然通过
```

## 完整示例

### 需求：实现字符串反转

#### RED - 编写测试

```go
func TestReverse(t *testing.T) {
	tests := []struct {
		name string
		input string
		want string
	}{
		{"empty", "", ""},
		{"single", "a", "a"},
		{"double", "ab", "ba"},
		{"word", "hello", "olleh"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Reverse(tt.input)
			if got != tt.want {
				t.Errorf("Reverse(%q) = %q; want %q", tt.input, got, tt.want)
			}
		})
	}
}
```

#### GREEN - 最小实现

```go
func Reverse(s string) string {
 runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}
```

#### REFACTOR - 改善代码

```go
// 如果发现更好的实现，可以重构
// 确保测试仍然通过
```

## TDD 的好处

1. **确保代码可测试** - 先写测试保证代码设计可测试
2. **文档作用** - 测试展示代码的使用方式
3. **重构信心** - 有测试保护时重构更安全
4. **减少调试** - 问题更早被发现

## TDD 最佳实践

### 小步前进

```go
// ✓ 正确 - 一次实现一个功能
func TestAdd(t *testing.T) { }       // 先实现
func TestSubtract(t *testing.T) { }  // 然后实现
func TestMultiply(t *testing.T) { }  // 然后实现
```

### 测试行为，不是实现

```go
// ✓ 正确 - 测试行为
func TestUserAge(t *testing.T) {
 user := NewUser(30)
 if user.Age() != 30 {
 t.Errorf("expected age 30")
 }
}

// ✗ 错误 - 测试实现细节
func TestUserAgeField(t *testing.T) {
 user := NewUser(30)
 if user.age != 30 {  // 访问私有字段
 t.Errorf("expected age 30")
 }
}
```

### 保持测试简单

```go
// ✓ 正确 - 简单直接
func TestAdd(t *testing.T) {
 if Add(2, 3) != 5 {
 t.Error("expected 5")
 }
}

// ✗ 过度复杂
func TestAddWithComplexSetup(t *testing.T) {
 // 太多设置代码
 // 太多依赖
}
```

## TDD 工作流程

```
1. 编写测试（RED）
   ↓
2. 运行测试 - 确认失败
   ↓
3. 编写最小实现（GREEN）
   ↓
4. 运行测试 - 确认通过
   ↓
5. 重构代码（REFACTOR）
   ↓
6. 运行测试 - 确保仍然通过
   ↓
7. 回到步骤 1（下一个功能）
```

## 常见错误

### 没有先写测试

```go
// ✗ 错误 - 先实现代码
func Add(a, b int) int {
 return a + b
}

// 然后写测试
func TestAdd(t *testing.T) {
 if Add(2, 3) != 5 {
 t.Error("failed")
 }
}
```

### 测试实现细节

```go
// ✗ 测试私有实现
func TestInternalCache(t *testing.T) {
 // 测试内部缓存机制
}

// ✓ 测试公开行为
func TestPerformance(t *testing.T) {
 // 测试性能是否满足要求
}
```

### 一次写太多测试

```go
// ✗ 一次写完所有测试
func TestCalculator(t *testing.T) {
 // Add, Subtract, Multiply, Divide...
}

// ✓ 一个功能一个测试
func TestAdd(t *testing.T) { }
func TestSubtract(t *testing.T) { }
```

<!--
Source references:
- https://go.dev/doc/tutorial/add-a-test
- https://go.dev/doc/effective_go#testing
-->
