import pc from 'picocolors'
import { exitProcessWithCode } from '../../base/process.js'
import {
  type AbortedState,
  type FilePickState,
  initState,
  type NeedsFileSelectionState,
  type NeedsSourceState,
  type PlanReadyState,
  selectFiles,
  selectSource,
  validateSource,
} from '../../core/file-pick-state.js'
import {
  checkGitInstallation,
  getBranchList,
  getCurrentBranch,
  getDiffBetweenBranches,
} from '../git.js'
import { createSpinner, showOutro } from '../tui.js'
import { executeFilePick } from './execute.js'
import {
  confirmExecution,
  promptFilesToCopy,
  promptSourceBranch,
  showPlan,
} from './prompts.js'

export interface FilePickCommandOptions {
  readonly sourceBranch?: string
}

export class FilePickCommand {
  readonly #options: FilePickCommandOptions
  readonly #spinner = createSpinner()

  constructor(options: FilePickCommandOptions) {
    this.#options = options
  }

  async execute() {
    await checkGitInstallation()

    const initialized = await this.#initialize()
    if (failed(initialized)) return abort(initialized)

    const sourceSelected = await this.#pickSource(initialized)
    if (failed(sourceSelected)) return abort(sourceSelected)

    const filesSelected = await pickFiles(sourceSelected)
    if (failed(filesSelected)) return abort(filesSelected)

    showPlan(filesSelected.plan)
    if (!(await confirmExecution())) return showOutro('Operation cancelled.')

    this.#spin('Executing operations...')
    const result = await executeFilePick(filesSelected.plan)
    this.#stop('Done!')
    showOutro(result)
  }

  async #initialize(): Promise<NeedsSourceState | AbortedState> {
    this.#spin('Reading repository status')
    const [currentBranch, branches] = await Promise.all([
      getCurrentBranch(),
      getBranchList(),
    ])
    this.#stop(`Current branch: ${currentBranch}`)
    return initState(currentBranch, branches)
  }

  async #pickSource(
    state: NeedsSourceState,
  ): Promise<NeedsFileSelectionState | AbortedState> {
    const sourceBranch =
      this.#options.sourceBranch ?? (await promptSourceBranch(state.branches))

    const invalid = validateSource(state, sourceBranch)
    if (invalid) return invalid

    this.#spin(`Scanning changes from ${sourceBranch}...`)
    const candidates = await getDiffBetweenBranches(
      state.currentBranch,
      sourceBranch,
    )
    this.#stop(`Found ${candidates.length} file(s) to consider`)

    return selectSource(state, sourceBranch, candidates)
  }

  #spin(message: string) {
    this.#spinner.start(message)
  }
  #stop(message: string) {
    this.#spinner.stop(message)
  }
}

// -- Module-private helpers (no instance state needed) --

async function pickFiles(
  state: NeedsFileSelectionState,
): Promise<PlanReadyState | AbortedState> {
  const filesToCopy = await promptFilesToCopy(state.candidates)
  return selectFiles(state, filesToCopy)
}

function failed(state: FilePickState): state is AbortedState {
  return state.phase === 'aborted'
}

function abort(state: AbortedState): never {
  showOutro(pc.red(state.reason))
  exitProcessWithCode(1)
}
