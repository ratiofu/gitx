import { execa } from 'execa'
import {
  GIT_BRANCH_LIST_ARGS,
  parseBranchList,
  parseDiffNameStatus,
} from '../core/git-parsing.js'

export interface GitOptions {
  readonly cwd?: string
}

/**
 * Execute a git command and return the stdout.
 */
export async function git(args: readonly string[], options: GitOptions = {}) {
  const { stdout } = await execa('git', args, { cwd: options.cwd })
  return stdout.trim()
}

/**
 * Validates that git is installed and we are in a working tree.
 */
export async function checkGitInstallation(cwd?: string) {
  try {
    await git(['--version'], { cwd })
    const isWorkTree = await git(['rev-parse', '--is-inside-work-tree'], {
      cwd,
    })
    if (isWorkTree !== 'true') {
      throw new Error('Not inside a git work tree')
    }
  } catch (_error) {
    throw new Error('Git is not installed or not in a git repository')
  }
}

export async function getBranchList(cwd?: string) {
  const output = await git(GIT_BRANCH_LIST_ARGS, { cwd })
  return parseBranchList(output)
}

export async function getCurrentBranch(cwd?: string) {
  return git(['branch', '--show-current'], { cwd })
}

export async function checkout(
  branchName: string,
  cwd?: string,
): Promise<void> {
  await git(['checkout', branchName], { cwd })
}

export async function getDiffBetweenBranches(
  baseBranch: string,
  sourceBranch: string,
  cwd?: string,
) {
  const output = await git(
    ['diff', '--name-status', '-M', `${baseBranch}...${sourceBranch}`],
    { cwd },
  )
  return parseDiffNameStatus(output)
}

// --- Worktree operations ---

export async function addWorktree(
  path: string,
  branch: string,
  cwd?: string,
): Promise<void> {
  await git(['worktree', 'add', path, branch], { cwd })
}

export async function removeWorktree(
  path: string,
  cwd?: string,
): Promise<void> {
  await git(['worktree', 'remove', path], { cwd })
}

export async function removeFiles(
  paths: readonly string[],
  cwd: string,
): Promise<void> {
  await git(['rm', ...paths], { cwd })
}

export async function commit(message: string, cwd: string): Promise<void> {
  await git(['commit', '-m', message], { cwd })
}
