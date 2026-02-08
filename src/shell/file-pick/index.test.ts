import type { CommandContext, ParsedArgs } from 'citty'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import * as processHelper from '../../base/process.js'
import * as tui from '../tui.js'
import { FilePickCommand } from './FilePickCommand.js'
import { filePickCommand } from './index.js'

vi.mock('../../base/process.js')
vi.mock('../tui.js')
vi.mock('./FilePickCommand.js')

async function mockCommand(
  executeResult: Promise<void> = Promise.resolve(),
): Promise<ReturnType<typeof vi.fn>> {
  const mockExecute = vi.fn().mockReturnValue(executeResult)
  vi.mocked(FilePickCommand).mockImplementation(
    class {
      execute = mockExecute
    } as unknown as typeof FilePickCommand,
  )
  return mockExecute
}

describe('filePickCommand entry point', () => {
  beforeEach(vi.clearAllMocks)
  afterEach(vi.restoreAllMocks)

  type ArgsResolvable = NonNullable<(typeof filePickCommand)['args']>
  type ArgsDef = Extract<ArgsResolvable, Record<string, unknown>>
  type Parsed = ParsedArgs<ArgsDef>

  const runCommand = async (inputArgs: { source?: string } = {}) => {
    if (!filePickCommand.run) {
      throw new Error('Command run method is undefined')
    }
    const ctx = mock<CommandContext<ArgsDef>>()
    ctx.args = {
      _: [],
      source: inputArgs.source,
      s: inputArgs.source,
    } as Parsed
    await filePickCommand.run(ctx)
  }

  it('executes FilePickCommand successfully with defaults', async () => {
    const mockExecute = await mockCommand()
    await runCommand()
    expect(FilePickCommand).toHaveBeenCalledWith({})
    expect(mockExecute).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).not.toHaveBeenCalled()
  })

  it('executes FilePickCommand with provided args', async () => {
    const mockExecute = await mockCommand()
    await runCommand({ source: 'source-branch' })
    expect(FilePickCommand).toHaveBeenCalledWith({
      sourceBranch: 'source-branch',
    })
    expect(mockExecute).toHaveBeenCalled()
  })

  it('handles Error instances and exits with code 1', async () => {
    await mockCommand(Promise.reject(new Error('Standard error')))
    await runCommand()
    expect(tui.showOutro).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('handles non-Error values and exits with code 1', async () => {
    await mockCommand(Promise.reject('Some string error'))
    await runCommand()
    expect(tui.showOutro).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).toHaveBeenCalledWith(1)
  })
})
