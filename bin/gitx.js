#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const sourceEntry = resolve(root, 'src/index.ts')
const builtEntry = resolve(root, 'dist/index.js')

const sourceArgs = (() => {
  const tsxLoader = resolve(root, 'node_modules', 'tsx', 'dist', 'loader.mjs')
  if (!existsSync(sourceEntry) || !existsSync(tsxLoader)) {
    return null
  }

  return ['--import', tsxLoader, sourceEntry, ...process.argv.slice(2)]
})()

const entryArgs = sourceArgs ?? [builtEntry, ...process.argv.slice(2)]

if (!sourceArgs && !existsSync(builtEntry)) {
  process.stderr.write(
    'gitx: no runnable entrypoint found. Build the package or install dependencies for dev mode.\n',
  )
  process.exit(1)
}

const result = spawnSync(process.execPath, entryArgs, {
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
