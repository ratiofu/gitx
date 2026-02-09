# gitx – Extended Git Operations

`gitx` is an ever-evolving collection of extension commands to git.

```bash
gitx help # show help
gitx split-branch # interactively split files from one branch to another
```

## Installation

With NPM:

```bash
# install gitx
npm install -g gitx
```

With PNPM:

```bash
# install gitx
pnpm install -g gitx
```

With Homebrew:

```bash
# install gitx
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

### `split-branch`

Interactively select files from one branch and copy them to a different branch.
Optionally, remove the selected files from the source branch.
Unlike `git cherry-pick`, this command works on files, not commits.
This is all done via a TUI (Terminal User Interface), with interactive file selection.
It works only for local branches!

1. Unless a source branch is provided, the user is prompted to select a local source branch.
   Type-ahead is used to filter all local branches. Enter selects the branch.
2. Unless a destination branch is provided, the current branch is considered the destination branch.
3. The user is prompted to select files to copy from the source branch to the destination branch.
   Type-ahead is used to filter all files. Space toggles selection. Enter confirms selection.
4. The user is prompted to select which of the selected files to remove from the source branch, one at a time
   Type-ahead is used to filter all files. Space toggles selection. Enter confirms selection.
5. A final confirmation screen lists the files and asks for `[Y/n]` confirmation. Enter, `y`, or `Y` accepts the changes. Any other key aborts the operation.

#### Examples

```bash
# Split files from a branch you interactively select into the current branch
gitx split-branch
```

```bash
# Split files from the source branch into the current branch
gitx split-branch -s source-branch
gitx split-branch --source source-branch
```

```bash
# Split files from the current branch into the destination branch
gitx split-branch -d destination-branch
gitx split-branch --destination destination-branch
```

```bash
# Split files from the source branch into the destionation branch
gitx split-branch -s source-branch -d destination-branch
gitx split-branch --source source-branch --destination destination-branch
```
