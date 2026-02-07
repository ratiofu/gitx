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
  readonly sha?: string
  readonly lastCommitDate?: Date
}

export type OperationType = 'copy' | 'remove-source'

export interface SplitOperation {
  readonly type: OperationType
  readonly file: GitFile
  readonly destinationBranch: string
  readonly sourceBranch: string
}

export interface SplitOptions {
  readonly newBranch: string
  readonly sourceBranch: string
}
