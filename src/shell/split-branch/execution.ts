import type { GitFile, SplitOperation } from '../../core/models.js'
import { checkout, createBranch, git } from '../git.js'

export async function executeSplit(
  newBranchName: string,
  isNewBranch: boolean,
  files: readonly GitFile[],
  filesToCopy: readonly GitFile[],
  operations: readonly SplitOperation[],
) {
  // A. Create new branch if needed or switch
  if (isNewBranch) {
    // Create from CURRENT HEAD (which has the uncommitted changes)
    await createBranch(newBranchName)
  } else {
    // Switch to existing
    await checkout(newBranchName)
  }

  // B. Clean up unselected files on new branch
  const filesToCopyPaths = filesToCopy.map((f) => f.path)
  const unselectedFiles = files.filter(
    (f) => !filesToCopyPaths.includes(f.path),
  )

  if (unselectedFiles.length > 0) {
    await git(['restore', ...unselectedFiles.map((f) => f.path)])
  }

  // C. Handle remove-source (Not fully automated yet per original implementation limitation)
  const removeOps = operations.filter((o) => o.type === 'remove-source')
  if (removeOps.length > 0) {
    // Check if we can warn?
    // The original logic was to just warn at the end.
  }
}
