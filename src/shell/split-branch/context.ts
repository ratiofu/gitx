import type { Branch, GitFile } from '../../core/models.js'
import {
  checkGitInstallation,
  getBranchList,
  getCurrentBranch,
  getDiffNameStatus,
} from '../git.js'

export interface AppContext {
  currentBranch: string
  files: readonly GitFile[]
  branches: readonly Branch[]
}

export async function getAppContext(): Promise<AppContext> {
  // 1. Check Git Environment
  await checkGitInstallation()

  // 2. Get Context
  const [currentBranch, files, branches] = await Promise.all([
    getCurrentBranch(),
    getDiffNameStatus(),
    getBranchList(),
  ])

  return {
    currentBranch,
    files,
    branches,
  }
}
