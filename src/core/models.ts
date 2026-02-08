export type GitStatus =
  | 'A' // Added
  | 'M' // Modified
  | 'D' // Deleted
  | 'R' // Renamed
  | 'C' // Copied
  | 'U' // Unmerged (Merge conflict)
  | '?' // Untracked
  | ' ' // Unmodified or ignored

export interface GitFile {
  readonly path: string
  readonly status: GitStatus
  readonly originalPath?: string // For renames
}

export interface Branch {
  readonly name: string
  readonly isCurrent: boolean
  readonly lastCommitDate?: Date
}

export interface FilePickPlan {
  readonly sourceBranch: string
  readonly currentBranch: string
  readonly filesToCopy: readonly GitFile[]
  readonly filesToDelete: readonly GitFile[]
}
