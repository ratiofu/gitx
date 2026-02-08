import { emptyArray } from '../../base/empty.js'
import type { Branch, GitFile } from '../../core/models.js'
import { createSpinner, showNote, showOutro } from '../tui.js'
import { getAppContext, getFilesForSplit } from './context.js'
import { executeSplit } from './execution.js'
import {
  confirmExecution,
  promptDestinationBranch,
  promptFilesToCopy,
  promptFilesToRemove,
  promptSourceBranch,
  showPlan,
} from './prompts.js'

export interface SplitBranchCommandOptions {
  readonly sourceBranch?: string
  readonly destinationBranch?: string
}

export class SplitBranchCommand {
  #currentBranch = ''
  #destinationBranch = ''
  #sourceBranch = ''
  #files: readonly GitFile[] = emptyArray()
  #branches: readonly Branch[] = emptyArray()
  #filesToCopy: readonly GitFile[] = emptyArray()
  #filesToRemove: readonly GitFile[] = emptyArray()
  readonly #spinner
  readonly #options: SplitBranchCommandOptions

  constructor(options: SplitBranchCommandOptions) {
    this.#spinner = createSpinner()
    this.#options = options
  }

  public async execute() {
    // The order follows the implementation plan:
    // 1. Destination First (resolve or prompt)
    // 2. Source Second (resolve or prompt, excluding destination)
    // 3. Load files based on source/destination context
    const ops = [
      this.loadBranches,
      this.determineDestination,
      this.determineSource,
      this.loadFiles,
      this.selectFiles,
      this.computeLogic,
      this.executeOperations,
    ] as const

    let completed = true
    for (const op of ops) {
      completed = await op.apply(this)
      if (!completed) {
        break
      }
    }
  }

  /**
   * Phase 1: Load branches and current branch info.
   * We need this before we can resolve destination/source.
   */
  private async loadBranches(): Promise<boolean> {
    this.#spinner.start('Reading repository status')
    const context = await getAppContext()
    this.#currentBranch = context.currentBranch
    this.#branches = context.branches
    this.#spinner.stop(`Current branch: ${this.#currentBranch}`)
    return true
  }

  /**
   * Phase 2: Determine destination branch.
   * Runs BEFORE source so we can exclude destination from source options.
   */
  private async determineDestination(): Promise<boolean> {
    // Resolve "." alias to current branch
    const destArg = this.#options.destinationBranch
    if (destArg === '.') {
      this.#destinationBranch = this.#currentBranch
      return true
    }

    if (destArg) {
      // Destination provided - use it directly (can be new or existing)
      this.#destinationBranch = destArg
    } else {
      // Prompt user to select destination
      this.#destinationBranch = await promptDestinationBranch(this.#branches)
    }
    return true
  }

  /**
   * Phase 3: Determine source branch.
   * Destination must be resolved first so we can exclude it from options.
   */
  private async determineSource(): Promise<boolean> {
    // Resolve "." alias to current branch
    const sourceArg =
      this.#options.sourceBranch === '.'
        ? this.#currentBranch
        : this.#options.sourceBranch

    if (sourceArg) {
      // Validate source branch exists
      const exists = this.#branches.some((b) => b.name === sourceArg)
      if (!exists) {
        showOutro(`Source branch '${sourceArg}' does not exist.`)
        return false
      }
      this.#sourceBranch = sourceArg
    } else {
      // Prompt user - exclude the destination branch from options
      const availableBranches = this.#branches.filter(
        (b) => b.name !== this.#destinationBranch,
      )

      if (availableBranches.length === 0) {
        showOutro('No other branches available to copy from.')
        return false
      }

      this.#sourceBranch = await promptSourceBranch(
        availableBranches,
        this.#currentBranch,
      )
    }
    return true
  }

  /**
   * Phase 4: Load files based on resolved source/destination context.
   * - If source == current: Use worktree diff (uncommitted changes)
   * - If source != current: Use branch diff (committed changes between branches)
   */
  private async loadFiles(): Promise<boolean> {
    const isWorktreeMode = this.#sourceBranch === this.#currentBranch

    this.#spinner.start(
      isWorktreeMode
        ? 'Scanning worktree changes...'
        : `Scanning changes between ${this.#destinationBranch} and ${this.#sourceBranch}...`,
    )

    const files = await getFilesForSplit(
      this.#sourceBranch,
      this.#destinationBranch,
      this.#currentBranch,
      this.#branches,
    )

    if (files.length === 0) {
      this.#spinner.stop('')
      showOutro(
        isWorktreeMode
          ? 'No modified files found. Nothing to split.'
          : `No differences found between ${this.#sourceBranch} and ${this.#destinationBranch}.`,
      )
      return false
    }

    this.#files = files
    this.#spinner.stop(`Found ${files.length} file(s) to consider`)
    return true
  }

  private async selectFiles(): Promise<boolean> {
    const filesToCopy = await promptFilesToCopy(this.#files)

    if (filesToCopy.length === 0) {
      showOutro('No files selected.')
      return false
    }
    this.#filesToCopy = filesToCopy
    this.#filesToRemove = await promptFilesToRemove(filesToCopy)
    return true
  }

  private async computeLogic(): Promise<boolean> {
    // Validate: can only remove files that are also being copied
    const copyPaths = new Set(this.#filesToCopy.map((f) => f.path))
    const warnings = this.#filesToRemove
      .filter((f) => !copyPaths.has(f.path))
      .map((f) => `Cannot remove "${f.path}" because it is not being copied.`)

    if (warnings.length > 0) {
      showNote(warnings.join('\n'), 'Warnings')
    }

    showPlan(
      this.#sourceBranch,
      this.#destinationBranch,
      this.#filesToCopy,
      this.#filesToRemove,
    )

    const confirmed = await confirmExecution()
    if (!confirmed) {
      showOutro('Operation cancelled.')
      return false
    }
    return true
  }

  private async executeOperations(): Promise<boolean> {
    this.#spinner.start('Executing operations...')
    const isNewBranch = !this.#branches.some(
      (b) => b.name === this.#destinationBranch,
    )

    await executeSplit({
      sourceBranch: this.#sourceBranch,
      destinationBranch: this.#destinationBranch,
      currentBranch: this.#currentBranch,
      isNewBranch,
      filesToCopy: this.#filesToCopy,
      allCandidateFiles: this.#files,
    })

    this.#spinner.stop('Done!')

    const isWorktreeMode = this.#sourceBranch === this.#currentBranch
    const isDestinationCurrent =
      this.#destinationBranch === this.#currentBranch

    if (isWorktreeMode) {
      if (isNewBranch) {
        showOutro(
          `Switched to branch ${this.#destinationBranch} with selected changes.`,
        )
      } else {
        showOutro(
          `Switched to ${this.#destinationBranch} with selected changes.`,
        )
      }
    } else if (isDestinationCurrent) {
      showOutro('Copied files are unstaged in the current branch')
    } else {
      showOutro(
        `Switched to branch ${this.#destinationBranch} with files from ${this.#sourceBranch}.`,
      )
    }
    return true
  }
}
