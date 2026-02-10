# Agent Guidelines for gitx

## Project Philosophy

`gitx` extends Git with complex workflows, prioritizing developer experience.
The codebase follows a **Functional Core, Imperative Shell** architecture.

## Architecture & Patterns

- **Functional Core**: Business logic and state transitions should be pure and testable. Avoid side effects in core modules.
- **Imperative Shell**: Handles I/O, user interaction (TUI), and executing Git commands. This is where side effects live.
- **Command Structure**: Commands are defined using `citty` and typically encapsulated in a class to manage execution flow.
- **State Management**: Complex commands use state machines to manage transitions (e.g., see `file-pick-state.ts` as an example).

## Development Guidelines

### Package Management

- Use `pnpm` for all operations.

### Security & CI

- **Pinned Actions**: In GitHub Actions workflows, always pin actions to a specific commit SHA.
  - **Source of Truth**: Maintain the list of actions in `.github/update-action-pins.sh`, then run it.
  - **Reference**: Use the commit hashes from `.github/action-pinned-commits.yaml` in your workflows.
  - **Reason**: This prevents supply chain attacks if a tag is overwritten.
- **Tools**: Use `simple-git-hooks` for managing Git hooks to ensure consistent developer checks.

### Code Quality

- **Linting & Formatting**: Follow Biome configuration (strict rules, 2-space indent, no default exports).
- **Type Safety**: TypeScript strict mode is enabled. Avoid `any`.
- **Testing**:
  - Use `vitest` for writing tests.
  - Prefer co-located tests (e.g., `feature.test.ts` next to `feature.ts`).
  - Mock side effects (like git execution) when testing shell logic.
  - Use `vitest-mock-extended` for interface and dependency injection mocking.
  - Do not mock data classes–use concrete instances instead.

### Code Style

- Keep functions and classes small and focused.
- Prefer immutable data structures for state.
- Use explicit imports with file extensions (e.g., `.js`).
- Avoid excessive comments; code should be self-documenting.

## Verification

Before considering work complete, run:

- `pnpm quality`: Runs linting, typechecking, testing, and requirement checks in parallel.
