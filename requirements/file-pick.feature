Feature: File Pick
  As a developer
  I want to interactively pick files from another branch into my current branch
  So that I can selectively bring in changes without cherry-picking entire commits

  Background:
    Given I have a git repository
    And I have a branch "main" with a file "base.txt"

  Scenario: Picking files from another branch (Interactive)
    Given I am on branch "main"
    And I have a branch "feature-a" with committed "feature-file.txt"
    When I run "gitx file-pick"
    And I select "feature-a" as the source branch
    And I select "feature-file.txt" to copy
    And I select no files to delete from source
    And I confirm the plan
    Then the file "feature-file.txt" exists in the worktree
    And the file "feature-file.txt" is unstaged

  Scenario: Picking files with --source flag
    Given I am on branch "main"
    And I have a branch "feature-a" with committed "feature-file.txt"
    When I run "gitx file-pick --source feature-a"
    Then I am NOT prompted to select a source branch
    And I am prompted to select files to copy

  Scenario: Source Branch Validation (Error)
    Given I am on branch "main"
    And I have a branch "feature-a"
    When I run "gitx file-pick --source non-existent-branch"
    Then the command exits with error "Source branch 'non-existent-branch' does not exist."

  Scenario: No available source branches
    Given I have a git repository with only branch "main"
    When I run "gitx file-pick"
    Then the command exits with error "No other branches available to pick files from."

  Scenario: Exit on detached HEAD
    Given I am in detached HEAD state
    When I run "gitx file-pick"
    Then the command exits with error "Not on an active branch (detached HEAD)"

  Scenario: No differences between branches
    Given I am on branch "main"
    And I have a branch "identical" that is identical to "main"
    When I run "gitx file-pick --source identical"
    Then the command exits with error "No differences found"

  Scenario: File Selection UI (Tree View)
    Given I am on branch "main"
    And I have a branch "feature-b" with files:
      | src/components/Button.tsx |
      | src/components/Card.tsx   |
      | src/utils/helper.ts       |
    When I run "gitx file-pick --source feature-b"
    And the file selection tree is displayed:
      | src/                      |
      |   components/             |
      |     Button.tsx            |
      |     Card.tsx              |
      |   utils/                  |
      |     helper.ts             |
    And I select "src/components/"
    Then "src/components/Button.tsx" is selected
    And "src/components/Card.tsx" is selected
    And "src/utils/helper.ts" is NOT selected
