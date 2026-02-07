# Implementation Plan - gitx

Build a Node.js-based CLI tool `gitx` that provides extended Git operations, starting with `split-branch`.

## User Review Required

> [!IMPORTANT]
> **Requirements DSL**: We are using **Gherkin (Cucumber)** to formally define requirements in `.feature` files, located in `requirements/`. These will drive our integration tests.

## Architecture: Functional Core, Imperative Shell

The app will be structured to separate side effects (Git, FS, User Input) from logic.

### Directory Structure

```text
src/
├── core/              # PURE functions only. No side effects.
│   ├── models.ts      # Types (File, Branch, Selection)
│   ├── logic.ts       # Filtering, State transitions
│   └── logic.test.ts  # Vitest unit tests
├── shell/             # IMPERATIVE. Git, TUI, Process.
│   ├── git.ts         # Git executable wrappers
│   ├── tui.ts         # wrapper around @clack/prompts
│   └── commands/      # Citty command definitions
│       └── split-branch/
│           ├── index.ts
│           └── index.test.ts # Integration tests (Gherkin runner)
├── requirements/      # Gherkin .feature files (Symlinked or copied from root)
├── index.ts           # Entry point
└── ...
```

## Requirements Engineering

Behavior requirements in `requirements/split-branch.feature`.

## Detailed Implementation Tasks

### Phase 1: Foundation

1.a **Project Initialization**: ✅ Complete
1.b **Test Infrastructure**:
    - Setup Vitest.
    - Create a "Git Test Rig" helper in `src/test/git-rig.ts` that allows creating temp repos, making commits, and switching branches programmatically for tests.

### Phase 2: Core Logic (Pure)

2.a **Core Models**: Define types in `src/core/models.ts` (`GitFile`, `Branch`, `SplitOperation`).
2.b **Diff Logic**: Implement `parseDiff(rawOutput: string): GitFile[]` in `src/core/git-parsing.ts`.
2.c **Selection Logic**: Implement `computeOperations(selection, options): Command[]` in `src/core/logic.ts` that takes a user selection and returns a list of abstract Git commands to run.

### Phase 3: Shell & Command (Imperative)

3.a **Git Wrappers**: Implement `src/shell/git.ts` using `execa` to run arbitrary git commands.
3.b **TUI Wrappers**: Implement `src/shell/tui.ts` using `@clack/prompts` to ask for branch names and file selections.
3.c **Command wiring**: Implement `src/shell/commands/split-branch/index.ts`.
    - Connect TUI to specific Git Wrappers.
    - Wire up the Core Logic to transform data.

### Phase 4: Verification

4.a **Integration Tests**: Write `src/shell/commands/split-branch/index.test.ts` that parses `requirements/split-branch.feature` and runs them against the `Git Test Rig`.

## Verification Plan

### Automated Tests

- **Unit**: Verify `parseDiff` and `computeOperations` with standard Vitest unit tests.
- **Integration**: Verify the full CLI flow using the Gherkin feature files.
