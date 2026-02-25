#!/usr/bin/env node

/**
 * Validate Go skills structure
 *
 * Checks:
 * - All skills have SKILL.md (not skill.md)
 * - All SKILL.md have required frontmatter fields
 * - All skills have references/ directory
 * - All skills have GENERATION.md
 * - YAML format is valid
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const skillsDir = path.join(__dirname, '..')

// Required frontmatter fields
const requiredFields = ['name', 'description']
const optionalFields = ['metadata', 'author', 'version', 'source', 'language', 'tags', 'category']

// Skills to validate
const skillNames = [
  'effective-go',
  'go-concurrency-patterns',
  'golang-code-review',
  'golang-testing',
]

let hasErrors = false

function error(msg) {
  console.error(`❌ ${msg}`)
  hasErrors = true
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`)
}

function success(msg) {
  console.log(`✅ ${msg}`)
}

function parseFrontmatter(content) {
  // Handle both LF (\n) and CRLF (\r\n) line endings
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/)
  if (!match) return null

  try {
    return yaml.parse(match[1])
  } catch (e) {
    error(`Invalid YAML frontmatter: ${e.message}`)
    return null
  }
}

function validateSkill(skillName) {
  console.log(`\nValidating skill: ${skillName}`)
  const skillPath = path.join(skillsDir, skillName)

  // Check skill directory exists
  if (!fs.existsSync(skillPath)) {
    error(`Skill directory missing: ${skillPath}`)
    return
  }
  success(`Directory exists: ${skillPath}`)

  // Check for SKILL.md (not skill.md)
  const skillMd = path.join(skillPath, 'SKILL.md')

  // Check actual filename (case-sensitive) to handle Windows case-insensitive filesystem
  const files = fs.readdirSync(skillPath)
  const hasSkillMdLower = files.includes('skill.md')
  const hasSkillMdUpper = files.includes('SKILL.md')

  if (hasSkillMdLower && !hasSkillMdUpper) {
    error(`Found skill.md instead of SKILL.md in ${skillName}`)
    return
  }

  if (hasSkillMdLower && hasSkillMdUpper) {
    warn(`Both skill.md and SKILL.md exist in ${skillName} (should only have SKILL.md)`)
  }

  if (!hasSkillMdUpper) {
    error(`Missing SKILL.md in ${skillName}`)
    return
  }
  success(`SKILL.md exists (not skill.md)`)

  // Read and validate frontmatter
  const content = fs.readFileSync(skillMd, 'utf-8')
  const frontmatter = parseFrontmatter(content)

  if (!frontmatter) {
    error(`Missing or invalid frontmatter in ${skillName}/SKILL.md`)
    return
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      error(`Missing required frontmatter field: ${field}`)
    } else {
      success(`Frontmatter has ${field}`)
    }
  }

  // Check metadata field
  if (frontmatter.metadata) {
    success(`Has metadata field`)
    if (frontmatter.metadata.author) success(`  - author: ${frontmatter.metadata.author}`)
    if (frontmatter.metadata.version) success(`  - version: ${frontmatter.metadata.version}`)
    if (frontmatter.metadata.language) success(`  - language: ${frontmatter.metadata.language}`)
    if (frontmatter.metadata.category) success(`  - category: ${frontmatter.metadata.category}`)
  } else {
    warn(`No metadata field in frontmatter`)
  }

  // Check references/ directory
  const refsDir = path.join(skillPath, 'references')
  if (!fs.existsSync(refsDir)) {
    error(`Missing references/ directory in ${skillName}`)
  } else {
    const files = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'))
    success(`references/ directory exists with ${files.length} files`)
    if (files.length === 0) {
      warn(`references/ directory is empty`)
    }
  }

  // Check GENERATION.md
  const genMd = path.join(skillPath, 'GENERATION.md')
  if (!fs.existsSync(genMd)) {
    error(`Missing GENERATION.md in ${skillName}`)
  } else {
    success(`GENERATION.md exists`)
  }
}

function main() {
  console.log('🔍 Validating Go skills structure...\n')

  for (const skillName of skillNames) {
    validateSkill(skillName)
  }

  console.log('\n' + '='.repeat(50))

  if (hasErrors) {
    console.error('\n❌ Validation failed!\n')
    process.exit(1)
  } else {
    console.log('\n✅ All validations passed!\n')
    process.exit(0)
  }
}

main()
