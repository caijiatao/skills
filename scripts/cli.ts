#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Skills configuration
const skills = [
  'effective-go',
  'go-concurrency-patterns',
  'golang-code-review',
  'golang-testing',
]

async function installSkills(options: { global?: boolean, skill?: string }) {
  p.intro('Go Skills Installer')

  const { global, skill } = options

  // Determine skills to install
  const skillsToInstall = skill === '*' || !skill
    ? skills
    : [skill]

  // Validate skill names
  for (const skillName of skillsToInstall) {
    if (!skills.includes(skillName)) {
      p.log.error(`Unknown skill: ${skillName}`)
      p.log.info(`Available skills: ${skills.join(', ')}`)
      p.cancel('Installation failed')
      process.exit(1)
    }
  }

  // Determine Claude Code skills directory
  let skillsDir: string
  if (global) {
    // Global installation
    const homeDir = process.env.HOME || process.env.USERPROFILE
    skillsDir = join(homeDir, '.claude', 'skills')
  } else {
    // Local installation (current project)
    skillsDir = join(process.cwd(), '.claude', 'skills')
  }

  // Ensure directory exists
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true })
  }

  const spinner = p.spinner()

  // Copy skills
  for (const skillName of skillsToInstall) {
    spinner.start(`Installing skill: ${skillName}`)

    try {
      const sourceDir = join(root, 'skills', skillName)
      const targetDir = join(skillsDir, skillName)

      // Remove existing if present
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true })
      }

      // Copy all files
      cpSync(sourceDir, targetDir, { recursive: true })

      spinner.stop(`✓ Installed: ${skillName}`)
    } catch (error) {
      spinner.stop(`✗ Failed to install ${skillName}: ${error}`)
      p.cancel('Installation failed')
      process.exit(1)
    }
  }

  p.log.success(`\nInstalled ${skillsToInstall.length} skill(s) to:`)
  p.log.message(`  ${skillsDir}`)

  if (global) {
    p.log.info('\nSkills installed globally. They will be available to all Claude Code projects.')
  } else {
    p.log.info('\nSkills installed locally. They will be available in the current project.')
  }

  p.outro('Done')
}

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let global = false
  let skill: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-g' || arg === '--global') {
      global = true
    } else if (arg === '--skill') {
      skill = args[++i]
    } else if (arg.startsWith('--skill=')) {
      skill = arg.split('=')[1]
    }
  }

  await installSkills({ global, skill })
}

main().catch(console.error)
