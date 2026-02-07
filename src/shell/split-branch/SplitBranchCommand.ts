import { emptyArray } from '../../base/empty.js'
import { computeSplitOperations } from '../../core/logic.js'
import type { Branch, GitFile, SplitOperation } from '../../core/models.js'
import { createSpinner, showNote, showOutro } from '../tui.js'
import { getAppContext } from './context.js'
import { executeSplit } from './execution.js'
import {
  confirmExecution,
  promptDestinationBranch,
  promptFilesToCopy,
  promptFilesToRemove,
  showPlan,
} from './prompts.js'

// this is temporary until we figure out CLI arg parsing
export interface SplitBranchCommandOptions {
  readonly targetDir?: string
  readonly sourceDir?: string
}

export class SplitBranchCommand {
  #currentBranch = ''
  #files: readonly GitFile[] = emptyArray()
  #branches: readonly Branch[] = emptyArray()
  #filesToCopy: readonly GitFile[] = emptyArray()
  #filesToRemove: readonly GitFile[] = emptyArray()
  #branchChoice = ''
  #operations: readonly SplitOperation[] = emptyArray()
  readonly #spinner

  constructor(_: SplitBranchCommandOptions) {
    this.#spinner = createSpinner()
  }

  public async execute() {
    const ops = [
      this.loadContext,
      this.promptUser,
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

  private async loadContext(): Promise<boolean> {
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

  private async promptUser(): Promise<boolean> {
    const filesToCopy = await promptFilesToCopy(this.#files)

    if (filesToCopy.length === 0) {
      showOutro('No files selected.')
      return false
    }
    this.#filesToCopy = filesToCopy
    this.#filesToRemove = await promptFilesToRemove(filesToCopy)
    this.#branchChoice = await promptDestinationBranch(this.#branches)
    return true
  }

  private async computeLogic(): Promise<boolean> {
    const { operations, warnings } = computeSplitOperations(
      this.#filesToCopy,
      this.#filesToRemove,
      {
        sourceBranch: this.#currentBranch,
        newBranch: this.#branchChoice,
      },
    )
    this.#operations = operations

    if (warnings.length > 0) {
      showNote(warnings.join('\n'), 'Warnings')
    }

    showPlan(this.#currentBranch, this.#branchChoice, this.#operations)

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
      (b) => b.name === this.#branchChoice,
    )

    await executeSplit(
      this.#branchChoice,
      isNewBranch,
      this.#files,
      this.#filesToCopy,
      this.#operations,
    )

    this.#spinner.stop('Done!')
    if (isNewBranch) {
      showOutro(
        `Switched to branch ${this.#branchChoice} with selected changes.`,
      )
    } else {
      showOutro('Copied files are unstaged in the current branch')
    }
    return true
  }
}
