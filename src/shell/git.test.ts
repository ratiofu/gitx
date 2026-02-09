import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitTestRig } from '../test/git-test-rig.js'
import * as git from './git.js'

describe('git shell wrappers', () => {
  let rig: GitTestRig

  beforeEach(async () => {
    rig = await GitTestRig.create()
  })

  afterEach(async () => {
    await rig.cleanup()
  })

  it('detects git installation and worktree', async () => {
    await expect(git.checkGitInstallation(rig.dir)).resolves.not.toThrow()
  })

  it('throws if not in a git repo', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gitx-test-no-git-'))
    try {
      await expect(git.checkGitInstallation(dir)).rejects.toThrow(
        'Git is not installed or not in a git repository',
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('throws if inside .git directory', async () => {
    const gitDir = join(rig.dir, '.git')
    await expect(git.checkGitInstallation(gitDir)).rejects.toThrow(
      'Git is not installed or not in a git repository',
    )
  })

  it('gets current branch', async () => {
    const branch = await git.getCurrentBranch(rig.dir)
    expect(branch).toBe('main')
  })

  it('checkouts an existing branch', async () => {
    await rig.createBranch('other')
    await git.checkout('other', rig.dir)
    const current = await git.getCurrentBranch(rig.dir)
    expect(current).toBe('other')
  })

  it('parses branch list', async () => {
    await rig.createBranch('feature')
    await rig.checkout('feature')

    const branches = await git.getBranchList(rig.dir)
    expect(branches).toHaveLength(2)

    const feature = branches.find((b) => b.name === 'feature')
    const main = branches.find((b) => b.name === 'main')

    expect(feature).toBeDefined()
    expect(feature?.isCurrent).toBe(true)
    expect(main).toBeDefined()
    expect(main?.isCurrent).toBe(false)
  })

  it('gets diff between branches', async () => {
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature')
    await rig.createCommit('feature-file.txt', 'new')

    const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)
    expect(diff).toContainEqual({
      path: 'feature-file.txt',
      status: 'A',
    })
  })
})
