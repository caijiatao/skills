// Go skills 元数据配置
export interface GoSkillMeta {
  name: string
  description: string
  category: 'core' | 'testing' | 'concurrency' | 'review'
  language: 'en' | 'zh'
  source?: string
  tags: string[]
}

export const skills: GoSkillMeta[] = [
  {
    name: 'effective-go',
    description: 'Apply Go best practices, idioms, and conventions',
    category: 'core',
    language: 'en',
    source: 'https://go.dev/doc/effective_go',
    tags: ['best-practices', 'idioms', 'conventions'],
  },
  {
    name: 'go-concurrency-patterns',
    description: 'Master Go concurrency with goroutines, channels, sync primitives, and context',
    category: 'concurrency',
    language: 'en',
    source: 'https://go.dev/doc/effective_go#concurrency',
    tags: ['goroutines', 'channels', 'context', 'worker-pool'],
  },
  {
    name: 'golang-code-review',
    description: '基于《Golang 工匠》的 Go 代码综合审查器',
    category: 'review',
    language: 'zh',
    source: 'https://github.com/xxjwxc/uber_go_guide_cn',
    tags: ['code-review', '命名', '结构体', '函数', '接口'],
  },
  {
    name: 'golang-testing',
    description: 'Go 测试模式和最佳实践',
    category: 'testing',
    language: 'zh',
    source: 'https://go.dev/doc/tutorial/add-a-test',
    tags: ['testing', 'tdd', 'benchmarks', 'fuzzing'],
  },
]

export const skillsByCategory = {
  core: skills.filter(s => s.category === 'core'),
  testing: skills.filter(s => s.category === 'testing'),
  concurrency: skills.filter(s => s.category === 'concurrency'),
  review: skills.filter(s => s.category === 'review'),
}

export const skillsByLanguage = {
  en: skills.filter(s => s.language === 'en'),
  zh: skills.filter(s => s.language === 'zh'),
}
