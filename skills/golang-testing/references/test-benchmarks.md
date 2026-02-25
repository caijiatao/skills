---
name: test-benchmarks
description: 基准测试
---

# 基准测试

## 基本基准测试

### 编写基准测试

```go
func BenchmarkAbs(b *testing.B) {
 for i := 0; i < b.N; i++ {
 Abs(-1)
 }
}
```

### 运行基准测试

```bash
# 运行所有基准测试
go test -bench=.

# 运行特定基准测试
go test -bench=BenchmarkAbs

# 运行并显示内存分配
go test -bench=. -benchmem
```

### 输出解读

```
BenchmarkAbs-8   	100000000	        10.5 ns/op
```

- `BenchmarkAbs-8`: 测试名称，使用 8 个 CPU
- `100000000`: 运行次数
- `10.5 ns/op`: 每次操作耗时 10.5 纳秒

```
BenchmarkAbs-8   	100000000	        10.5 ns/op	     0 B/op	     0 allocs/op
```

- `0 B/op`: 每次操作分配 0 字节
- `0 allocs/op`: 每次操作分配 0 次

## 重置计时器

### b.ResetTimer()

```go
func BenchmarkExpensive(b *testing.B) {
 // 耗时的设置
 data := generateTestData(1000000)

 b.ResetTimer() // 重置计时器，不包括设置时间

 for i := 0; i < b.N; i++ {
 Process(data)
 }
}
```

### b.StopTimer() / b.StartTimer()

```go
func BenchmarkWithPause(b *testing.B) {
 for i := 0; i < b.N; i++ {
 b.StopTimer()
 // 不计时的操作
 setupData()
 b.StartTimer()

 // 计时的操作
 Process()
 }
}
```

## 并行基准测试

### b.RunParallel()

```go
func BenchmarkParallel(b *testing.B) {
 b.RunParallel(func(pb *testing.PB) {
 for pb.Next() {
 // 并行运行
 Process()
 }
 })
}
```

### 比较并行性能

```go
func BenchmarkSerial(b *testing.B) {
 for i := 0; i < b.N; i++ {
 Process()
 }
}

func BenchmarkParallel(b *testing.B) {
 b.RunParallel(func(pb *testing.PB) {
 for pb.Next() {
 Process()
 }
 })
}
```

## 不同大小的基准测试

### 子测试不同输入

```go
func BenchmarkSort(b *testing.B) {
 sizes := []int{100, 1000, 10000, 100000}

 for _, size := range sizes {
 b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
 data := generateRandomSlice(size)
 b.ResetTimer()

 for i := 0; i < b.N; i++ {
 // 复制以避免排序已排序的数据
 tmp := make([]int, len(data))
 copy(tmp, data)
 sort.Ints(tmp)
 }
 })
 }
}
```

### 输出结果

```
BenchmarkSort/size=100-8     	5000000	        235 ns/op
BenchmarkSort/size=1000-8    	  300000	      4235 ns/op
BenchmarkSort/size=10000-8   	   30000	    45678 ns/op
BenchmarkSort/size=100000-8	    3000	   567890 ns/op
```

## 内存分配基准测试

### 比较不同实现

```go
func BenchmarkStringConcat(b *testing.B) {
 parts := []string{"hello", "world", "foo", "bar", "baz"}

 b.Run("plus", func(b *testing.B) {
 for i := 0; i < b.N; i++ {
 var s string
 for _, p := range parts {
 s += p
 }
 _ = s
 }
 })

 b.Run("builder", func(b *testing.B) {
 for i := 0; i < b.N; i++ {
 var sb strings.Builder
 for _, p := range parts {
 sb.WriteString(p)
 }
 _ = sb.String()
 }
 })

 b.Run("join", func(b *testing.B) {
 for i := 0; i < b.N; i++ {
 _ = strings.Join(parts, "")
 }
 })
}
```

### 结果比较

```
BenchmarkStringConcat/plus-8     	  500000	      2456 ns/op	     512 B/op	      15 allocs/op
BenchmarkStringConcat/builder-8   	 5000000	       256 ns/op	      64 B/op	       1 allocs/op
BenchmarkStringConcat/join-8      	 5000000	       234 ns/op	      64 B/op	       1 allocs/op
```

`strings.Builder` 和 `strings.Join` 明显更快，分配更少内存。

## 比较函数性能

### 字符串格式化

```go
func BenchmarkSprintf(b *testing.B) {
 for i := 0; i < b.N; i++ {
 _ = fmt.Sprintf("user=%s id=%d", "alice", 123)
 }
}

func BenchmarkStrconv(b *testing.B) {
 for i := 0; i < b.N; i++ {
 _ = "user=" + "alice" + " id=" + strconv.Itoa(123)
 }
}

func BenchmarkStringBuilder(b *testing.B) {
 for i := 0; i < b.N; i++ {
 var sb strings.Builder
 sb.WriteString("user=")
 sb.WriteString("alice")
 sb.WriteString(" id=")
 sb.WriteString(strconv.Itoa(123))
 _ = sb.String()
 }
}
```

## 基准测试最佳实践

### 1. 使用 b.N

```go
// ✓ 正确 - 使用 b.N
func BenchmarkCorrect(b *testing.B) {
 for i := 0; i < b.N; i++ {
 Process()
 }
}

// ✗ 错误 - 不使用 b.N
func BenchmarkWrong(b *testing.B) {
 for i := 0; i < 1000; i++ {
 Process()
 }
}
```

### 2. 避免编译器优化

```go
// ✓ 正确 - 使用结果
func BenchmarkCorrect(b *testing.B) {
 var result int
 for i := 0; i < b.N; i++ {
 result = Calculate(i)
 }
 _ = result  // 使用结果，避免优化
}

// ✗ 错误 - 结果被优化掉
func BenchmarkWrong(b *testing.B) {
 for i := 0; i < b.N; i++ {
 _ = Calculate(i)  // 可能被优化掉
 }
}
```

### 3. 全局变量需要重置

```go
var globalResult int

func BenchmarkGlobal(b *testing.B) {
 for i := 0; i < b.N; i++ {
 globalResult = Calculate(i)
 }
}
```

### 4. 使用 -benchtime

```bash
# 更长的基准时间（默认 1 秒）
go test -bench=. -benchtime=10s

# 最小迭代次数
go test -bench=. -benchtime=1000x
```

## 内存分析

### 报告内存分配

```go
func BenchmarkWithMemStats(b *testing.B) {
 b.ReportAllocs()
 for i := 0; i < b.N; i++ {
 _ = make([]byte, 1024)
 }
}
```

### 自定义指标

```go
func BenchmarkCustomMetrics(b *testing.B) {
 var bytes int64

 for i := 0; i < b.N; i++ {
 data := Process()
 bytes += int64(len(data))
 }

 b.ReportMetric(float64(bytes)/float64(b.N), "B/op")
}
```

## 基准测试文件

### 分离基准测试

```go
// benchmark_test.go
package mypackage

func BenchmarkMyFunction(b *testing.B) {
 // ...
}

// 也可以构建测试文件
// benchmark_test.go 不包含普通测试
```

## 常见问题

### 1. 不稳定的基准测试

```go
// ✗ 不稳定 - 依赖外部资源
func BenchmarkUnstable(b *testing.B) {
 for i := 0; i < b.N; i++ {
 _, err := http.Get("http://example.com")
 if err != nil {
 b.Fatal(err)
 }
 }
}

// ✓ 稳定 - 使用本地模拟
func BenchmarkStable(b *testing.B) {
 server := httptest.NewServer(mockHandler)
 defer server.Close()

 client := server.Client()

 b.ResetTimer()
 for i := 0; i < b.N; i++ {
 resp, err := client.Get(server.URL)
 if err != nil {
 b.Fatal(err)
 }
 resp.Body.Close()
 }
}
```

### 2. 忘记重置计时器

```go
func BenchmarkSlowSetup(b *testing.B) {
 // 耗时设置
 data := generateData(10000000)  // 非常慢！

 // ✓ 重置计时器
 b.ResetTimer()

 for i := 0; i < b.N; i++ {
 Process(data)
 }
}
```

### 3. 不处理错误

```go
// ✓ 在基准测试中处理错误
func BenchmarkWithCheck(b *testing.B) {
 for i := 0; i < b.N; i++ {
 result, err := Process()
 if err != nil {
 b.Fatal(err)  // 或者 b.Skip()
 }
 _ = result
 }
}
```

<!--
Source references:
- https://go.dev/doc/effective_go#benchmarks
- https://go.dev/pkg/testing/#pkg-overview
- https://dave.cheney.net/2013/06/30/how-to-write-benchmarks-in-go
-->
