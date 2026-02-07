import { dim, green } from 'picocolors'
import type { Branch, GitFile, SplitOperation } from '../../core/models.js'
import {
  askText,
  confirmAction,
  isValidBranchName,
  multiSelect,
  selectOption,
  showNote,
} from '../tui.js'

export async function promptFilesToCopy(
  files: readonly GitFile[],
): Promise<readonly GitFile[]> {
  const filesToCopyPaths = await multiSelect(
    'Select files to MOVE to the new branch:',
    files.map((f) => ({
      value: f.path,
      label: `${f.status}  ${f.path}`,
    })),
  )

  return files.filter((f) => filesToCopyPaths.includes(f.path))
}

export async function promptFilesToRemove(
  filesToCopy: readonly GitFile[],
): Promise<readonly GitFile[]> {
  const filesToRemovePaths = await multiSelect(
    'Select files to REMOVE from the source branch (revert changes):',
    filesToCopy.map((f) => ({
      value: f.path,
      label: `${f.status}  ${f.path}`,
    })),
  )

  return filesToCopy.filter((f) => filesToRemovePaths.includes(f.path))
}

export async function promptDestinationBranch(
  branches: readonly Branch[],
): Promise<string> {
  const branchChoice = await selectOption('Destination branch:', [
    { value: 'NEW', label: 'Create new branch...' },
    ...branches
      .filter((b) => !b.isCurrent)
      .map((b) => ({ value: b.name, label: b.name })),
  ])

  if (branchChoice === 'NEW') {
    return await askText(
      'Enter new branch name:',
      'feature/my-new-branch',
      (value: string | undefined) => {
        const error = isValidBranchName(value || '')
        if (error) {
          return error
        }
        if (branches.some((b) => b.name === value)) {
          return 'Branch already exists.'
        }
      },
    )
  }

  return branchChoice
}

export function showPlan(
  currentBranch: string,
  newBranchName: string,
  operations: readonly SplitOperation[],
) {
  const copyOps = operations.filter((o) => o.type === 'copy')
  const removeOps = operations.filter((o) => o.type === 'remove-source')

  let summary = `Plan:\n`
  summary += `  • Source: ${dim(currentBranch)}\n`
  summary += `  • Dest:   ${green(newBranchName)}\n\n`
  summary += `  • Copying ${copyOps.length} file(s) to ${newBranchName}\n`
  if (removeOps.length > 0) {
    summary += `  • Removing ${removeOps.length} file(s) from ${currentBranch}\n`
  }

  showNote(summary, 'Review')
}

export async function confirmExecution(): Promise<boolean> {
  return await confirmAction('Proceed with these operations?')
}
