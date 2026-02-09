Feature: Split Branch
  As a developer
  I want to interactively move files between branches
  So that I can organize my work and clean up feature branches

  Background:
    Given I have a git repository
    And I have a branch "main" with a file "base.txt"

  Scenario: Copying files to a new branch
    Given I am on branch "feature-a"
    And I have committed "feature-file.txt"
    When I run "gitx split-branch --destination feature-b"
    And I select "feature-a" as the source branch
    And I select "feature-file.txt" to copy
    Then a branch "feature-b" exists
    And the branch "feature-b" contains "feature-file.txt"
    And the file "feature-file.txt" in "feature-b" matches the source content

  Scenario: Copying files to the current branch (unstaged)
    Given I am on branch "feature-a"
    And I have a branch "feature-b" with committed "feature-b-file.txt"
    When I run "gitx split-branch --source feature-b"
    And I select "feature-b-file.txt" to copy
    Then the file "feature-b-file.txt" exists in the worktree
    And the file "feature-b-file.txt" is NOT staged
    And the file "feature-b-file.txt" is NOT committed in "feature-a"

  Scenario: Removing files from source after copy
    Given I am on branch "feature-a" created from "main"
    And I have committed "wip.txt"
    When I run "gitx split-branch --destination feature-b"
    And I select "wip.txt" to copy
    And I select "wip.txt" to remove from source
    Then the branch "feature-b" contains "wip.txt"
    And the file "wip.txt" is staged for deletion in "feature-a"

  Scenario: Handling dirty working directory (pass-through)
    Given I am on branch "feature-a"
    And I have modified "dirty.txt"
    When I run "gitx split-branch --destination feature-b"
    Then the command fails with error "Working directory matches destination. Please commit or stash changes."

  Scenario: Creating destination branch with prompt
    Given I am on branch "feature-a"
    When I run "gitx split-branch --destination non-existent-branch"
    And I confirm creating the branch
    Then the branch "non-existent-branch" exists
    And the branch "non-existent-branch" is created from "feature-a"

  Scenario: Source Branch Selection (Interactive)
    Given I am on branch "feature-a"
    And I have branches "feature-b", "main"
    When I run "gitx split-branch"
    And I am prompted to select a source branch
    And the default source branch is "feature-a"
    And I select "feature-a" as the source branch
    Then I am prompted to select a destination branch

  Scenario: Source Branch Validation (Error)
    Given I am on branch "feature-a"
    When I run "gitx split-branch --source non-existent-branch"
    Then the command fails with error "Source branch 'non-existent-branch' does not exist."

  Scenario: File Selection UI (Tree View)
    Given I am on branch "feature-a"
    And I have a branch "feature-b" with files:
      | src/components/Button.tsx |
      | src/components/Card.tsx   |
      | src/utils/helper.ts       |
    When I run "gitx split-branch --source feature-b"
    And the file selection tree is displayed:
      | ○ src/                      |
      | ○   components/             |
      | ○     Button.tsx            |
      | ○     Card.tsx              |
      | ○   utils/                  |
      | ○     helper.ts             |
    And I select "src/components/"
    Then "src/components/Button.tsx" is selected
    And "src/components/Card.tsx" is selected
    And "src/utils/helper.ts" is NOT selected
