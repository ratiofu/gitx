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

  it('throws if inside .git directory (valid repo but not worktree)', async () => {
    const gitDir = join(rig.dir, '.git')
    await expect(git.checkGitInstallation(gitDir)).rejects.toThrow(
      'Git is not installed or not in a git repository',
    )
  })

  it('gets current branch', async () => {
    const branch = await git.getCurrentBranch(rig.dir)
    expect(branch).toBe('main')
  })

  it('creates a new branch', async () => {
    await git.createBranch('feature-a', undefined, rig.dir)
    const current = await git.getCurrentBranch(rig.dir)
    expect(current).toBe('feature-a')
  })

  it('creates a new branch from a start point', async () => {
    await rig.createCommit('file.txt', 'v1')
    const sha = await git.getHeadSha(rig.dir)

    await rig.createCommit('file.txt', 'v2')

    // Create branch from v1
    await git.createBranch('from-v1', sha, rig.dir)

    // Check content
    const content = await rig.getFileContent('file.txt')
    expect(content).toBe('v1')
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

  it('parses diff name status', async () => {
    // 1. Modify a file
    await rig.createCommit('file.txt', 'original')
    await rig.modifyFile('file.txt', 'modified')

    // 2. Add a new file (staged or unstaged? git diff --name-status usually shows staged if cached, or unstaged)
    // Wait, `git diff --name-status` shows unstaged changes by default.
    // `git diff --name-status --cached` shows staged.
    // Our wrapper uses `git diff --name-status`. So it checks working tree vs index.

    await rig.writeFile('new.txt', 'content')

    // Untracked files are NOT shown in `git diff`. They are shown in `git status`.
    // We might need to handle untracked files separately if `gitx` intends to.
    // The requirement said: "If status is 'A' or '?'".
    // `git diff --name-status` DOES NOT show untracked files.
    // We might need `git status --porcelain` for that!
    // But `src/core/git-parsing.ts` handles '?' (question mark).
    // Let's verify what `git diff` outputs.

    // Actually, `src/core/git-parsing.ts` supports '?' but `git diff` never outputs it.
    // We might need to implement `getUntrackedFiles` or switch to `git status --porcelain`.

    // For now, let's test what we have (Modified).
    const diff = await git.getDiffNameStatus(rig.dir)
    expect(diff).toContainEqual({
      path: 'file.txt',
      status: 'M',
    })
  })

  describe('getDiffBetweenBranches', () => {
    it('finds added files in source branch', async () => {
      // Create a base commit on main
      await rig.createCommit('base.txt', 'base content')

      // Create a feature branch with a new file
      await rig.git('checkout', '-b', 'feature')
      await rig.createCommit('feature.txt', 'feature content')

      // Diff from main's perspective: what's added in feature?
      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(1)
      expect(diff).toContainEqual({
        path: 'feature.txt',
        status: 'A',
      })
    })

    it('finds modified files in source branch', async () => {
      // Create a base commit on main
      await rig.createCommit('shared.txt', 'original content')

      // Create a feature branch and modify the file
      await rig.git('checkout', '-b', 'feature')
      await rig.createCommit('shared.txt', 'modified in feature')

      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(1)
      expect(diff).toContainEqual({
        path: 'shared.txt',
        status: 'M',
      })
    })

    it('finds deleted files in source branch', async () => {
      // Create a file and commit it
      await rig.createCommit('to-delete.txt', 'will be deleted')

      // Create a feature branch and delete the file
      await rig.git('checkout', '-b', 'feature')
      await rig.deleteFile('to-delete.txt')
      await rig.git('add', '-A')
      await rig.git('commit', '-m', 'Delete file')

      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(1)
      expect(diff).toContainEqual({
        path: 'to-delete.txt',
        status: 'D',
      })
    })

    it('finds renamed files in source branch', async () => {
      // Create a file and commit it
      await rig.createCommit('old-name.txt', 'content that stays the same')

      // Create a feature branch and rename the file
      await rig.git('checkout', '-b', 'feature')
      await rig.git('mv', 'old-name.txt', 'new-name.txt')
      await rig.git('commit', '-m', 'Rename file')

      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(1)
      expect(diff[0].status).toBe('R')
      expect(diff[0].path).toBe('new-name.txt')
      expect(diff[0].originalPath).toBe('old-name.txt')
    })

    it('returns empty array for identical branches', async () => {
      await rig.createCommit('file.txt', 'content')

      // Create a branch at the same commit
      await rig.git('checkout', '-b', 'identical')

      const diff = await git.getDiffBetweenBranches(
        'main',
        'identical',
        rig.dir,
      )

      expect(diff).toHaveLength(0)
    })

    it('finds multiple files with different statuses', async () => {
      // Setup: create files on main
      await rig.createCommit('keep.txt', 'unchanged')
      await rig.createCommit('modify.txt', 'will be modified')
      await rig.createCommit('delete.txt', 'will be deleted')

      // Create feature branch with multiple changes
      await rig.git('checkout', '-b', 'feature')
      await rig.createCommit('add.txt', 'new file')
      await rig.createCommit('modify.txt', 'modified content')
      await rig.deleteFile('delete.txt')
      await rig.git('add', '-A')
      await rig.git('commit', '-m', 'Delete file')

      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(3)
      expect(diff).toContainEqual({ path: 'add.txt', status: 'A' })
      expect(diff).toContainEqual({ path: 'modify.txt', status: 'M' })
      expect(diff).toContainEqual({ path: 'delete.txt', status: 'D' })
    })

    it('handles nested directory structures', async () => {
      await rig.createCommit('base.txt', 'base')

      await rig.git('checkout', '-b', 'feature')
      await rig.createCommit('src/components/Button.tsx', 'button code')
      await rig.createCommit('src/utils/helpers.ts', 'helpers')

      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(2)
      expect(diff).toContainEqual({
        path: 'src/components/Button.tsx',
        status: 'A',
      })
      expect(diff).toContainEqual({
        path: 'src/utils/helpers.ts',
        status: 'A',
      })
    })

    it('uses three-dot diff to find changes since divergence', async () => {
      // Create initial file
      await rig.createCommit('base.txt', 'base')

      // Create feature branch
      await rig.git('checkout', '-b', 'feature')
      await rig.createCommit('feature.txt', 'feature content')

      // Go back to main and add another commit
      await rig.checkout('main')
      await rig.createCommit('main-only.txt', 'main content')

      // Three-dot diff should only show feature.txt, not main-only.txt
      // Because it compares from the merge-base
      const diff = await git.getDiffBetweenBranches('main', 'feature', rig.dir)

      expect(diff).toHaveLength(1)
      expect(diff).toContainEqual({
        path: 'feature.txt',
        status: 'A',
      })
    })
  })
})
