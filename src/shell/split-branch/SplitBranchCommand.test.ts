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
})
