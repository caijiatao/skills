# Contributing to Go Skills

Thank you for your interest in contributing to the Go Skills collection! This document provides guidelines for contributing.

## How to Add a New Skill

### 1. Create the Skill Directory

```bash
mkdir your-skill-name
```

### 2. Create SKILL.md

Each skill must have a `SKILL.md` file (note the capitalization) with proper frontmatter:

```yaml
---
name: your-skill-name
description: "Clear description of when to use this skill"
metadata:
  author: your-name
  version: "2026.2.24"
  source: https://source-url
  language: en  # or zh
  tags: [tag1, tag2, tag3]
  category: core  # core, testing, concurrency, or review
---
```

### 3. Create references/ Directory

Detailed content should be organized in the `references/` subdirectory:

```bash
mkdir your-skill-name/references
```

#### Reference File Guidelines

- Use descriptive filenames: `core-formatting.md`, `patterns-worker-pool.md`, etc.
- Each file should have optional YAML frontmatter:
  ```yaml
  ---
  name: core-formatting
  description: Go formatting conventions with gofmt
  ---
  ```
- Include source references at the end:
  ```html
  <!--
  Source references:
  - https://go.dev/doc/effective_go#formatting
  -->
  ```

### 4. Create GENERATION.md

Track the origin of your skill:

```markdown
# Generation Info

- **Source:** Hand-crafted / URL / Book Title
- **Author:** your-name
- **Created:** 2026-02-24
- **Last Updated:** 2026-02-24
- **Version:** 1.0.0
```

### 5. Create instructions/ File

Add an instruction file in `instructions/your-skill-name.md`:

```markdown
# Your Skill Name - Skill Instructions

## Focused Area
Brief description of what this skill covers.

## Content Strategy
What topics are included.

## Language Choice
Why English or Chinese was chosen.

## Update Guidelines
How to keep this skill updated.

## Source Material
Primary and secondary sources.
```

### 6. Update meta.ts

Add your skill to `meta.ts`:

```typescript
export const skills: GoSkillMeta[] = [
  // ... existing skills
  {
    name: 'your-skill-name',
    description: 'Your skill description',
    category: 'core',  // or 'testing', 'concurrency', 'review'
    language: 'en',    // or 'zh'
    source: 'https://your-source',
    tags: ['tag1', 'tag2'],
  },
]
```

### 7. Validate Your Changes

```bash
# Install dependencies
npm install

# Run validation
npm run validate

# Check links
npm run check:links
```

## File Naming Conventions

### Skill Directories

- Use lowercase with hyphens: `go-concurrency-patterns`
- Avoid underscores: `go_concurrency_patterns` (incorrect)

### Reference Files

- Use lowercase with hyphens
- Prefix with category for clarity:
  - `core-*` for core concepts
  - `patterns-*` for design patterns
  - `review-*` for code review topics
  - `test-*` for testing topics

Examples:
- `core-formatting.md`
- `patterns-worker-pool.md`
- `review-naming.md`
- `test-tdd.md`

## Content Guidelines

### SKILL.md Format

- Keep it concise - an index with links to references
- Include a table of core concepts
- Provide quick reference code snippets
- Link to official documentation

### Reference File Format

- Provide in-depth explanations
- Include complete, working examples
- Cover common pitfalls
- Add best practices section

### Language Choice

- **English**: For technical content targeting international developers
- **Chinese (zh)**: For content originally in Chinese or for Chinese-speaking developers

### Code Examples

- All Go code should be idiomatic
- Use `gofmt` formatting
- Include comments explaining non-obvious code
- Test examples before committing

## Code Style

### Markdown

- Use ATX-style headings (`#`, `##`, `###`)
- Include blank line before headings
- Use proper list formatting
- Escape special characters in code blocks

### YAML Frontmatter

- Use double quotes for string values
- Use lists for array values
- Include all required fields

### Go Code

```go
// ✓ Correct - idiomatic Go
func Add(a, b int) int {
    return a + b
}

// ✗ Wrong - not idiomatic
func add(a int, b int) int {  // Should be exported or comment why unexported
    return a + b;
}
```

## Testing Your Changes

1. **Local Validation**
   ```bash
   npm run validate
   ```

2. **Manual Testing**
   - View SKILL.md in a markdown preview
   - Verify all links work
   - Check code examples compile (if Go)

3. **Git Status**
   ```bash
   git status
   git diff
   ```

## Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New skill or reference file
- `fix`: Bug fix or correction
- `docs`: Documentation changes
- `style`: Formatting changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

### Examples

```
feat(go-concurrency): add errgroup pattern reference

docs: update README with new skill table

fix(effective-go): correct naming example

style: run gofmt on all Go examples
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-skill`
3. Make your changes
4. Run validation: `npm run validate`
5. Commit your changes: `git commit -am 'feat: add new skill'`
6. Push to the branch: `git push origin feature/my-skill`
7. Create a Pull Request

## Questions?

Feel free to open an issue for questions or discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
