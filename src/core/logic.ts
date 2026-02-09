import { readOnly } from '../base/read-only.js'
import type {
  GitFile,
  SplitContext,
  SplitOperation,
  SplitOptions,
} from './models.js'

export interface SplitResult {
  readonly operations: readonly SplitOperation[]
  readonly warnings: readonly string[]
}

/**
 * Computes the operations needed to split files into a new branch.
 *
 * @param filesToCopy - Files that should be copied to the destination branch
 * @param filesToRemove - Files that should be removed from the source branch (after copy)
 * @param options - Context (branches)
 */
export function computeSplitOperations(
  filesToCopy: readonly GitFile[],
  filesToRemove: readonly GitFile[],
  options: SplitOptions,
): SplitResult {
  const operations: SplitOperation[] = []
  const warnings: string[] = []

  // 1. Copy operations
  for (const file of filesToCopy) {
    operations.push(
      readOnly({
        type: 'copy',
        file,
        sourceBranch: options.sourceBranch,
        destinationBranch: options.newBranch,
      }),
    )
  }

  // 2. Remove operations
  // Invariant: Can only remove files that are also being copied.
  // We use a Set for O(1) lookups
  const copyPaths = new Set(filesToCopy.map((f) => f.path))

  for (const file of filesToRemove) {
    if (!copyPaths.has(file.path)) {
      warnings.push(
        `Cannot remove "${file.path}" because it is not being copied to the new branch.`,
      )
      continue
    }

    operations.push(
      readOnly({
        type: 'remove-source',
        file,
        sourceBranch: options.sourceBranch,
        destinationBranch: options.newBranch,
      }),
    )
  }

  return readOnly({ operations, warnings })
}

/**
 * Resolves the source and destination branches based on user input and current state.
 */
export function resolveSplitContext(
  args: { source?: string; destination?: string },
  currentBranch: string,
): SplitContext {
  const sourceBranch = args.source || currentBranch
  const currentBranchIsSource = sourceBranch === currentBranch
  // If destination is not provided, and source is current, we don't have a default destination (user must choose).
  // If destination is not provided, and source is NOT current, we default destination to current.
  const destinationBranch =
    args.destination || (currentBranchIsSource ? '' : currentBranch)

  return readOnly({
    sourceBranch,
    destinationBranch,
    currentBranchIsSource,
  })
}
