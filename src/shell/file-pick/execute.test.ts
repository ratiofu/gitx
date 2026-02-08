import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FilePickPlan } from '../../core/models.js'
import { GitTestRig } from '../../test/git-test-rig.js'
import { executeFilePick } from './execute.js'

describe('executeFilePick', () => {
  let rig: GitTestRig

  beforeEach(async () => {
    rig = await GitTestRig.create()
  })

  afterEach(async () => {
    await rig.cleanup()
  })

  it('copies files from source as unstaged changes', async () => {
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature')
    await rig.createCommit('new-file.txt', 'feature content')
    await rig.checkout('main')

    process.chdir(rig.dir)
    const plan: FilePickPlan = {
      sourceBranch: 'feature',
      currentBranch: 'main',
      filesToCopy: [{ path: 'new-file.txt', status: 'A' }],
      filesToDelete: [],
    }

    const result = await executeFilePick(plan)

    expect(result).toContain('Copied 1 file(s)')
    expect(await rig.fileExists('new-file.txt')).toBe(true)
    expect(await rig.getFileContent('new-file.txt')).toBe('feature content')
  })

  it('copies files and deletes from source via worktree', async () => {
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature')
    await rig.createCommit('move-me.txt', 'move content')
    await rig.checkout('main')

    process.chdir(rig.dir)
    const plan: FilePickPlan = {
      sourceBranch: 'feature',
      currentBranch: 'main',
      filesToCopy: [{ path: 'move-me.txt', status: 'A' }],
      filesToDelete: [{ path: 'move-me.txt', status: 'A' }],
    }

    const result = await executeFilePick(plan)

    expect(result).toContain('Deleted 1 file(s) from feature')
    // File was copied to current branch (unstaged)
    expect(await rig.fileExists('move-me.txt')).toBe(true)

    // Verify file was deleted on source branch by inspecting the commit tree
    // (we can't just checkout the branch -- the unstaged copy would linger as untracked)
    const { stdout } = await rig.git('ls-tree', '-r', '--name-only', 'feature')
    expect(stdout).not.toContain('move-me.txt')
  })

  it('reports worktree path on deletion failure', async () => {
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature')
    await rig.createCommit('file.txt', 'content')
    await rig.checkout('main')

    process.chdir(rig.dir)
    const plan: FilePickPlan = {
      sourceBranch: 'feature',
      currentBranch: 'main',
      filesToCopy: [{ path: 'file.txt', status: 'A' }],
      // Try to delete a file that doesn't exist on the source
      filesToDelete: [{ path: 'nonexistent.txt', status: 'A' }],
    }

    const result = await executeFilePick(plan)

    expect(result).toContain('Failed to delete files')
    expect(result).toContain('worktree is at:')
  })
})
