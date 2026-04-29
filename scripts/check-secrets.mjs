import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const allowedExampleFiles = new Set([
  '.env.example',
  'backend/server/.env.example',
  'frontend/.env.example.free',
  'frontend/flamechat-mobile/.env.example',
])

const secretPatterns = [
  {
    name: 'Google API key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
  },
]

function getStagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
}

const violations = []

for (const file of getStagedFiles()) {
  if (allowedExampleFiles.has(file)) {
    continue
  }

  const absolutePath = path.join(repoRoot, file)
  if (!existsSync(absolutePath)) {
    continue
  }

  const contents = readFileSync(absolutePath, 'utf8')

  for (const { name, pattern } of secretPatterns) {
    const matches = contents.match(pattern)
    if (matches?.length) {
      violations.push({ file, name, matches: [...new Set(matches)] })
    }
  }
}

if (violations.length > 0) {
  console.error('\nPotential secrets detected in staged files:')
  for (const violation of violations) {
    console.error(`\n${violation.file} - ${violation.name}`)
    for (const match of violation.matches) {
      console.error(`  ${match}`)
    }
  }
  console.error('\nMove the secret to a local .env file or remove the hardcoded value before committing.')
  process.exit(1)
}

console.log('No staged secret patterns detected.')