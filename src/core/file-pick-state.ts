import type { Branch, FilePickPlan, GitFile } from './models.js'

// --- State types (discriminated union) ---

export interface NeedsSourceState {
  readonly phase: 'needs-source'
  readonly currentBranch: string
  readonly branches: readonly Branch[]
}

export interface NeedsFileSelectionState {
  readonly phase: 'needs-file-selection'
  readonly currentBranch: string
  readonly sourceBranch: string
  readonly candidates: readonly GitFile[]
}

export interface NeedsDeleteSelectionState {
  readonly phase: 'needs-delete-selection'
  readonly currentBranch: string
  readonly sourceBranch: string
  readonly filesToCopy: readonly GitFile[]
}

export interface PlanReadyState {
  readonly phase: 'plan-ready'
  readonly plan: FilePickPlan
}

export interface AbortedState {
  readonly phase: 'aborted'
  readonly reason: string
}

export type FilePickState =
  | NeedsSourceState
  | NeedsFileSelectionState
  | NeedsDeleteSelectionState
  | PlanReadyState
  | AbortedState

// --- Pure transition functions ---

export function initState(
  currentBranch: string,
  branches: readonly Branch[],
): NeedsSourceState | AbortedState {
  if (!currentBranch) {
    return {
      phase: 'aborted',
      reason:
        'Not on an active branch (detached HEAD). Please checkout a branch first.',
    }
  }
  const otherBranches = branches.filter((b) => b.name !== currentBranch)
  if (otherBranches.length === 0) {
    return {
      phase: 'aborted',
      reason: 'No other branches available to pick files from.',
    }
  }
  return { phase: 'needs-source', currentBranch, branches: otherBranches }
}

export function validateSource(
  state: NeedsSourceState,
  sourceBranch: string,
): AbortedState | undefined {
  if (sourceBranch === state.currentBranch)
    return {
      phase: 'aborted',
      reason: `Source branch cannot be the current branch ('${sourceBranch}').`,
    }
  if (!state.branches.some((b) => b.name === sourceBranch))
    return {
      phase: 'aborted',
      reason: `Source branch '${sourceBranch}' does not exist.`,
    }
  return undefined
}

export function selectSource(
  state: NeedsSourceState,
  sourceBranch: string,
  candidates: readonly GitFile[],
): NeedsFileSelectionState | AbortedState {
  if (candidates.length === 0) {
    return {
      phase: 'aborted',
      reason: `No differences found between ${sourceBranch} and ${state.currentBranch}.`,
    }
  }
  return {
    phase: 'needs-file-selection',
    currentBranch: state.currentBranch,
    sourceBranch,
    candidates,
  }
}

export function selectFiles(
  state: NeedsFileSelectionState,
  filesToCopy: readonly GitFile[],
): NeedsDeleteSelectionState | AbortedState {
  if (filesToCopy.length === 0) {
    return { phase: 'aborted', reason: 'No files selected.' }
  }
  return {
    phase: 'needs-delete-selection',
    currentBranch: state.currentBranch,
    sourceBranch: state.sourceBranch,
    filesToCopy,
  }
}

export function selectDeletes(
  state: NeedsDeleteSelectionState,
  filesToDelete: readonly GitFile[],
): PlanReadyState {
  return {
    phase: 'plan-ready',
    plan: {
      sourceBranch: state.sourceBranch,
      currentBranch: state.currentBranch,
      filesToCopy: state.filesToCopy,
      filesToDelete,
    },
  }
}
