import type { GitFile } from '../../core/models.js'
import { checkout, createBranch, git } from '../git.js'

export interface ExecuteSplitOptions {
  /** The branch to copy files FROM */
  sourceBranch: string
  /** The branch to copy files TO */
  destinationBranch: string
  /** The currently checked-out branch */
  currentBranch: string
  /** Whether destination is a new branch */
  isNewBranch: boolean
  /** Files selected to copy */
  filesToCopy: readonly GitFile[]
  /** All candidate files (needed for worktree mode cleanup) */
  allCandidateFiles: readonly GitFile[]
}

export async function executeSplit(options: ExecuteSplitOptions) {
  const {
    sourceBranch,
    destinationBranch,
    currentBranch,
    isNewBranch,
    filesToCopy,
    allCandidateFiles,
  } = options

  const isWorktreeMode = sourceBranch === currentBranch
  const isDestinationCurrent = destinationBranch === currentBranch

  if (isWorktreeMode) {
    await executeWorktreeMode(
      destinationBranch,
      isNewBranch,
      filesToCopy,
      allCandidateFiles,
    )
  } else if (isDestinationCurrent) {
    await executeBranchToCurrentMode(sourceBranch, filesToCopy)
  } else {
    await executeBranchToBranchMode(
      sourceBranch,
      destinationBranch,
      isNewBranch,
      filesToCopy,
    )
  }
}

/**
 * Worktree mode: uncommitted changes are already in worktree.
 * Switch to destination branch and restore unselected files.
 */
async function executeWorktreeMode(
  destinationBranch: string,
  isNewBranch: boolean,
  filesToCopy: readonly GitFile[],
  allCandidateFiles: readonly GitFile[],
) {
  if (isNewBranch) {
    await createBranch(destinationBranch)
  } else {
    await checkout(destinationBranch)
  }

  // Restore files that weren't selected
  const selectedPaths = new Set(filesToCopy.map((f) => f.path))
  const unselectedFiles = allCandidateFiles.filter(
    (f) => !selectedPaths.has(f.path),
  )

  if (unselectedFiles.length > 0) {
    await git(['restore', ...unselectedFiles.map((f) => f.path)])
  }
}

/**
 * Branch mode: copy files from source branch to current branch as unstaged changes.
 */
async function executeBranchToCurrentMode(
  sourceBranch: string,
  filesToCopy: readonly GitFile[],
) {
  for (const file of filesToCopy) {
    await git(['checkout', sourceBranch, '--', file.path])
    await git(['restore', '--staged', file.path])
  }
}

/**
 * Branch mode: copy files from source branch to a different destination branch.
 */
async function executeBranchToBranchMode(
  sourceBranch: string,
  destinationBranch: string,
  isNewBranch: boolean,
  filesToCopy: readonly GitFile[],
) {
  if (isNewBranch) {
    await createBranch(destinationBranch)
  } else {
    await checkout(destinationBranch)
  }

  for (const file of filesToCopy) {
    await git(['checkout', sourceBranch, '--', file.path])
  }
}
