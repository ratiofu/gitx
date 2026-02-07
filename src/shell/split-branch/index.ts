import { outro } from '@clack/prompts'
import { defineCommand } from 'citty'
import { red } from 'picocolors'
import { exitProcessWithCode } from '../../base/process.js'
import { SplitBranchCommand } from './SplitBranchCommand.js'

export const splitBranchCommand = defineCommand({
  meta: {
    name: 'split-branch',
    description: 'Split current changes into a new branch',
  },
  args: {},
  async run() {
    try {
      await new SplitBranchCommand({}).execute()
    } catch (e: unknown) {
      if (e instanceof Error) {
        outro(red(e.message))
      } else {
        outro(red(String(e)))
      }
      exitProcessWithCode(1)
    }
  },
})
