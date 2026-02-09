import { defineCommand } from 'citty'
import pc from 'picocolors'
import { exitProcessWithCode } from '../../base/process.js'
import { showOutro } from '../tui.js'
import { FilePickCommand } from './FilePickCommand.js'

const { red } = pc

function defineFp(
  name = 'file-pick',
  description = 'Pick files from another branch into the current branch',
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
        description: 'Source branch to pick files from',
      },
    },
    async run({ args }) {
      try {
        await new FilePickCommand({
          sourceBranch: args.source,
        }).execute()
      } catch (e: unknown) {
        if (e instanceof Error) {
          showOutro(red(e.message))
        } else {
          showOutro(red(String(e)))
        }
        exitProcessWithCode(1)
      }
    },
  })
}

export const filePickCommand = defineFp()
export const fpCommandAlias = defineFp('fp', 'Alias for file-pick')
