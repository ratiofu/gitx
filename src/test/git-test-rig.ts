import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execa } from 'execa'

/**
 * A simple Git rig for testing.
 *
 * It creates a temporary directory and initializes a Git repository with a
 * default configuration. It provides helper methods to simulate file changes
 * and commits, making it easier to test Git-related logic in isolation.
 */
export class GitTestRig {
  public dir: string

  private constructor(dir: string) {
    this.dir = dir
  }

  static async create(): Promise<GitTestRig> {
    const dir = await mkdtemp(join(tmpdir(), 'gitx-test-'))
    const rig = new GitTestRig(dir)
    await rig.init()
    return rig
  }

  async cleanup() {
    await rm(this.dir, { recursive: true, force: true })
  }

  private async exec(command: string, args: string[]) {
    return execa(command, args, { cwd: this.dir })
  }

  async git(...args: string[]) {
    return this.exec('git', args)
  }

  async init() {
    await this.git('init')
    await this.git('config', 'user.name', 'Test User')
    await this.git('config', 'user.email', 'test@example.com')
    // Ensure main branch allows us to commit immediately without fuss
    await this.git('commit', '--allow-empty', '-m', 'Initial commit')
    await this.git('branch', '-M', 'main')
  }

  /**
   * Create a file on disk (and optionally folder structure)
   */
  async writeFile(path: string, content = 'content') {
    const fullPath = join(this.dir, path)
    // Ensure directory exists
    const parentDir = join(fullPath, '..')
    await execa('mkdir', ['-p', parentDir], { cwd: this.dir })
    await execa('sh', ['-c', `echo "${content}" > "${fullPath}"`], {
      cwd: this.dir,
    })
  }

  /**
   * Create a file, stage it, and commit it
   */
  async createCommit(filename: string, content = 'content', message?: string) {
    await this.writeFile(filename, content)
    await this.git('add', filename)
    await this.git('commit', '-m', message || `Add ${filename}`)
  }

  /**
   * Modify an existing file without staging/committing (Dirty state)
   */
  async modifyFile(filename: string, content = 'modified content') {
    await this.writeFile(filename, content)
  }

  /**
   * Stage a file
   */
  async stageFile(filename: string) {
    await this.git('add', filename)
  }

  /**
   * Delete a file from disk
   */
  async deleteFile(filename: string) {
    await rm(join(this.dir, filename))
  }

  /**
   * Create a branch from a specific point (default: HEAD)
   */
  async createBranch(name: string, startPoint?: string) {
    if (startPoint) {
      await this.git('branch', name, startPoint)
    } else {
      await this.git('branch', name)
    }
  }

  async checkout(name: string) {
    await this.git('checkout', name)
  }

  async currentBranch(): Promise<string> {
    const { stdout } = await this.git('branch', '--show-current')
    return stdout.trim()
  }

  /**
   * Check if a file exists in the worktree
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await execa('test', ['-f', path], { cwd: this.dir })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the content of a file in the worktree
   */
  async getFileContent(path: string): Promise<string> {
    const { stdout } = await execa('cat', [path], { cwd: this.dir })
    return stdout.trim()
  }
}
