# gitx – Extended Git Operations

`gitx` is an ever-evolving collection of extension commands to git.

```bash
gitx help # show help
gitx file-pick # interactively pick files from another branch
```

## Installation

With NPM:

```bash
npm install -g gitx
```

With PNPM:

```bash
pnpm install -g gitx
```

With Homebrew:

```bash
brew install gitx
```

## Usage

```bash
# show help
gitx help

# show version
gitx --version
```

## Commands

### `file-pick`

Interactively select files from another branch and copy them into the current branch as unstaged changes.
Unlike `git cherry-pick`, this command works on files, not commits.
This is all done via a TUI (Terminal User Interface), with interactive file selection.
It works only for local branches!

1. The program must be run while on an active branch (not detached HEAD).
2. Unless a source branch is provided via `--source`, the user is prompted to select a local source branch.
   Type-ahead is used to filter all local branches. Enter selects the branch.
3. The current branch is the destination. Files are copied as unstaged changes.
4. The user is prompted to select files to copy from the source branch.
   Type-ahead is used to filter all files. Space toggles selection. Enter confirms selection.
5. A final confirmation screen lists the operations and asks for `[Y/n]` confirmation.

#### Examples

```bash
# Pick files from a branch you interactively select into the current branch
gitx file-pick
```

```bash
# Pick files from the source branch into the current branch
gitx file-pick -s source-branch
gitx file-pick --source source-branch
```
