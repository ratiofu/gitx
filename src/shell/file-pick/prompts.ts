import pc from 'picocolors'

const { dim, green } = pc

import type { Branch, FilePickPlan, GitFile } from '../../core/models.js'
import { confirmAction, multiSelect, selectOption, showNote } from '../tui.js'

export async function promptFilesToCopy(
  files: readonly GitFile[],
): Promise<readonly GitFile[]> {
  const selectedPaths = await multiSelect(
    'Select files to COPY into the current branch:',
    files.map((f) => ({
      value: f.path,
      label: `${f.status}  ${f.path}`,
    })),
  )
  return files.filter((f) => selectedPaths.includes(f.path))
}

export async function promptSourceBranch(
  branches: readonly Branch[],
): Promise<string> {
  return selectOption(
    'Source branch (pick files from):',
    branches.map((b) => ({ value: b.name, label: b.name })),
  )
}

export function showPlan(plan: FilePickPlan) {
  let summary = 'Plan:\n'
  summary += `  • Source: ${dim(plan.sourceBranch)}\n`
  summary += `  • Dest:   ${green(plan.currentBranch)} (current)\n\n`
  summary += `  • Copying ${plan.filesToCopy.length} file(s) as unstaged:\n`
  for (const file of plan.filesToCopy) {
    summary += `    - ${file.path}\n`
  }
  showNote(summary, 'Review')
}

export async function confirmExecution(): Promise<boolean> {
  return confirmAction('Proceed with these operations?')
}
