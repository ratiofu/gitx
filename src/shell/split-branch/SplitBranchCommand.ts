import { emptyArray } from '../../base/empty.js'
import {
  computeSplitOperations,
  resolveSplitContext,
} from '../../core/logic.js'
import type { Branch, GitFile, SplitOperation } from '../../core/models.js'
import { createSpinner, showNote, showOutro } from '../tui.js'
import { getAppContext } from './context.js'
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
  #operations: readonly SplitOperation[] = emptyArray()
  readonly #spinner
  readonly #options: SplitBranchCommandOptions

  constructor(options: SplitBranchCommandOptions) {
    this.#spinner = createSpinner()
    this.#options = options
  }

  public async execute() {
    const ops = [
      this.readRepoState,
      this.determineSource,
      this.determineDestination,
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

  private async readRepoState(): Promise<boolean> {
    this.#spinner.start('Reading repository status')
    const context = await getAppContext()
    this.#currentBranch = context.currentBranch
    const files = context.files
    this.#branches = context.branches

    if (files.length === 0) {
      showOutro('No modified files found. Nothing to split.')
      return false
    } else {
      this.#files = files
      this.#spinner.stop(`Current branch: ${this.#currentBranch}`)
      return true
    }
  }

  private async determineSource(): Promise<boolean> {
    // 1. If source provided, validate it
    if (this.#options.sourceBranch) {
      const exists = this.#branches.some(
        (b) => b.name === this.#options.sourceBranch,
      )
      if (!exists) {
        showOutro(
          `Source branch '${this.#options.sourceBranch}' does not exist.`,
        )
        return false
      }
      this.#sourceBranch = this.#options.sourceBranch
    } else {
      // 2. If not provided, prompt user (Default to current)
      // TODO: In non-interactive mode, this should default to current without prompt?
      // For now, consistent with requirements, we prompt.
      // But we can skip prompt if we are already in a "default" mode?
      // The requirement says "if no existing source branch is specified, the user is presented with a choice".
      // We'll prompt.
      this.#sourceBranch = await promptSourceBranch(
        this.#branches,
        this.#currentBranch,
      )
    }

    // TODO: Handle source != current (Task 19)
    // If source is not current, we might need to checkout or fetch files from that branch.
    // Currently getAppContext reads worktree of CURRENT branch.
    // So if source != current, this.#files is wrong?
    // We will defer this fix to Task 19.

    return true
  }

  private async determineDestination(): Promise<boolean> {
    // Resolve context based on determined source and options
    const splitContext = resolveSplitContext(
      {
        source: this.#sourceBranch,
        destination: this.#options.destinationBranch,
      },
      this.#currentBranch,
    )

    if (splitContext.destinationBranch) {
      this.#destinationBranch = splitContext.destinationBranch
    } else {
      // Prompt if not resolved
      this.#destinationBranch = await promptDestinationBranch(this.#branches)
    }
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
    const { operations, warnings } = computeSplitOperations(
      this.#filesToCopy,
      this.#filesToRemove,
      {
        sourceBranch: this.#sourceBranch,
        newBranch: this.#destinationBranch,
      },
    )
    this.#operations = operations

    if (warnings.length > 0) {
      showNote(warnings.join('\n'), 'Warnings')
    }

    showPlan(this.#sourceBranch, this.#destinationBranch, this.#operations)

    const confirmed = await confirmExecution()
    if (confirmed) {
      return true
    } else {
      showOutro('Operation cancelled.')
      return false
    }
  }

  private async executeOperations(): Promise<boolean> {
    this.#spinner.start('Executing operations...')
    const isNewBranch = !this.#branches.some(
      (b) => b.name === this.#destinationBranch,
    )

    await executeSplit(
      this.#destinationBranch,
      isNewBranch,
      this.#files,
      this.#filesToCopy,
      this.#operations,
    )

    this.#spinner.stop('Done!')
    if (isNewBranch) {
      showOutro(
        `Switched to branch ${this.#destinationBranch} with selected changes.`,
      )
    } else {
      showOutro('Copied files are unstaged in the current branch')
    }
    return true
  }
}
