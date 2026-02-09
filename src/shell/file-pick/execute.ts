import type { FilePickPlan } from '../../core/models.js'
import { git } from '../git.js'

/**
 * Executes the file-pick plan, which is copying files from source branch
 * into the current branch as unstaged changes
 */
export async function executeFilePick(plan: FilePickPlan): Promise<string> {
  for (const file of plan.filesToCopy) {
    await git(['checkout', plan.sourceBranch, '--', file.path])
    await git(['restore', '--staged', file.path])
  }

  return `Copied ${plan.filesToCopy.length} file(s) as unstaged changes.`
}
