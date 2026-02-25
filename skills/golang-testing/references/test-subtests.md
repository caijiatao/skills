---
name: test-subtests
description: 子测试与并行测试
---

# 子测试与并行测试

## 子测试（Subtests）

### 组织相关测试

```go
func TestUser(t *testing.T) {
 // 所有子测试共享的设置
 db := setupTestDB(t)
 defer db.Close()

 t.Run("Create", func(t *testing.T) {
 user := &User{Name: "Alice"}
 err := db.CreateUser(user)
 if err != nil {
 t.Fatalf("CreateUser failed: %v", err)
 }
 if user.ID == "" {
 t.Error("expected user ID to be set")
 }
 })

 t.Run("Get", func(t *testing.T) {
 user, err := db.GetUser("alice-id")
 if err != nil {
 t.Fatalf("GetUser failed: %v", err)
 }
 if user.Name != "Alice" {
 t.Errorf("got name %q; want %q", user.Name, "Alice")
 }
 })

 t.Run("Update", func(t *testing.T) {
 // ...
 })

 t.Run("Delete", func(t *testing.T) {
 // ...
 })
}
```

### 子测试的好处

1. **共享设置** - 父测试的设置对子测试可见
2. **独立运行** - 可以运行特定的子测试
3. **清晰输出** - 失败时显示子测试名称
4. **层次结构** - 可以嵌套子测试

### 运行特定子测试

```bash
# 运行所有测试
go test

# 运行特定测试的所有子测试
go test -run TestUser

# 运行特定子测试
go test -run TestUser/Create
go test -run TestUser/Get

# 运行匹配模式
go test -run TestUser/.*
```

## 并行子测试

### 基本并行测试

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
 tt := tt // 捕获循环变量
 t.Run(tt.name, func(t *testing.T) {
 t.Parallel() // 标记为并行
 result := Process(tt.input)
 // 断言...
 _ = result
 })
 }
}
```

### 并行测试共享设置

```go
func TestWithSharedSetup(t *testing.T) {
 // 先设置（非并行）
 db := setupTestDB(t)
 defer db.Close()

 // 然后并行运行子测试
 tests := []struct {
 name string
 id   string
 }{
 {"user1", "id1"},
 {"user2", "id2"},
 {"user3", "id3"},
 }

 for _, tt := range tests {
 tt := tt
 t.Run(tt.name, func(t *testing.T) {
 t.Parallel()
 user, err := db.GetUser(tt.id)
 if err != nil {
 t.Errorf("GetUser failed: %v", err)
 }
 _ = user
 })
 }
}
```

### 并行测试注意事项

1. **不要修改共享状态** - 每个子测试应该独立
2. **捕获循环变量** - 使用 `tt := tt`
3. **先设置后并行** - 设置代码不应该并行

```go
// ✗ 错误 - 修改共享状态
func TestParallelWrong(t *testing.T) {
 counter := 0

 for i := 0; i < 10; i++ {
 t.Run(fmt.Sprintf("test%d", i), func(t *testing.T) {
 t.Parallel()
 counter++  // 数据竞争！
 })
 }
}

// ✓ 正确 - 不共享可变状态
func TestParallelCorrect(t *testing.T) {
 for i := 0; i < 10; i++ {
 i := i  // 捕获变量
 t.Run(fmt.Sprintf("test%d", i), func(t *testing.T) {
 t.Parallel()
 // 使用 i，不修改共享状态
 _ = i
 })
 }
}
```

## 测试辅助函数

### t.Helper() 标记

```go
func setupTestDB(t *testing.T) *sql.DB {
 t.Helper() // 标记为辅助函数

 db, err := sql.Open("sqlite3", ":memory:")
 if err != nil {
 t.Fatalf("failed to open database: %v", err)
 }

 // 测试结束时清理
 t.Cleanup(func() {
 db.Close()
 })

 // 执行 migrations
 if _, err := db.Exec(schema); err != nil {
 t.Fatalf("failed to create schema: %v", err)
 }

 return db
}

func assertEqual[T comparable](t *testing.T, got, want T) {
 t.Helper() // 标记为辅助函数
 if got != want {
 t.Errorf("got %v; want %v", got, want)
 }
}

// 使用
func TestUser(t *testing.T) {
 db := setupTestDB(t)  // 失败会报告在 TestUser 行

 user := GetUser(db, 1)
 assertEqual(t, user.Name, "Alice")  // 失败会报告在这一行
}
```

### t.Cleanup() 清理资源

```go
func TestFileProcessing(t *testing.T) {
 // 创建临时目录
 tmpDir := t.TempDir()  // 自动清理

 // 或者手动清理
 tmpDir, err := os.MkdirTemp("", "test")
 if err != nil {
 t.Fatal(err)
 }
 t.Cleanup(func() {
 os.RemoveAll(tmpDir)
 })

 // 使用临时目录
 testFile := filepath.Join(tmpDir, "test.txt")
 err := os.WriteFile(testFile, []byte("test content"), 0644)
 if err != nil {
 t.Fatal(err)
 }

 // 测试完成后，tmpDir 会被自动删除
}
```

## 临时文件和目录

### t.TempDir()

```go
func TestFileProcessing(t *testing.T) {
 tmpDir := t.TempDir()  // 测试结束后自动删除

 testFile := filepath.Join(tmpDir, "test.txt")
 err := os.WriteFile(testFile, []byte("test content"), 0644)
 if err != nil {
 t.Fatal(err)
 }

 // 处理文件...
}
```

### t.TempFile()

```go
func TestWithTempFile(t *testing.T) {
 tmpFile, err := os.CreateTemp("", "test*.txt")
 if err != nil {
 t.Fatal(err)
 }
 defer tmpFile.Close()

 // 写入测试数据
 _, err = tmpFile.WriteString("test content")
 if err != nil {
 t.Fatal(err)
 }

 // 测试完成后，文件会被自动删除
}
```

## 嵌套子测试

### 多层嵌套

```go
func TestNested(t *testing.T) {
 t.Run("Group1", func(t *testing.T) {
 t.Run("Case1", func(t *testing.T) {
 // Test/Group1/Case1
 })
 t.Run("Case2", func(t *testing.T) {
 // Test/Group1/Case2
 })
 })

 t.Run("Group2", func(t *testing.T) {
 t.Run("Case1", func(t *testing.T) {
 // Test/Group2/Case1
 })
 t.Run("Case2", func(t *testing.T) {
 // Test/Group2/Case2
 })
 })
}
```

### 运行嵌套子测试

```bash
# 运行所有
go test

# 运行特定组
go test -run TestNested/Group1

# 运行特定案例
go test -run TestNested/Group1/Case1
```

## 跳过子测试

### t.Skip()

```go
func TestSkippable(t *testing.T) {
 if testing.Short() {
 t.Skip("skipping in short mode")
 }

 // 长时间的测试...
}

func TestConditional(t *testing.T) {
 t.Run("expensive", func(t *testing.T) {
 if os.Getenv("RUN_EXPENSIVE_TESTS") == "" {
 t.Skip("set RUN_EXPENSIVE_TESTS to run")
 }
 // 昂贵的测试...
 })
}
```

## 最佳实践

### 1. 使用 t.Helper()

```go
// ✓ 正确 - 标记辅助函数
func assertEqual(t *testing.T, got, want int) {
 t.Helper()
 if got != want {
 t.Errorf("got %d; want %d", got, want)
 }
}
```

### 2. 捕获循环变量

```go
// ✓ 正确 - 捕获循环变量
for _, tt := range tests {
 tt := tt
 t.Run(tt.name, func(t *testing.T) {
 // 使用 tt
 })
}
```

### 3. 使用 t.Cleanup() 而不是 defer

```go
// ✓ 正确 - 使用 Cleanup
func TestWithCleanup(t *testing.T) {
 db := setupDB(t)
 t.Cleanup(func() {
 db.Close()
 })
 // 测试代码...
}

// 也正确 - 使用 defer
func TestWithDefer(t *testing.T) {
 db := setupDB(t)
 defer db.Close()
 // 测试代码...
}
```

### 4. 并行测试要独立

```go
// ✓ 正确 - 并行测试独立
for _, tt := range tests {
 tt := tt
 t.Run(tt.name, func(t *testing.T) {
 t.Parallel()
 // 不依赖其他测试
 })
}
```

<!--
Source references:
- https://go.dev/doc/tutorial/add-a-test
- https://go.dev/pkg/testing/#T.Run
- https://go.dev/blog/subtests
-->
