# Implementation Tasks

## 1. Specs and Planning

- [x] 1.1 Add cli-issues capability spec at `openspec/specs/cli-issues/spec.md` with Purpose and initial requirements
- [x] 1.2 Define spec deltas for `cli-validate` to describe optional `--create-issues` behavior
- [x] 1.3 Define spec deltas for `cli-archive` to describe optional issue-closing behavior
- [x] 1.4 Add scenarios for `issues.json` tracking and tasks block synchronization semantics

## 2. Core Issues Module (Planning & Rendering)

- [x] 2.1 Create `src/core/issues/model.ts` with type definitions: `PlannedIssue`, `PlannedTask`, `IssuesMetadata`, `IssueRef`
- [x] 2.2 Implement `src/core/issues/planning.ts` with `planIssueFromChange(changeId, cwd)` to parse proposal.md and tasks.md
- [x] 2.3 Implement `src/core/issues/render.ts` with functions for:
  - [x] 2.3.1 `renderTasksSection(plan)` using `<!-- openspec-tasks:start/end -->` markers
  - [x] 2.3.2 `renderIssueBodyForCreate(plan, changeUrl)` for initial issue creation
  - [x] 2.3.3 `updateIssueBodyWithTasks(existingBody, plan)` to overwrite the tasks block in existing issues

## 3. issues.json Storage and GitHub Config

- [x] 3.1 Implement `src/core/issues/storage.ts` to read and write `issues.json` under each change directory
- [x] 3.2 Design and document minimal GitHub configuration structure (owner, repo, default labels)
- [x] 3.3 Extend `openspec init` or add a small configurator to create and update GitHub config for a project

## 4. GitHub Bridge and Service Layer

- [x] 4.1 Add Octokit dependency to package.json (`@octokit/rest`)
- [x] 4.2 Implement `src/core/issues/github-bridge.ts` integrating with GitHub REST API via Octokit:
  - [x] 4.2.1 Initialize Octokit with token from GITHUB_TOKEN env var or config.json
  - [x] 4.2.2 `createIssue({ owner, repo, title, body, labels }): Promise<IssueRef>` using `octokit.rest.issues.create()`
  - [x] 4.2.3 `getIssue(ref): Promise<Issue>` using `octokit.rest.issues.get()`
  - [x] 4.2.4 `updateIssueBody(ref, body): Promise<void>` using `octokit.rest.issues.update()`
  - [x] 4.2.5 `commentOnIssue(ref, body): Promise<string>` using `octokit.rest.issues.createComment()`, return comment URL
  - [x] 4.2.6 `closeIssue(ref): Promise<void>` using `octokit.rest.issues.update()` with `state: "closed"`
  - [x] 4.2.7 Add error handling for missing token, auth failures, 404s, rate limits
- [x] 4.3 Implement `src/core/issues/service.ts` with high-level functions:
  - [x] 4.2.1 `createIssuesForChange(changeId, options)`
  - [x] 4.2.2 `updateIssuesForChange(changeId, options)`
  - [x] 4.2.3 `commentOnChangeIssues(changeId, message, options)`
  - [x] 4.2.4 `closeIssuesForChange(changeId, options)`

## 5. CLI Integration (openspec issues)

- [x] 5.1 Create `src/commands/issues.ts` exposing `IssuesCommand` class
- [x] 5.2 Register new `issues [change-id]` command in `src/cli/index.ts` with options:
  - [x] 5.2.1 `--dry-run` flag
  - [x] 5.2.2 `--json` flag
  - [x] 5.2.3 `--create` flag
  - [x] 5.2.4 `--update` flag
  - [x] 5.2.5 `--comment <message>` option
- [x] 5.3 Implement smart default behavior in `IssuesCommand.execute`:
  - [x] 5.3.1 If `issues.json` is missing, behave like `--create`
  - [x] 5.3.2 If `issues.json` exists, behave like `--update`
- [x] 5.4 Ensure error messages are consistent with existing OpenSpec CLI patterns

## 6. Workflow Integration (validate & archive)

- [x] 6.1 Update `ValidateCommand` in `src/commands/validate.ts` to support `--create-issues`:
  - [x] 6.1.1 Only create issues when validation passes
  - [x] 6.1.2 Respect `--no-interactive` and CI usage
- [x] 6.2 Update `ArchiveCommand` in `src/core/archive.ts` to call `closeIssuesForChange` after successful archive
- [x] 6.3 Add support for `openspec issues <change-id> --comment "..."` using `commentOnChangeIssues`

## 7. Tests and Documentation

- [ ] 7.1 Add core tests under `test/core/issues/` for planning, rendering, storage, and service logic
- [ ] 7.2 Add CLI tests under `test/commands/` or `test/cli-e2e/` for the new `issues` command
- [x] 7.3 Update README.md with:
  - [x] 7.3.1 `openspec issues` command usage examples
  - [x] 7.3.2 Explanation that GitHub issues are projections of OpenSpec changes
- [x] 7.4 Confirm `openspec validate add-issues-command --strict` passes before marking implementation complete
