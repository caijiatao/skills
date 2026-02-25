# Go Skills 技能集合

一个精心策划的 Go 开发技能集合，专为 Claude Code 智能体设计，灵感来自 [antfu/skills](https://github.com/antfu/skills)。

## 概述

本仓库提供了 Go 开发的专门技能，可与 Claude Code 配合使用，以提高代码质量、遵循最佳实践并加速开发工作流。

## 技能列表

| 技能 | 描述 | 语言 | 分类 |
|------|------|------|------|
| [effective-go](./effective-go/) | 应用 Go 最佳实践、惯用模式和约定 | en | core |
| [go-concurrency-patterns](./go-concurrency-patterns/) | 掌握 Go 并发：goroutines、channels、同步原语和 context | en | concurrency |
| [golang-code-review](./golang-code-review/) | 基于《Golang 工匠》的 Go 代码综合审查器 | zh | review |
| [golang-testing](./golang-testing/) | Go 测试模式和最佳实践 | zh | testing |

## 安装

### 安装所有技能（本地）

```bash
pnpx skills add caijiatao/skills --skill='*'
```

### 安装所有技能（全局）

```bash
pnpx skills add caijiatao/skills --skill='*' -g
```

### 安装单个技能

```bash
# 本地安装
pnpx skills add caijiatao/skills --skill=effective-go

# 全局安装
pnpx skills add caijiatao/skills --skill=effective-go -g
```

### 可用技能名称

- `effective-go`
- `go-concurrency-patterns`
- `golang-code-review`
- `golang-testing`

## 使用方式

Claude Code 智能体在处理 Go 代码时会自动使用这些技能。每个技能包含：

- **SKILL.md**：主技能入口，包含核心概念和快速参考
- **references/**：详细主题文件，提供深入解释和示例
- **GENERATION.md**：关于技能来源和版本的元数据

## 技能详解

### Effective Go

应用来自官方 [Effective Go 指南](https://go.dev/doc/effective_go) 的最佳实践：

- 使用 gofmt 格式化
- 命名约定（MixedCaps，导出 vs 非导出）
- 错误处理模式
- 接口设计原则
- 并发基础
- 文档标准

### Go Concurrency Patterns

Go 并发的生产就绪模式：

- Goroutine 生命周期管理
- Channel 模式（缓冲、非缓冲、select）
- Worker 池和管道
- Context 用于取消和截止时间
- 优雅关闭模式
- 使用 errgroup 的错误组
- 竞态检测和预防

### Golang Code Review

基于 "Golang 工匠" 的综合代码审查：

- 包、变量和函数命名
- 结构体设计和字段顺序
- 函数职责分析
- 接口设计原则
- 错误处理模式

### Golang Testing

遵循 TDD 方法论的完整测试模式：

- RED-GREEN-REFACTOR 循环
- 表格驱动测试
- 子测试和并行测试
- 使用接口进行 Mock
- 基准测试和性能测试
- 模糊测试进行输入验证
- 测试覆盖率分析

## 开发

### 验证技能结构

```bash
# 验证所有技能
pnpm run validate

# 检查链接
pnpm run check:links
```

## 贡献指南

查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解添加新技能或更新现有技能的指南。

## 许可证

MIT License - 详见 [LICENSE.md](LICENSE.md)。

## 致谢

- 灵感来自 [antfu/skills](https://github.com/antfu/skills)
- 基于官方 [Go 文档](https://go.dev/doc/)
- golang-code-review 和 golang-testing 基于 "Golang 工匠" 系列
