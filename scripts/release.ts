#!/usr/bin/env node
/**
 * Release script for vue-sherpa
 *
 * Usage:
 *   pnpm release         # Interactive - prompts for version type
 *   pnpm release:patch   # Bump patch version (0.0.1 -> 0.0.2)
 *   pnpm release:minor   # Bump minor version (0.0.1 -> 0.1.0)
 *   pnpm release:major   # Bump major version (0.0.1 -> 1.0.0)
 *
 * This script will:
 *   1. Run quality checks (typecheck, lint, test)
 *   2. Bump version in package.json
 *   3. Build the package
 *   4. Publish to npm
 *   5. Create git tag and push
 *   6. Sync to standalone repo (if running from monorepo)
 *   7. Create GitHub release
 *
 * Works both from:
 *   - Monorepo (packages/vue-sherpa) - syncs via git subtree
 *   - Standalone repo - direct push
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = join(__dirname, '..', 'package.json')

// Detect if running from monorepo or standalone
const monorepoRoot = join(__dirname, '..', '..', '..')
const isMonorepo = existsSync(join(monorepoRoot, 'pnpm-workspace.yaml'))

function exec(cmd, options = {}) {
  console.log(`\n$ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', cwd: join(__dirname, '..'), ...options })
}

function execInMonorepo(cmd) {
  console.log(`\n$ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', cwd: monorepoRoot })
}

function execSilent(cmd) {
  return execSync(cmd, { cwd: join(__dirname, '..'), encoding: 'utf-8' }).trim()
}

function readPackage() {
  return JSON.parse(readFileSync(packagePath, 'utf-8'))
}

function writePackage(pkg) {
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const pkg = readPackage()
  const currentVersion = pkg.version

  console.log(`\n📦 vue-sherpa release script`)
  console.log(`   Current version: ${currentVersion}`)

  // Determine version bump type
  let bumpType = process.argv[2]

  if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
    console.log(`\n   Select version bump:`)
    console.log(`   1) patch (${bumpVersion(currentVersion, 'patch')})`)
    console.log(`   2) minor (${bumpVersion(currentVersion, 'minor')})`)
    console.log(`   3) major (${bumpVersion(currentVersion, 'major')})`)

    const choice = await prompt('\n   Enter choice (1/2/3): ')
    bumpType = { '1': 'patch', '2': 'minor', '3': 'major' }[choice]

    if (!bumpType) {
      console.error('Invalid choice. Aborting.')
      process.exit(1)
    }
  }

  const newVersion = bumpVersion(currentVersion, bumpType)
  const tag = `v${newVersion}`

  console.log(`\n   New version: ${newVersion} (${bumpType})`)

  const confirm = await prompt(`\n   Proceed with release? (y/N): `)
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.')
    process.exit(0)
  }

  try {
    // Step 1: Quality checks
    console.log('\n🔍 Step 1/6: Running quality checks...')
    exec('pnpm run quality')

    // Step 2: Bump version
    console.log('\n📝 Step 2/6: Bumping version...')
    pkg.version = newVersion
    writePackage(pkg)
    console.log(`   Updated package.json to ${newVersion}`)

    // Step 3: Build
    console.log('\n🔨 Step 3/6: Building...')
    exec('pnpm run build')

    // Step 4: Publish to npm
    console.log('\n📤 Step 4/6: Publishing to npm...')
    exec('npm publish')

    // Step 5: Git commit and push
    console.log('\n🏷️  Step 5/7: Committing changes...')

    if (isMonorepo) {
      // Monorepo: commit in monorepo, then sync to standalone
      console.log('   (Detected monorepo environment)')
      execInMonorepo(`git add packages/vue-sherpa/package.json`)
      execInMonorepo(`git commit -m "chore(vue-sherpa): release ${tag}"`)
      execInMonorepo(`git push origin HEAD`)

      // Step 6: Sync to standalone repo
      console.log('\n📤 Step 6/7: Syncing to standalone repo...')
      execInMonorepo(`pnpm run publish:vue-sherpa`)
    } else {
      // Standalone: direct commit and push
      exec(`git add package.json`)
      exec(`git commit -m "chore(release): ${tag}"`)
      exec(`git push origin HEAD`)
    }

    // Create tag in standalone repo
    console.log('\n🏷️  Creating git tag in standalone repo...')
    exec(`git tag -a ${tag} -m "Release ${tag}"`, { cwd: isMonorepo ? undefined : join(__dirname, '..') })

    // For monorepo, we need to push the tag to the standalone repo
    if (isMonorepo) {
      // The tag needs to be created in the standalone repo after subtree push
      // We'll create it via GitHub release instead
      console.log('   Tag will be created via GitHub release')
    } else {
      exec(`git push origin ${tag}`)
    }

    // Step 7: GitHub release
    console.log('\n🚀 Step 7/7: Creating GitHub release...')
    const releaseNotes = `## ${tag}

See [CHANGELOG](https://github.com/MatthiasRossbach/vue-sherpa/blob/main/CHANGELOG.md) for details.

### Installation
\`\`\`bash
npm install vue-sherpa@${newVersion}
\`\`\`

### Links
- [npm](https://www.npmjs.com/package/vue-sherpa/v/${newVersion})
- [Documentation](https://matthiasrossbach.github.io/vue-sherpa/)
`

    // Create GitHub release (this also creates the tag if it doesn't exist)
    exec(`gh release create ${tag} --repo MatthiasRossbach/vue-sherpa --title "${tag}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`)

    console.log(`\n✅ Successfully released ${tag}!`)
    console.log(`\n   GitHub Pages will auto-deploy if docs/ changed.`)
    console.log(`   npm: https://www.npmjs.com/package/vue-sherpa/v/${newVersion}`)
    console.log(`   GitHub: https://github.com/MatthiasRossbach/vue-sherpa/releases/tag/${tag}`)

  } catch (error) {
    console.error('\n❌ Release failed:', error.message)
    console.log('\n   You may need to manually clean up:')
    console.log(`   - Revert package.json version to ${currentVersion}`)
    console.log(`   - Delete tag: git tag -d ${tag}`)
    process.exit(1)
  }
}

main()
