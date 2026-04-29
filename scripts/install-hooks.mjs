import { execFileSync } from 'node:child_process'

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

try {
  runGit(['rev-parse', '--git-dir'])
} catch {
  process.exit(0)
}

const desiredHooksPath = '.githooks'

try {
  const currentHooksPath = runGit(['config', '--get', 'core.hooksPath'])
  if (currentHooksPath === desiredHooksPath) {
    process.exit(0)
  }
} catch {
  // core.hooksPath is not set yet.
}

execFileSync('git', ['config', 'core.hooksPath', desiredHooksPath], { stdio: 'inherit' })