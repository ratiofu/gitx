import type { Branch, GitFile } from '../../core/models.js'
import {
  checkGitInstallation,
  getBranchList,
  getCurrentBranch,
  getDiffBetweenBranches,
  getDiffNameStatus,
} from '../git.js'

export interface AppContext {
  currentBranch: string
  branches: readonly Branch[]
}

export async function getAppContext(): Promise<AppContext> {
  // 1. Check Git Environment
  await checkGitInstallation()

  // 2. Get Context (branches only - files are loaded later based on source/destination)
  const [currentBranch, branches] = await Promise.all([
    getCurrentBranch(),
    getBranchList(),
  ])

  return {
    currentBranch,
    branches,
  }
}

/**
 * Get the files to consider for the split operation.
 *
 * There are two modes:
 * 1. Worktree mode (source == current): Get uncommitted changes in the worktree
 * 2. Branch diff mode (source != current): Get committed changes between branches
 *
 * When destination is a NEW branch (doesn't exist yet), we diff against
 * current branch since that's where the new branch will be created from.
 *
 * @param sourceBranch - The branch to copy files FROM
 * @param destinationBranch - The branch to copy files TO
 * @param currentBranch - The current checked-out branch
 * @param branches - List of existing branches (to check if destination exists)
 */
export async function getFilesForSplit(
  sourceBranch: string,
  destinationBranch: string,
  currentBranch: string,
  branches: readonly Branch[],
): Promise<readonly GitFile[]> {
  const isWorktreeMode = sourceBranch === currentBranch

  if (isWorktreeMode) {
    // Get uncommitted worktree changes
    return getDiffNameStatus()
  }

  // Check if destination branch exists
  const destinationExists = branches.some((b) => b.name === destinationBranch)

  // If destination is a NEW branch, diff against current (where new branch will be created)
  // If destination EXISTS, diff against destination
  const baseBranch = destinationExists ? destinationBranch : currentBranch

  // Get committed changes between base and source branches
  // This shows what's different in source compared to base
  return getDiffBetweenBranches(baseBranch, sourceBranch)
}
