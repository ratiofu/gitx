import * as clackPrompts from '@clack/prompts'
import type { CommandContext, ParsedArgs } from 'citty'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import * as processHelper from '../../base/process.js'
import { splitBranchCommand } from './index.js'
import { SplitBranchCommand } from './SplitBranchCommand.js'

vi.mock('../../base/process.js')
vi.mock('@clack/prompts')
vi.mock('./SplitBranchCommand.js')

/**
 * Sets up the SplitBranchCommand mock with the given execute behavior.
 * @param executeResult - Promise resolution/rejection for the execute method
 * @returns The mock execute function for assertions
 */
async function mockCommand(
  executeResult: Promise<void> = Promise.resolve(),
): Promise<ReturnType<typeof vi.fn>> {
  const mockExecute = vi.fn().mockReturnValue(executeResult)
  vi.mocked(SplitBranchCommand).mockImplementation(
    class {
      execute = mockExecute
    } as unknown as typeof SplitBranchCommand,
  )
  return mockExecute
}

describe('splitBranchCommand entry point', () => {
  beforeEach(vi.clearAllMocks)
  afterEach(vi.restoreAllMocks)

  // Extract the non-resolvable ArgsDef from the command definition
  type ArgsResolvable = NonNullable<(typeof splitBranchCommand)['args']>
  type ArgsDef = Extract<ArgsResolvable, Record<string, unknown>>
  type Parsed = ParsedArgs<ArgsDef>

  const runCommand = async (
    inputArgs: { source?: string; destination?: string } = {},
  ) => {
    if (!splitBranchCommand.run) {
      throw new Error('Command run method is undefined')
    }

    const ctx = mock<CommandContext<ArgsDef>>()

    ctx.args = {
      _: [],
      source: inputArgs.source,
      s: inputArgs.source,
      destination: inputArgs.destination,
      d: inputArgs.destination,
    } as Parsed

    await splitBranchCommand.run(ctx)
  }

  it('executes SplitBranchCommand successfully with defaults', async () => {
    const mockExecute = await mockCommand()

    await runCommand()

    expect(SplitBranchCommand).toHaveBeenCalledWith({})
    expect(mockExecute).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).not.toHaveBeenCalled()
  })

  it('executes SplitBranchCommand with provided args', async () => {
    const mockExecute = await mockCommand()

    await runCommand({ source: 'source-branch', destination: 'dest-branch' })

    expect(SplitBranchCommand).toHaveBeenCalledWith({
      sourceBranch: 'source-branch',
      destinationBranch: 'dest-branch',
    })
    expect(mockExecute).toHaveBeenCalled()
  })

  it('handles Error instances and exits with code 1', async () => {
    await mockCommand(Promise.reject(new Error('Standard error')))

    await runCommand()

    expect(clackPrompts.outro).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).toHaveBeenCalledWith(1)
  })

  it('handles non-Error values and exits with code 1', async () => {
    await mockCommand(Promise.reject('Some string error'))

    await runCommand()

    expect(clackPrompts.outro).toHaveBeenCalled()
    expect(processHelper.exitProcessWithCode).toHaveBeenCalledWith(1)
  })
})
