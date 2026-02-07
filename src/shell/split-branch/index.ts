import { outro } from '@clack/prompts'
import { defineCommand } from 'citty'
import pc from 'picocolors'

const { red } = pc

import { exitProcessWithCode } from '../../base/process.js'
import { SplitBranchCommand } from './SplitBranchCommand.js'

function defineSb(
  name: string = 'split-branch',
  description: string = 'Split current changes into a new branch',
) {
  return defineCommand({
    meta: {
      name,
      description,
    },
    args: {
      source: {
        type: 'string',
        alias: 's',
        description: 'Source branch',
      },
      destination: {
        type: 'string',
        alias: 'd',
        description: 'Destination branch',
      },
    },
    async run({ args }) {
      try {
        await new SplitBranchCommand({
          sourceBranch: args.source,
          destinationBranch: args.destination,
        }).execute()
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
}

export const splitBranchCommand = defineSb()
export const sbCommandAlias = defineSb('sb', 'Alias for split-branch')
