import { mkdtemp, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { err, ok, type Result } from '../../base/result.js'
import type { FilePickPlan } from '../../core/models.js'
import {
  addWorktree,
  commit,
  git,
  removeFiles,
  removeWorktree,
} from '../git.js'

/**
 * Executes the file-pick plan:
 * 1. Copy files from source branch into the current branch as unstaged changes
 * 2. If files are selected for deletion, delete them from the source branch via a worktree
 */
export async function executeFilePick(plan: FilePickPlan): Promise<string> {
  for (const file of plan.filesToCopy) {
    await git(['checkout', plan.sourceBranch, '--', file.path])
    await git(['restore', '--staged', file.path])
  }

  if (plan.filesToDelete.length > 0) {
    const result = await deleteFromSourceViaWorktree(plan)
    if (!result.ok) return result.error
    return `Copied ${plan.filesToCopy.length} file(s) as unstaged changes. Deleted ${plan.filesToDelete.length} file(s) from ${plan.sourceBranch}.`
  }

  return `Copied ${plan.filesToCopy.length} file(s) as unstaged changes.`
}

async function deleteFromSourceViaWorktree(
  plan: FilePickPlan,
): Promise<Result<void>> {
  const worktreeDir = await mkdtemp(join(tmpdir(), 'gitx-worktree-'))
  let worktreeCreated = false
  try {
    await addWorktree(worktreeDir, plan.sourceBranch)
    worktreeCreated = true
    const paths = plan.filesToDelete.map((f) => f.path)
    await removeFiles(paths, worktreeDir)
    await commit(`Remove files picked into ${plan.currentBranch}`, worktreeDir)
    await removeWorktree(worktreeDir)
    return ok()
  } catch (error) {
    if (!worktreeCreated) await rmdir(worktreeDir).catch(() => {})
    const message = error instanceof Error ? error.message : String(error)
    const lines = [
      `Copied ${plan.filesToCopy.length} file(s) as unstaged changes.`,
      `Failed to delete files from ${plan.sourceBranch}: ${message}`,
    ]
    if (worktreeCreated) lines.push(`The worktree is at: ${worktreeDir}`)
    return err(lines.join('\n'))
  }
}
