Feature: Split Branch
  As a developer
  I want to interactively move files between branches
  So that I can organize my work and clean up feature branches

  Background:
    Given I have a git repository
    And I have a branch "main" with a file "base.txt"

  Scenario: Copying files to a new branch (Interactive)
    Given I am on branch "feature-a"
    And I have committed "feature-file.txt"
    When I run "gitx split-branch"
    And I select "feature-b" as the destination branch
    And I select "feature-a" as the source branch
    And I select "feature-file.txt" to copy
    Then a branch "feature-b" exists
    And the branch "feature-b" contains "feature-file.txt"

  Scenario: Destination branch excluded from source options
    Given I am on branch "feature-a"
    And I have a branch "feature-b"
    When I run "gitx split-branch -d ."
    Then I am prompted to select a source branch
    And "feature-a" is NOT in the source branch options
    And "feature-b" is in the source branch options

  Scenario: No available source branches
    Given I have a git repository with only branch "main"
    When I run "gitx split-branch -d ."
    Then the command exits with error "No other branches available to copy from."

  Scenario: Using "." alias for source
    Given I am on branch "feature-a"
    When I run "gitx split-branch -s ."
    Then I am prompted to select a destination branch
    And the source branch is determined to mean "feature-a"

  Scenario: Copying files to the current branch (picking from another branch)
    Given I am on branch "main"
    And I have a branch "feature-b" with committed "feature-b-file.txt"
    When I run "gitx split-branch -d ."
    And I select "feature-b" as the source branch
    And I select "feature-b-file.txt" to copy
    Then the file "feature-b-file.txt" exists in the worktree
    And the file "feature-b-file.txt" is unstaged

  Scenario: Removing files from current source after copy (Interactive)
    Given I am on branch "feature-a" created from "main"
    And I have committed "wip.txt"
    When I run "gitx split-branch"
    And I select "feature-b" as the destination branch
    And I select "feature-a" as the source branch
    And I select "wip.txt" to copy
    And I select "wip.txt" to remove from source
    Then the branch "feature-b" contains "wip.txt"
    And the file "wip.txt" is unstaged for deletion in "feature-a"

  Scenario: Removing files from other source after copy (Interactive)
    Given I am on branch "main"
    And I have committed "wip.txt" on branch "feature-a"
    When I run "gitx split-branch"
    And I select "feature-b" as the destination branch
    And I select "feature-a" as the source branch
    And I select "wip.txt" to copy
    And I select "wip.txt" to remove from source
    Then the branch "feature-b" contains "wip.txt"
    And a commit exists in "feature-a" that removes "wip.txt"

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
