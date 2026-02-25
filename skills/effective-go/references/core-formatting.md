---
name: core-formatting
description: Go formatting conventions with gofmt
---

# Core: Formatting

## The Golden Rule

**Always use `gofmt`** - This is non-negotiable in Go.

## Running gofmt

```bash
# Format all Go files in current directory
gofmt -w .

# Format entire project
gofmt -w ./...

# Print differences without formatting
gofmt -d .

# Format and simplify code
gofmt -s -w .
```

## Key Rules

### 1. Indentation

Use **tabs**, not spaces. Go defaults to tabs for indentation.

```go
// ✓ Correct - tabs for indentation
func foo() {
	if x {
		doSomething()
	}
}
```

### 2. Line Length

Go has no hard line length limit, but keep lines reasonably short.

```go
// ✓ Good - readable
result := someFunction(param1, param2, param3)

// Also acceptable - longer lines when necessary
result := someVeryLongFunctionName(parameterOne, parameterTwo, parameterThree, parameterFour)
```

### 3. Automatic Semicolons

Go inserts semicolons automatically during parsing. This affects formatting:

```go
// ✓ Correct
if x {
	foo()
}

// ✗ Wrong - semicolon creates parsing issue
if x;
{
	foo()
}
```

### 4. Opening Brace

Opening braces go on the same line:

```go
// ✓ Correct
func foo() {
	for i := 0; i < 10; i++ {
		if x {
			doSomething()
		}
	}
}

// ✗ Wrong
func foo()
{
	for i := 0; i < 10; i++
	{
		if x
		{
			doSomething()
		}
	}
}
```

## Editor Integration

Most editors have gofmt integration:

- **VS Code**: Go extension auto-formats on save
- **Vim/Neovim**: `:Format` or auto-format with plugins
- **GoLand**: Auto-format on save
- **Emacs**: gofmt-mode

## Import Organization

```go
// Standard library
import (
	"fmt"
	"os"
)

// Third-party (blank line separates)
import (
	"github.com/gin-gonic/gin"
)

// Local packages (blank line separates)
import (
	"myproject/internal/handler"
)
```

Use `goimports` which organizes imports and runs `gofmt`:

```bash
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .
```

## Common Patterns

### Struct Fields

```go
// ✓ Correct - grouped fields, aligned
type User struct {
	ID        int
	Name      string
	Email     string
	CreatedAt time.Time
	UpdatedAt time.Time
}
```

### Function Parameters

```go
// ✓ Correct - grouped types
func foo(x, y, z int) int {
	return x + y + z
}

// Also correct
func bar(a int, b int, c int) int {
	return a + b + c
}
```

### Composite Literals

```go
// ✓ Correct - multi-line with trailing comma
result := []int{
	1,
	2,
	3,
}

// ✓ Correct - single line
result := []int{1, 2, 3}
```

<!--
Source references:
- https://go.dev/doc/effective_go#formatting
- https://go.dev/blog/gofmt
-->
