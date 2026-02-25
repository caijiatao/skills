---
name: test-fuzzing
description: 模糊测试（Go 1.18+）
---

# 模糊测试（Fuzzing）

## 基本模糊测试

### 编写模糊测试

```go
func FuzzParseJSON(f *testing.F) {
 // 添加种子语料库
 f.Add(`{"name": "test"}`)
 f.Add(`{"count": 123}`)
 f.Add(`[]`)
 f.Add(`""`)

 f.Fuzz(func(t *testing.T, input string) {
 var result map[string]interface{}
 err := json.Unmarshal([]byte(input), &result)

 if err != nil {
 // 无效输入预期会有错误
 return
 }

 // 如果解析成功，重新编码应该可行
 _, err = json.Marshal(result)
 if err != nil {
 t.Errorf("Marshal failed after successful Unmarshal: %v", err)
 }
 })
}
```

### 运行模糊测试

```bash
# 运行模糊测试
go test -fuzz=FuzzParseJSON

# 限制时间
go test -fuzz=FuzzParseJSON -fuzztime=30s

# 限制迭代次数
go test -fuzz=FuzzParseJSON -fuzztime=1000x
```

## 模糊测试结构

### F.Add() 添加种子

```go
func FuzzDecode(f *testing.F) {
 // 添加种子语料库
 f.Add([]byte{0x00, 0x01})
 f.Add([]byte("hello"))
 f.Add([]byte{})

 f.Fuzz(func(t *testing.T, data []byte) {
 result, err := Decode(data)
 if err != nil {
 return
 }

 // 验证属性
 if result != nil && len(result) == 0 {
 t.Error("decoded result should not be empty")
 }
 })
}
```

### 多输入模糊测试

```go
func FuzzCompare(f *testing.F) {
 f.Add("hello", "world")
 f.Add("", "")
 f.Add("abc", "abc")

 f.Fuzz(func(t *testing.T, a, b string) {
 result := Compare(a, b)

 // 属性 1: Compare(a, a) 应该总是等于 0
 if a == b && result != 0 {
 t.Errorf("Compare(%q, %q) = %d; want 0", a, b, result)
 }

 // 属性 2: Compare(a, b) 和 Compare(b, a) 应该有相反符号
 reverse := Compare(b, a)
 if (result > 0 && reverse >= 0) || (result < 0 && reverse <= 0) {
 if result != 0 || reverse != 0 {
 t.Errorf("Compare(%q, %q) = %d, Compare(%q, %q) = %d; inconsistent",
 a, b, result, b, a, reverse)
 }
 }
 })
}
```

## 属性测试

### 反函数属性

```go
func FuzzRoundTrip(f *testing.F) {
 // 种子语料库
 f.Add(42.5)
 f.Add(0.0)
 f.Add(-123.45)

 f.Fuzz(func(t *testing.T, n float64) {
 // 序列化
 data, err := EncodeFloat(n)
 if err != nil {
 t.Fatalf("EncodeFloat failed: %v", err)
 }

 // 反序列化
 decoded, err := DecodeFloat(data)
 if err != nil {
 t.Fatalf("DecodeFloat failed: %v", err)
 }

 // 验证往返
 if decoded != n {
 t.Errorf("round trip failed: got %v, want %v", decoded, n)
 }
 })
}
```

### 结合律属性

```go
func FuzzAdditionAssociative(f *testing.F) {
 f.Fuzz(func(t *testing.T, a, b, c int) {
 // (a + b) + c 应该等于 a + (b + c)
 left := Add(Add(a, b), c)
 right := Add(a, Add(b, c))

 if left != right {
 t.Errorf("not associative: (%d + %d) + %d = %d, %d + (%d + %d) = %d",
 a, b, c, left, a, b, c, right)
 }
 })
}
```

### 幂等性属性

```go
func FuzzIdempotent(f *testing.F) {
 f.Add("hello")
 f.Add("")
 f.Add("   ")

 f.Fuzz(func(t *testing.T, s string) {
 // TrimSpace 应该是幂等的
 once := strings.TrimSpace(s)
 twice := strings.TrimSpace(once)

 if once != twice {
 t.Errorf("not idempotent: TrimSpace(TrimSpace(%q)) = %q, want %q",
 s, twice, once)
 }
 })
}
```

## 复杂模糊测试

### HTML 解析

```go
func FuzzHTMLParser(f *testing.F) {
 // 添加常见 HTML 样例
 f.Add("<html><body>Hello</body></html>")
 f.Add("<div>test</div>")
 f.Add("<p>paragraph</p>")
 f.Add("")

 f.Fuzz(func(t *testing.T, input string) {
 doc, err := html.Parse(strings.NewReader(input))
 if err != nil {
 // 无效 HTML 可能会失败
 return
 }

 // 验证解析后的文档可以遍历
 var count int
 var traverse func(*html.Node)
 traverse = func(n *html.Node) {
 count++
 if n.FirstChild != nil {
 traverse(n.FirstChild)
 }
 if n.NextSibling != nil {
 traverse(n.NextSibling)
 }
 }

 traverse(doc)

 // 如果解析成功，至少应该有根节点
 if count == 0 {
 t.Error("parsed document has no nodes")
 }
 })
}
```

### URL 解析

```go
func FuzzURLParse(f *testing.F) {
 // 种子语料库
 f.Add("http://example.com")
 f.Add("https://example.com:8080/path?query=value")
 f.Add("ftp://user:pass@host:21/path")
 f.Add("mailto:test@example.com")

 f.Fuzz(func(t *testing.T, input string) {
 u, err := url.Parse(input)
 if err != nil {
 // 无效 URL 会失败
 return
 }

 // 验证：重新编码的 URL 应该有效
 reconstructed := u.String()
 _, err = url.Parse(reconstructed)
 if err != nil {
 t.Errorf("reconstructed URL %q is invalid: %v", reconstructed, err)
 }
 })
}
```

## 模糊测试配置

### 限制模糊测试时间

```bash
# 运行 30 秒
go test -fuzz=FuzzParseJSON -fuzztime=30s

# 运行特定迭代次数
go test -fuzz=FuzzParseJSON -fuzztime=10000x

# 无限制运行（查找更多错误）
go test -fuzz=FuzzParseJSON -fuzztime=1000000x
```

### 保存模糊测试语料库

```bash
# 模糊测试会在 testdata/fuzz 目录保存导致失败的输入
go test -fuzz=FuzzParseJSON

# 下次运行会使用保存的输入
go test
```

## 最佳实践

### 1. 添加好的种子语料库

```go
func FuzzWithGoodSeeds(f *testing.F) {
 // ✓ 添加典型输入
 f.Add("valid-input-123")
 f.Add("")
 f.Add("   ")

 // ✓ 添加边界值
 f.Add("a")
 f.Add(strings.Repeat("a", 1000))

 // ✓ 添加特殊字符
 f.Add("!@#$%^&*()")
}
```

### 2. 验证不变量/属性

```go
func FuzzInvariant(f *testing.F) {
 f.Fuzz(func(t *testing.T, s string) {
 // 不变量 1: 长度非负
 if len(s) < 0 {
 t.Error("length should be non-negative")
 }

 // 不变量 2: 字符串可以转为字节切片
 bytes := []byte(s)
 if len(bytes) != len(s) {
 t.Error("byte slice length mismatch")
 }
 })
}
```

### 3. 处理预期的失败

```go
func FuzzExpectFailures(f *testing.F) {
 f.Fuzz(func(t *testing.T, input string) {
 result, err := Parse(input)

 if err != nil {
 // 解析失败是预期的
 return
 }

 // 如果解析成功，验证结果
 if result == nil {
 t.Error("successful parse should return non-nil result")
 }
 if result.Value == "" {
 t.Error("result should have value")
 }
 })
}
```

### 4. 限制复杂性

```go
func FuzzWithComplexityCheck(f *testing.F) {
 f.Fuzz(func(t *testing.T, s string) {
 // 限制输入大小
 if len(s) > 10000 {
 return // 跳过过大的输入
 }

 // 验证操作
 result := Process(s)
 _ = result
 })
}
```

## 调试模糊测试

### 查看导致失败的输入

```bash
# 模糊测试失败时，会在 testdata/fuzz 中保存输入
cat testdata/fuzz/FuzzParseJSON/a1b2c3d4
```

### 复现失败

```bash
# 使用保存的输入复现失败
go test -v -run=FuzzParseJSON/a1b2c3d4
```

## 常见问题

### 1. 模糊测试太慢

```go
// ✗ 太慢 - 复杂操作
f.Fuzz(func(t *testing.T, data []byte) {
 result := ExpensiveOperation(data)  // 太慢！
 _ = result
})

// ✓ 改进 - 简化操作或添加复杂度检查
f.Fuzz(func(t *testing.T, data []byte) {
 if len(data) > 1000 {
 return  // 跳过大输入
 }
 result := ExpensiveOperation(data)
 _ = result
})
```

### 2. 模糊测试崩溃

```go
// ✓ 使用 defer 恢复
f.Fuzz(func(t *testing.T, input string) {
 defer func() {
 if r := recover(); r != nil {
 t.Errorf("panic recovered: %v", r)
 }
 }()

 DangerousOperation(input)
})
```

### 3. 模糊测试超时

```bash
# 限制时间
go test -fuzz=FuzzParseJSON -fuzztime=30s -timeout=2m
```

<!--
Source references:
- https://go.dev/doc/tutorial/fuzz
- https://go.dev/doc/fuzz/
- https://go.dev/blog/fuzz-beta
-->
