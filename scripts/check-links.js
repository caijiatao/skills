#!/usr/bin/env node

/**
 * Check markdown links in SKILL.md files
 *
 * Checks:
 * - Links to references/ files are valid
 * - External links are accessible (optional)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const skillsDir = path.join(__dirname, '..')

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

function success(msg) {
  console.log(`✅ ${msg}`)
}

function extractLinks(markdown) {
  // Match [text](url) pattern
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const links = []
  let match

  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    })
  }

  return links
}

function validateReferenceLink(skillName, link, refsDir) {
  // Check if it's a relative link to references/
  if (link.url.startsWith('references/')) {
    const refPath = path.join(refsDir, link.url.replace('references/', ''))

    if (!fs.existsSync(refPath)) {
      error(`${skillName}: Reference file not found: ${link.url}`)
      return false
    }

    success(`${skillName}: ${link.url} exists`)
    return true
  }

  return null
}

function validateSkill(skillName) {
  console.log(`\nChecking links in: ${skillName}`)
  const skillPath = path.join(skillsDir, skillName)
  const skillMd = path.join(skillPath, 'SKILL.md')
  const refsDir = path.join(skillPath, 'references')

  if (!fs.existsSync(skillMd)) {
    error(`${skillName}: SKILL.md not found`)
    return
  }

  const content = fs.readFileSync(skillMd, 'utf-8')
  const links = extractLinks(content)

  console.log(`  Found ${links.length} links`)

  let validCount = 0
  let refCount = 0

  for (const link of links) {
    const result = validateReferenceLink(skillName, link, refsDir)
    if (result === true) {
      validCount++
      refCount++
    } else if (result === false) {
      // Error already logged
    } else {
      // External link - could check accessibility
      // For now just skip
    }
  }

  console.log(`  ✅ ${validCount}/${refCount} reference links valid`)
}

function main() {
  console.log('🔗 Checking markdown links...\n')

  for (const skillName of skillNames) {
    validateSkill(skillName)
  }

  console.log('\n' + '='.repeat(50))

  if (hasErrors) {
    console.error('\n❌ Link check failed!\n')
    process.exit(1)
  } else {
    console.log('\n✅ All links valid!\n')
    process.exit(0)
  }
}

main()
