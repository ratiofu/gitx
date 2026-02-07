import { emptyArray } from '../base/empty.js'
import { readOnly } from '../base/read-only.js'
import type { Branch, GitFile, GitStatus } from './models.js'

export const GIT_DIFF_NAME_STATUS_ARGS = ['diff', '--name-status', '-M']
export const GIT_BRANCH_LIST_ARGS = [
  'branch',
  '--sort=-committerdate',
  '--format=%(refname:short)|%(HEAD)|%(objectname)|%(committerdate:iso8601)',
]

/**
 * Parses the output of 'git ${GIT_DIFF_NAME_STATUS_ARGS.join(' ')}'.
 * Handles renames (R) and copies (C) by extracting original paths.
 */
export function parseDiffNameStatus(output: string): readonly GitFile[] {
  if (!output.trim()) {
    return emptyArray()
  }

  const lines = output.trim().split('\n')
  return readOnly(
    lines.map((line) => {
      // Format: "M\tfile.txt" or "R100\told.txt\tnew.txt"
      const parts = line.split('\t')
      const statusRaw = parts[0]
      const status = statusRaw.charAt(0) as GitStatus

      return readOnly(
        (status === 'R' || status === 'C'
          ? {
              status,
              path: parts[2],
              originalPath: parts[1],
            }
          : {
              status,
              path: parts[1],
            }) satisfies GitFile,
      )
    }),
  )
}

/**
 * Parses the output of 'git ${GIT_BRANCH_LIST_ARGS.join(' ')}'.
 * Expects custom pipe-separated format.
 */
export function parseBranchList(output: string): readonly Branch[] {
  // Parsing 'git branch --sort=-committerdate --format="%(refname:short)|%(HEAD)|%(objectname)|%(committerdate:iso8601)"'
  if (!output.trim()) {
    return emptyArray()
  }

  return readOnly(
    output
      .trim()
      .split('\n')
      .map((line) => {
        const [name, head, sha, date] = line.split('|')
        return readOnly({
          name,
          isCurrent: head === '*',
          sha,
          lastCommitDate: new Date(date),
        } satisfies Branch)
      }),
  )
}
