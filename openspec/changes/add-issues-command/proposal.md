# Add Issues Command

## Why

OpenSpec tracks change proposals, specs, and tasks inside the repository (`openspec/changes/` and `openspec/specs/`), ensuring that specifications remain the source of truth for what's planned and built. However, many teams rely on GitHub Issues for work tracking, visibility, and integration with project management workflows. Today, these two systems exist independently, forcing manual reconciliation and creating risk that GitHub Issues drift away from the actual specs and task lists defined in OpenSpec.

We need a frictionless, repeatable way to project each OpenSpec change into a corresponding GitHub issue so that:

- Work can be managed using GitHub's native UI, notifications, labels, and automations.
- The issue's task checklist always reflects the current state of `tasks.md` for a change.
- OpenSpec remains the authoritative source of truth, with GitHub issues serving as a derived, synchronized view.

## What Changes

- **Add a hybrid GitHub integration** supporting two complementary workflows:

  1. **CLI path (Octokit):** Direct `openspec issues` commands for scripting, CI/CD, and deterministic workflows
  2. **LLM path (MCP):** Natural language prompts for zero-config, chat-driven workflows

- Add a new top-level `openspec issues` CLI command that:

  - Parses a change's `proposal.md` and `tasks.md`.
  - Generates a single parent GitHub issue per change with all tasks rendered as a markdown checklist in the issue body.
  - Uses a **smart default behavior**:
    - On first run: creates the GitHub issue and writes tracking metadata to `openspec/changes/<change-id>/issues.json`.
    - On subsequent runs: updates the issue's task checklist to match the current `tasks.md`.
  - Supports explicit modes via flags: `--dry-run`, `--create`, `--update`, `--comment`, and `--json`.

- Track issue metadata per change in `openspec/changes/<change-id>/issues.json`, including:

  - GitHub issue number, URL, and title.
  - Repository owner and repo name.
  - Timestamps for creation and (optionally) closing.

- Introduce minimal GitHub configuration for OpenSpec projects:

  - `github.owner` and `github.repo` (inferred from `git remote` or prompted once).
  - Optional `github.defaultLabels` for issues created by OpenSpec.
  - Stored in `openspec/config.json` or as a section within `openspec/project.md`.

- Optionally integrate with existing workflow commands:

  - `openspec validate <change-id> --create-issues` creates a GitHub issue after successful validation.
  - `openspec archive <change-id>` closes the associated GitHub issue when a change is archived.
  - `openspec issues <change-id> --comment "..."` posts a comment on the change's parent issue.

## Impact

- **New capability:** `cli-issues` will be added under `openspec/specs/cli-issues/spec.md`.
- **CLI entrypoint:** A new `issues [change-id]` command will be registered in `src/cli/index.ts`, wired to `src/commands/issues.ts`.
- **Core modules:** New code under `src/core/issues/` will handle:

  - Planning and parsing (`proposal.md`, `tasks.md` → structured plan).
  - Issue body rendering with tasks block markers (`<!-- openspec-tasks:start/end -->`).
  - GitHub REST API integration via Octokit for creating, updating, commenting on, and closing issues (CLI path).
  - Reading and writing `issues.json` per change (used by both CLI and LLM paths).
  
- **New dependency:** `@octokit/rest` for GitHub API integration with token-based authentication (CLI path only).

- **LLM orchestration:** When users prefer natural language, LLMs with GitHub MCP access can:

  - Read proposal/tasks files and call MCP tools directly (`mcp_github_github_issue_write`, `mcp_github_github_issue_read`, etc.).
  - Write `issues.json` with the same format as the CLI path for compatibility.
  - Provide zero-config experience (no token management required).

- **Spec updates:**

  - `cli-validate` spec will describe the optional `--create-issues` flag.
  - `cli-archive` spec will describe optional issue-closing behavior on archive.

- **Documentation:** README will include usage examples for the new `issues` command and clarify that GitHub issues are projections of OpenSpec changes, not a separate source of truth.
