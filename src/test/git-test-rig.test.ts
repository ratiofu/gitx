import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitTestRig } from './git-test-rig.js'

describe('GitTestRig', () => {
  let rig: GitTestRig

  beforeEach(async () => {
    rig = await GitTestRig.create()
  })

  afterEach(async () => {
    await rig.cleanup()
  })

  it('should initialize a git repo', async () => {
    const { stdout } = await rig.git('rev-parse', '--is-inside-work-tree')
    expect(stdout.trim()).toBe('true')
  })

  it('should create commits', async () => {
    await rig.createCommit('test.txt', 'hello world')
    const { stdout } = await rig.git('log', '--oneline')
    expect(stdout).toContain('Add test.txt')
    expect(existsSync(join(rig.dir, 'test.txt'))).toBe(true)
  })

  it('should create branches', async () => {
    await rig.createBranch('feature')
    await rig.checkout('feature')
    const current = await rig.currentBranch()
    expect(current).toBe('feature')
  })

  it('should create branch from start point', async () => {
    await rig.createCommit('v1.txt', 'v1')
    const { stdout: sha } = await rig.git('rev-parse', 'HEAD')
    await rig.createCommit('v2.txt', 'v2')
    await rig.createBranch('from-v1', sha.trim())
    await rig.checkout('from-v1')
    expect(await rig.fileExists('v1.txt')).toBe(true)
    expect(await rig.fileExists('v2.txt')).toBe(false)
  })

  it('should handle file manipulations', async () => {
    await rig.writeFile('folder/file.txt', 'hello')
    expect(await rig.fileExists('folder/file.txt')).toBe(true)
    expect(await rig.getFileContent('folder/file.txt')).toBe('hello')

    await rig.modifyFile('folder/file.txt', 'world')
    expect(await rig.getFileContent('folder/file.txt')).toBe('world')

    await rig.stageFile('folder/file.txt')
    const { stdout } = await rig.git('status', '--porcelain')
    expect(stdout).toMatch(/^A /) // Staged

    await rig.deleteFile('folder/file.txt')
    expect(await rig.fileExists('folder/file.txt')).toBe(false)
  })

  it('should return false for non-existent files', async () => {
    expect(await rig.fileExists('non-existent.txt')).toBe(false)
  })
})
