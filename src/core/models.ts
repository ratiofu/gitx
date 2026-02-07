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
  path: string
  status: GitStatus
  originalPath?: string // For renames
}

export interface Branch {
  name: string
  isCurrent: boolean
  sha?: string
  lastCommitDate?: Date
}

export type OperationType = 'copy' | 'remove-source'

export interface SplitOperation {
  type: OperationType
  file: GitFile
  destinationBranch: string
  sourceBranch: string
}
