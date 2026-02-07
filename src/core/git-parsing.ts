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
export function parseDiffNameStatus(output: string): GitFile[] {
  if (!output.trim()) {
    return []
  }

  const lines = output.trim().split('\n')
  return lines.map((line) => {
    // Format: "M\tfile.txt" or "R100\told.txt\tnew.txt"
    const parts = line.split('\t')
    const statusRaw = parts[0]
    const status = statusRaw.charAt(0) as GitStatus

    if (status === 'R' || status === 'C') {
      return {
        status,
        path: parts[2],
        originalPath: parts[1],
      }
    }

    return {
      status,
      path: parts[1],
    }
  })
}

/**
 * Parses the output of 'git ${GIT_BRANCH_LIST_ARGS.join(' ')}'.
 * Expects custom pipe-separated format.
 */
export function parseBranchList(output: string): Branch[] {
  // Parsing 'git branch --sort=-committerdate --format="%(refname:short)|%(HEAD)|%(objectname)|%(committerdate:iso8601)"'
  if (!output.trim()) {
    return []
  }

  return output
    .trim()
    .split('\n')
    .map((line) => {
      const [name, head, sha, date] = line.split('|')
      return {
        name,
        isCurrent: head === '*',
        sha,
        lastCommitDate: new Date(date),
      }
    })
}
