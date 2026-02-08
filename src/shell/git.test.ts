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

  describe('worktree operations', () => {
    it('adds and removes a worktree', async () => {
      await rig.createCommit('file.txt', 'content')
      await rig.createBranch('wt-branch')

      const wtDir = await mkdtemp(join(tmpdir(), 'gitx-wt-test-'))
      await rm(wtDir, { recursive: true, force: true })

      await git.addWorktree(wtDir, 'wt-branch', rig.dir)

      const branch = await git.getCurrentBranch(wtDir)
      expect(branch).toBe('wt-branch')

      await git.removeWorktree(wtDir, rig.dir)
    })

    it('removes files and commits in a worktree', async () => {
      await rig.createCommit('a.txt', 'content-a')
      await rig.createCommit('b.txt', 'content-b')
      await rig.createBranch('del-branch')

      const wtDir = await mkdtemp(join(tmpdir(), 'gitx-wt-test-'))
      await rm(wtDir, { recursive: true, force: true })

      await git.addWorktree(wtDir, 'del-branch', rig.dir)
      await git.removeFiles(['a.txt'], wtDir)
      await git.commit('Remove a.txt', wtDir)

      // Verify the file is gone on del-branch
      await git.removeWorktree(wtDir, rig.dir)
      await rig.checkout('del-branch')
      expect(await rig.fileExists('a.txt')).toBe(false)
      expect(await rig.fileExists('b.txt')).toBe(true)
    })
  })
})
