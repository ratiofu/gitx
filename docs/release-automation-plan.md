# Proper CI-Driven Releases for `gitx`

## Summary

- Use `release-please` as the single release engine. Keep the GitHub App authentication approach from `main`, keep the CI/setup improvements from this branch, and discard the PAT-based regression.
- Make release automation run on every push to `main`, with the release PR remaining the final manual approval point. After the release PR is merged, the same workflow should build and publish automatically.
- Enforce releasable metadata in CI by requiring conventional PR titles and squash merges, so release notes come from predictable merged commits. `release-please` is designed around Conventional Commits and release PRs.

## Implementation Changes

- Rebase the release implementation on `main`, not this branch.
  Keep from `main`: GitHub App token flow for release automation, current package/bin shape, and any post-release-fix work already merged.
  Bring over from this branch: composite setup action, PR workflow structure, commitlint config, pinned-action maintenance, and `pnpm` CI helpers.
- Replace both existing release workflow variants with one unified workflow:
  `on.push.branches = [main]`
  generate a GitHub App token
  run `googleapis/release-please-action` with `release-type: node`
  if `release_created == true`, checkout, setup Node/pnpm, run `pnpm build-ci`, run a package dry-run sanity check, then `npm publish`
  keep `contents: write` and `pull-requests: write`; add concurrency so only one release job runs per branch
- Keep publication in the workflow, not in `release-please`.
  `release-please` does changelog/version/tag/release management; the workflow owns npm publication.
- Add CI enforcement for release-note input:
  add a PR-title conventional-commit check to the PR workflow
  require squash merge in repo settings
  document allowed prefixes (`feat`, `fix`, breaking-change forms, and any repo-specific extras you choose)
- Tighten the published package:
  add a `files` allowlist in `package.json`
  include only runtime artifacts and metadata needed for consumers, such as `dist/`, `bin/`, `README.md`, `LICENSE`, and optionally `CHANGELOG.md`
  exclude repo-only material such as `.github/`, `requirements/`, `src/`, tests, and local tool files
- Add release recovery handling for the already-broken state:
  inspect the current GitHub release/tag/npm state for `1.0.0`
  if a stale `autorelease: pending` or `autorelease: triggered` label exists on the last release PR, clear it before re-running automation; release-please documents that stale labels can block new release PRs.
  if the old release PR merged but publish never happened, fix the workflow first and then cut the next release from `main` instead of hand-maintaining two release systems

## Test Plan

- Workflow behavior:
  push a non-releasable commit to `main` and confirm no new release PR is created
  push a `feat:` or `fix:` change to `main` and confirm the release PR is created or updated with expected notes
  merge the release PR and confirm the publish steps run automatically on the resulting `main` push
- CI enforcement:
  open a PR with a non-conventional title and confirm the PR-title check fails
  open a PR with a valid conventional title and confirm normal PR checks pass
- Package correctness:
  run `npm pack --dry-run --ignore-scripts --json --cache /tmp/npm-cache` in CI
  assert the tarball contains runtime files only and excludes repo-internal material
- Recovery:
  verify the repo ends with a clean release state: no stale autorelease labels, a release tag on GitHub, a GitHub Release, and a published npm version for the same release

## Assumptions

- Release PR merge stays manual; publish after merge is automatic.
- GitHub App auth is preferred over a user PAT for repository automation.
- Release notes should be derived from squash-merged conventional PR titles, not from ad hoc commit history.
- No changesets will be introduced; single-package `release-please` remains the release mechanism.
