import pc from 'picocolors'

const { dim, green } = pc

import type { Branch, GitFile } from '../../core/models.js'
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
    'Select files to COPY to the new branch:',
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
    'Select files to DELETE from the source branch:',
    filesToCopy.map((f) => ({
      value: f.path,
      label: `${f.status}  ${f.path}`,
    })),
  )

  return filesToCopy.filter((f) => filesToRemovePaths.includes(f.path))
}

export async function promptSourceBranch(
  branches: readonly Branch[],
  currentBranch: string,
): Promise<string> {
  const options = branches.map((b) => ({
    value: b.name,
    label: b.name,
  }))

  const branchChoice = await selectOption(
    'Source branch:',
    options,
    currentBranch,
  )
  return branchChoice
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
  sourceBranch: string,
  destinationBranch: string,
  filesToCopy: readonly GitFile[],
  filesToRemove: readonly GitFile[],
) {
  let summary = 'Plan:\n'
  summary += `  • Source: ${dim(sourceBranch)}\n`
  summary += `  • Dest:   ${green(destinationBranch)}\n\n`
  summary += `  • Copying ${filesToCopy.length} file(s) to ${destinationBranch}\n`
  if (filesToRemove.length > 0) {
    summary += `  • Removing ${filesToRemove.length} file(s) from ${sourceBranch}\n`
  }

  showNote(summary, 'Review')
}

export async function confirmExecution(): Promise<boolean> {
  return await confirmAction('Proceed with these operations?')
}
