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
  showPlan,
} from './prompts.js'

export interface SplitBranchCommandOptions {
  readonly sourceBranch?: string
  readonly destinationBranch?: string
}

export class SplitBranchCommand {
  // TODO: this naming an the usage do not make sense.
  // Branch selection/confirmation needs to be its own op in the list of ops below
  // 1. we may be getting source and target branch injected as options
  // 2. those passed options should be validated and if either of the branches don't exist, exit with an error
  // 3. if no existing destination branch is specified, the user is presented with a choice to select any local branch, with the `<current branch>` highlighted as the default (arrow select, enter confirm)
  // 4. if no existing source branch is specified, the user is presented with a choice to select any local branch; if the destination branch is not `<current branch>`, the make this the default option
  #currentBranch = ''
  #branchChoice = ''
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

    const splitContext = resolveSplitContext(
      {
        source: this.#options.sourceBranch,
        destination: this.#options.destinationBranch,
      },
      this.#currentBranch,
    )

    // TODO: Handle source != current (Task 19)
    if (!splitContext.currentBranchIsSource) {
      // For now, we just warn or log? Or maybe we can't do anything yet.
      // Leaving files as is (worktree) which is technically wrong if we wanted another branch.
    }

    // Set destination if resolved (e.g. defaulting to current when source is other)
    if (splitContext.destinationBranch) {
      this.#branchChoice = splitContext.destinationBranch
    }

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

    if (!this.#branchChoice) {
      this.#branchChoice = await promptDestinationBranch(this.#branches)
    }
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
