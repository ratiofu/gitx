import type { SpinnerResult } from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import * as processUtil from '../../base/process.js'
import type { GitFile } from '../../core/models.js'
import { GitTestRig } from '../../test/git-test-rig.js'
import * as tui from '../tui.js'
import { FilePickCommand } from './FilePickCommand.js'
import * as prompts from './prompts.js'

vi.mock('./prompts.js')
vi.mock('../tui.js')
vi.mock('../../base/process.js')
vi.mock('./execute.js', () => ({
  executeFilePick: vi.fn().mockResolvedValue('Done.'),
}))

describe('file-pick command', () => {
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

  const runCommand = async (options: { sourceBranch?: string } = {}) =>
    new FilePickCommand(options).execute()

  it('copies selected files from source to current branch', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature-source')
    await rig.createCommit('feature-file.txt', 'feature content')
    await rig.checkout('main')

    const file: GitFile = { path: 'feature-file.txt', status: 'A' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
      'feature-source',
    )
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand()

    expect(prompts.showPlan).toHaveBeenCalled()
  })

  it('skips source prompt when --source is provided', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature-source')
    await rig.createCommit('feature-file.txt', 'feature content')
    await rig.checkout('main')

    const file: GitFile = { path: 'feature-file.txt', status: 'A' }
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(true)

    await runCommand({ sourceBranch: 'feature-source' })

    expect(prompts.promptSourceBranch).not.toHaveBeenCalled()
  })

  it('validates source branch existence', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.createBranch('some-branch')

    await runCommand({ sourceBranch: 'non-existent' })

    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining("'non-existent' does not exist"),
    )
    expect(processUtil.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('rejects source branch that is the current branch', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')
    await rig.createBranch('some-branch')

    await runCommand({ sourceBranch: 'main' })

    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining('cannot be the current branch'),
    )
    expect(processUtil.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('exits if no other branches available', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('file.txt', 'content')

    await runCommand()

    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining('No other branches'),
    )
    expect(processUtil.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('exits if no differences found', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'identical')
    await rig.checkout('main')

    await runCommand({ sourceBranch: 'identical' })

    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining('No copyable files found'),
    )
    expect(processUtil.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('exits if no files selected', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature-source')
    await rig.createCommit('feature-file.txt', 'feature content')
    await rig.checkout('main')

    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
      'feature-source',
    )
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([])

    await runCommand()

    expect(tui.showOutro).toHaveBeenCalledWith(
      expect.stringContaining('No files selected'),
    )
    expect(processUtil.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('cancels if user rejects the plan', async () => {
    process.chdir(rig.dir)
    await rig.createCommit('base.txt', 'base')
    await rig.git('checkout', '-b', 'feature-source')
    await rig.createCommit('feature-file.txt', 'feature content')
    await rig.checkout('main')

    const file: GitFile = { path: 'feature-file.txt', status: 'A' }
    vi.mocked(prompts.promptSourceBranch).mockResolvedValueOnce(
      'feature-source',
    )
    vi.mocked(prompts.promptFilesToCopy).mockResolvedValueOnce([file])
    vi.mocked(prompts.confirmExecution).mockResolvedValueOnce(false)

    await runCommand()

    expect(tui.showOutro).toHaveBeenCalledWith('Operation cancelled.')
  })
})
