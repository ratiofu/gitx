import type { SpinnerResult } from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import type { GitFile } from '../../core/models.js'
import { GitTestRig } from '../../test/git-test-rig.js'
import * as tui from '../tui.js'
import * as prompts from './prompts.js'
import { SplitBranchCommand } from './SplitBranchCommand.js'

// Mock dependencies
vi.mock('./prompts.js')
vi.mock('../tui.js')

describe('split-branch command', () => {
  let rig: GitTestRig

  beforeEach(async () => {
    vi.clearAllMocks()
    rig = await GitTestRig.create()
    vi.mocked(tui.createSpinner).mockReturnValue(mock<SpinnerResult>())
  })

  afterEach(async () => {
    await rig.cleanup()
    vi.restoreAllMocks()
  })

  // Helper to run the command with strict typing
  const runCommand = async (
    options: { sourceBranch?: string; destinationBranch?: string } = {},
  ) => await new SplitBranchCommand(options).execute()

  it('copies selected files to a new branch', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')
    await rig.createCommit('keep.txt', 'keep')

    const file: GitFile = { path: 'file.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-new',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()

    const current = await rig.currentBranch()
    expect(current).toBe('feature-new')
    expect(await rig.getFileContent('file.txt')).toBe('modified')
  })

  describe('source branch selection', () => {
    it('prompts for source branch if not provided', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      await rig.modifyFile('file.txt', 'modified')

      vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([]) // Exit early

      await runCommand()

      expect(prompts.promptSourceBranch).toHaveBeenCalled()
    })

    it('skips prompt if source branch is provided', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      await rig.modifyFile('file.txt', 'modified')

      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([]) // Exit early

      await runCommand({ sourceBranch: 'main' })

      expect(prompts.promptSourceBranch).not.toHaveBeenCalled()
    })

    it('validates source branch existence', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      await rig.modifyFile('file.txt', 'modified')

      // Attempt to use non-existent branch
      await runCommand({ sourceBranch: 'non-existent' })

      expect(tui.showOutro).toHaveBeenCalledWith(
        expect.stringContaining("Source branch 'non-existent' does not exist"),
      )
    })
  })

  it('exits if no modified files found', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')

    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')

    await runCommand()

    // check usage of showOutro instead of direct outro
    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining('No modified files'),
    )
  })

  it('exits if no files selected', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')

    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([])

    await runCommand()

    expect(tui.showOutro).toHaveBeenCalledWith('No files selected.')
  })

  it('handles warnings when file to remove is not copied', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')

    const file: GitFile = { path: 'file.txt', status: 'M' }
    const other: GitFile = { path: 'other.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([other])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-new',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()

    expect(tui.showNote).toHaveBeenCalledWith(
      expect.stringContaining('Cannot remove'),
      'Warnings',
    )
  })

  it('cancels execution if plan is not confirmed', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')

    const file: GitFile = { path: 'file.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-new',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(false)

    await runCommand()

    expect(tui.showOutro).toHaveBeenCalledWith('Operation cancelled.')
  })

  it('handles removal operations', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')

    const file: GitFile = { path: 'file.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')

    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-new',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()
  })

  it('executes split on EXISTING branch', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.modifyFile('file.txt', 'modified')
    await rig.createBranch('feature-existing')
    await rig.checkout('main')

    const file: GitFile = { path: 'file.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-existing',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()

    const current = await rig.currentBranch()
    expect(current).toBe('feature-existing')
  })

  it('restores unselected files', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.createCommit('other.txt', 'other content')

    await rig.modifyFile('file.txt', 'modified')
    await rig.modifyFile('other.txt', 'other modified')

    // Mock promptFilesToCopy to return only file.txt
    const file: GitFile = { path: 'file.txt', status: 'M' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('main')

    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
    vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
      'feature-new',
    )
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()

    const current = await rig.currentBranch()
    expect(current).toBe('feature-new')
    // file.txt should be modified (kept)
    expect(await rig.getFileContent('file.txt')).toBe('modified')
    // other.txt should be restored to HEAD (other content) on new branch
    expect(await rig.getFileContent('other.txt')).toBe('other content')
  })

  describe('destination branch selection', () => {
    it('resolves "." alias to current branch for destination', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      // Create another branch with a committed file
      await rig.git('checkout', '-b', 'feature-source')
      await rig.createCommit('feature-file.txt', 'feature content')
      await rig.checkout('main')

      const file: GitFile = { path: 'feature-file.txt', status: 'A' }
      vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
        'feature-source',
      )
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
      vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
      vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

      // Use "." as destination, meaning current branch (main)
      await runCommand({ destinationBranch: '.' })

      // Should stay on main and have the file from feature-source
      const current = await rig.currentBranch()
      expect(current).toBe('main')

      // promptDestinationBranch should NOT have been called
      expect(prompts.promptDestinationBranch).not.toHaveBeenCalled()
    })

    it('excludes destination branch from source options', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      // Create multiple branches
      await rig.git('checkout', '-b', 'feature-a')
      await rig.createCommit('a.txt', 'a content')
      await rig.checkout('main')
      await rig.git('checkout', '-b', 'feature-b')
      await rig.createCommit('b.txt', 'b content')
      await rig.checkout('main')

      const file: GitFile = { path: 'a.txt', status: 'A' }
      vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce('feature-a')
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
      vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
      vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

      // destination = main, so main should be excluded from source options
      await runCommand({ destinationBranch: 'main' })

      // Check that promptSourceBranch was called without 'main' in its options
      expect(prompts.promptSourceBranch).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ name: 'main' }),
        ]),
        expect.any(String),
      )
    })

    it('errors when no other branches available as source', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')

      // Only main branch exists, use it as destination
      await runCommand({ destinationBranch: '.' })

      expect(tui.showOutro).toHaveBeenCalledWith(
        'No other branches available to copy from.',
      )
    })
  })

  describe('source branch alias', () => {
    it('resolves "." alias to current branch for source', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('file.txt', 'content')
      await rig.modifyFile('file.txt', 'modified')

      const file: GitFile = { path: 'file.txt', status: 'M' }
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
      vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
      vi.mocked(prompts.promptDestinationBranch).mockResolvedValueOnce(
        'feature-new',
      )
      vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

      // Use "." as source, meaning current branch (main)
      await runCommand({ sourceBranch: '.' })

      // Source prompt should NOT be called
      expect(prompts.promptSourceBranch).not.toHaveBeenCalled()

      // Should have created a new branch
      const current = await rig.currentBranch()
      expect(current).toBe('feature-new')
    })
  })

  describe('copying from another branch', () => {
    it('copies committed files from source branch to current (destination = current)', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('base.txt', 'base content')

      // Create a feature branch and commit a file
      await rig.git('checkout', '-b', 'feature-source')
      await rig.createCommit('feature-file.txt', 'feature content')
      await rig.checkout('main')

      // main doesn't have feature-file.txt
      expect(await rig.fileExists('feature-file.txt')).toBe(false)

      const file: GitFile = { path: 'feature-file.txt', status: 'A' }
      vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
        'feature-source',
      )
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
      vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
      vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

      // destination = current branch (main)
      await runCommand({ destinationBranch: '.' })

      // Should stay on main
      const current = await rig.currentBranch()
      expect(current).toBe('main')

      // The file from feature-source should now exist
      expect(await rig.fileExists('feature-file.txt')).toBe(true)
      expect(await rig.getFileContent('feature-file.txt')).toBe(
        'feature content',
      )
    })

    it('copies committed files from source branch to a new branch', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('base.txt', 'base content')

      // Create a feature branch with a committed file
      await rig.git('checkout', '-b', 'feature-source')
      await rig.createCommit('source-file.txt', 'source content')
      await rig.checkout('main')

      const file: GitFile = { path: 'source-file.txt', status: 'A' }
      vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
        'feature-source',
      )
      vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
      vi.mocked(prompts.promptFilesToRemove).mockResolvedValueOnce([])
      vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

      // destination = a NEW branch
      await runCommand({ destinationBranch: 'feature-new' })

      // Should be on the new branch
      const current = await rig.currentBranch()
      expect(current).toBe('feature-new')

      // The file from feature-source should exist on the new branch
      expect(await rig.fileExists('source-file.txt')).toBe(true)
    })

    it('exits with message when no differences between branches', async () => {
      process.chdir(rig.dir)
      await rig.createCommit('base.txt', 'base content')

      // Create a branch that is identical to main
      await rig.git('checkout', '-b', 'identical-branch')
      await rig.checkout('main')

      // Source = identical-branch, Destination = main
      // No differences, should exit
      await runCommand({
        sourceBranch: 'identical-branch',
        destinationBranch: '.',
      })

      expect(tui.showOutro).toHaveBeenCalledWith(
        expect.stringContaining('No differences found'),
      )
    })
  })
})
