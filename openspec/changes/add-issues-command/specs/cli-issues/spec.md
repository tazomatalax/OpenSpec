# cli-issues Delta

## ADDED Requirements

### Requirement: Top-level issues command

The CLI SHALL provide a top-level `openspec issues [change-id]` command for managing GitHub issues associated with OpenSpec changes.

#### Scenario: Display help text

- **WHEN** executing `openspec issues --help`
- **THEN** the CLI SHALL display usage information, available flags, and examples

### Requirement: Smart default behavior

The `issues` command SHALL automatically determine whether to create or update a GitHub issue based on the presence of `openspec/changes/<change-id>/issues.json`.

#### Scenario: Create issue when issues.json is missing

- **GIVEN** a valid change exists at `openspec/changes/add-feature/`
- **AND** no `issues.json` file exists in that directory
- **WHEN** executing `openspec issues add-feature`
- **THEN** the CLI SHALL create a new GitHub issue with content from `proposal.md` and tasks from `tasks.md`
- **AND** SHALL write issue metadata to `openspec/changes/add-feature/issues.json`

#### Scenario: Update issue when issues.json exists

- **GIVEN** a valid change exists at `openspec/changes/add-feature/`
- **AND** an `issues.json` file exists with issue metadata
- **WHEN** executing `openspec issues add-feature`
- **THEN** the CLI SHALL fetch the current GitHub issue body
- **AND** SHALL replace the tasks section with freshly rendered content from `tasks.md`
- **AND** SHALL preserve all content outside the tasks markers

### Requirement: Dry-run mode

The `issues` command SHALL support a `--dry-run` flag that previews planned operations without making changes to GitHub.

#### Scenario: Dry-run for create operation

- **GIVEN** a change exists with no `issues.json`
- **WHEN** executing `openspec issues add-feature --dry-run`
- **THEN** the CLI SHALL parse `proposal.md` and `tasks.md`
- **AND** SHALL display a formatted preview of the issue title and body
- **AND** SHALL NOT create a GitHub issue
- **AND** SHALL NOT write `issues.json`

#### Scenario: Dry-run for update operation

- **GIVEN** a change exists with an `issues.json` file
- **WHEN** executing `openspec issues add-feature --dry-run`
- **THEN** the CLI SHALL display what would be updated in the GitHub issue
- **AND** SHALL NOT modify the GitHub issue

### Requirement: JSON output mode

The `issues` command SHALL support a `--json` flag that outputs structured data instead of human-readable text.

#### Scenario: JSON output for planned issue

- **WHEN** executing `openspec issues add-feature --dry-run --json`
- **THEN** the CLI SHALL output a JSON object with fields:
  - `changeId`: string
  - `title`: string (issue title)
  - `bodySummary`: string (from proposal.md)
  - `tasks`: array of `{ key?: string, text: string, checked: boolean }`
  - `operation`: "create" or "update"

### Requirement: Explicit mode flags

The `issues` command SHALL support `--create` and `--update` flags to override the smart default behavior.

#### Scenario: Force create with explicit flag

- **GIVEN** a change exists with an `issues.json` file (issue already created)
- **WHEN** executing `openspec issues add-feature --create`
- **THEN** the CLI SHALL inform the user that an issue already exists
- **AND** SHALL NOT create a duplicate issue
- **AND** SHALL exit with code 1

#### Scenario: Force update with explicit flag

- **GIVEN** a change exists with no `issues.json` file
- **WHEN** executing `openspec issues add-feature --update`
- **THEN** the CLI SHALL inform the user that no issue has been created yet
- **AND** SHALL suggest running without `--update` or with `--create`
- **AND** SHALL exit with code 1

### Requirement: Comment on issues

The `issues` command SHALL support a `--comment` option to post a comment on the GitHub issue associated with a change.

#### Scenario: Post comment to existing issue

- **GIVEN** a change exists with an `issues.json` file
- **WHEN** executing `openspec issues add-feature --comment "Deployed to staging"`
- **THEN** the CLI SHALL post the comment to the associated GitHub issue
- **AND** SHALL display a confirmation message with the comment URL

#### Scenario: Comment fails when no issue exists

- **GIVEN** a change exists with no `issues.json` file
- **WHEN** executing `openspec issues add-feature --comment "test"`
- **THEN** the CLI SHALL inform the user that no issue has been created yet
- **AND** SHALL suggest running the command without `--comment` first
- **AND** SHALL exit with code 1

### Requirement: Issues metadata file

The CLI SHALL create and maintain an `issues.json` file in each change directory to track associated GitHub issues.

#### Scenario: issues.json structure

- **GIVEN** an issue is successfully created for a change
- **THEN** the CLI SHALL write an `issues.json` file with fields:
  - `version`: number (schema version, currently 1)
  - `provider`: string ("github")
  - `owner`: string (GitHub org or user)
  - `repo`: string (repository name)
  - `parent`: object with `{ number: number, url: string, title: string }`
  - `createdAt`: string (ISO 8601 timestamp)
  - `closedAt`: string or null (ISO 8601 timestamp when closed)

### Requirement: Task block markers

The CLI SHALL use HTML comment markers to delimit the tasks section in GitHub issue bodies.

#### Scenario: Render tasks with markers

- **WHEN** rendering an issue body for creation or update
- **THEN** the tasks section SHALL be wrapped in:
  - Start marker: `<!-- openspec-tasks:start -->`
  - End marker: `<!-- openspec-tasks:end -->`
- **AND** the tasks SHALL be rendered as markdown checklist items between the markers

#### Scenario: Preserve content outside markers

- **GIVEN** a GitHub issue with content before and after the tasks block
- **WHEN** updating the issue with `openspec issues <change-id>`
- **THEN** the CLI SHALL replace only the content between markers
- **AND** SHALL preserve all content before the start marker
- **AND** SHALL preserve all content after the end marker

### Requirement: Error handling for missing change

The `issues` command SHALL validate that the specified change exists before attempting any operations.

#### Scenario: Change does not exist

- **WHEN** executing `openspec issues nonexistent-change`
- **THEN** the CLI SHALL display an error message indicating the change was not found
- **AND** SHALL suggest running `openspec list` to see available changes
- **AND** SHALL exit with code 1

### Requirement: Error handling for missing GitHub configuration

The `issues` command SHALL check for GitHub configuration before attempting to create or update issues.

#### Scenario: GitHub config missing

- **GIVEN** no GitHub configuration exists in `openspec/config.json` or `openspec/project.md`
- **WHEN** executing `openspec issues add-feature` (without `--dry-run`)
- **THEN** the CLI SHALL display an error message indicating missing GitHub configuration
- **AND** SHALL provide instructions for configuring GitHub (owner, repo)
- **AND** SHALL exit with code 1

### Requirement: Error handling for GitHub API failures

The `issues` command SHALL handle failures from the GitHub API gracefully with clear error messages.

#### Scenario: Missing GitHub token

- **WHEN** no GitHub token is configured (env var or config file)
- **THEN** the CLI SHALL display an error with setup instructions
- **AND** SHALL suggest setting GITHUB_TOKEN environment variable or adding to config.json
- **AND** SHALL include a link to GitHub token creation page
- **AND** SHALL exit with code 1

#### Scenario: Authentication failure

- **WHEN** the GitHub API returns 401 Unauthorized
- **THEN** the CLI SHALL display an error indicating the token is invalid
- **AND** SHALL suggest checking token validity and required scopes (repo access)
- **AND** SHALL exit with code 1

#### Scenario: Repository not found

- **WHEN** the GitHub API returns 404 Not Found
- **THEN** the CLI SHALL display an error indicating the repository is not accessible
- **AND** SHALL suggest verifying the owner/repo configuration and token permissions
- **AND** SHALL exit with code 1

#### Scenario: Rate limit exceeded

- **WHEN** the GitHub API returns 403 with rate limit headers
- **THEN** the CLI SHALL display an error with rate limit reset time
- **AND** SHALL suggest using a personal access token for higher limits
- **AND** SHALL exit with code 1

### Requirement: Hybrid integration strategy

The system SHALL support two complementary workflows for GitHub issue management: CLI path (Octokit) and LLM path (MCP).

#### Scenario: CLI path via Octokit

- **WHEN** running `openspec issues` commands directly
- **THEN** the CLI SHALL use Octokit to call GitHub REST API
- **AND** SHALL require GitHub token via GITHUB_TOKEN env var or config.json

#### Scenario: LLM path via MCP

- **GIVEN** a user has an LLM with GitHub MCP access
- **WHEN** the user issues natural language commands like "Create GitHub issues for add-foo"
- **THEN** the LLM MAY orchestrate issue operations by:
  - Reading proposal.md and tasks.md directly
  - Calling GitHub MCP tools (mcp_github_github_issue_write, mcp_github_github_issue_read, etc.)
  - Writing issues.json with the same format as the CLI path
- **AND** SHALL NOT require token configuration (MCP handles auth)

#### Scenario: Interoperability between paths

- **GIVEN** issues were created via either CLI or LLM path
- **WHEN** the other path attempts to update or close those issues
- **THEN** both paths SHALL recognize the existing issues.json
- **AND** SHALL operate on the same GitHub issue
- **AND** SHALL maintain compatible metadata format

### Requirement: GitHub API integration via Octokit

The CLI SHALL use the Octokit library to interact with the GitHub REST API for all issue operations when running as a standalone command.

#### Scenario: Create issue via Octokit

- **WHEN** creating a GitHub issue for a change
- **THEN** the CLI SHALL call `octokit.rest.issues.create()` with:
  - `owner` and `repo` from GitHub configuration
  - `title` formatted as "[OpenSpec] {changeId}: {proposalTitle}"
  - `body` rendered from proposal.md and tasks.md with task markers
  - `labels` from GitHub configuration defaultLabels
- **AND** SHALL extract issue number and URL from the response

#### Scenario: Fetch issue via Octokit

- **WHEN** updating an existing issue
- **THEN** the CLI SHALL call `octokit.rest.issues.get()` with:
  - `owner`, `repo`, and `issue_number` from issues.json
- **AND** SHALL extract the body field from the response

#### Scenario: Update issue body via Octokit

- **WHEN** synchronizing tasks with GitHub
- **THEN** the CLI SHALL call `octokit.rest.issues.update()` with:
  - `owner`, `repo`, and `issue_number` from issues.json
  - `body` with updated tasks section between markers

#### Scenario: Post comment via Octokit

- **WHEN** posting a comment to an issue
- **THEN** the CLI SHALL call `octokit.rest.issues.createComment()` with:
  - `owner`, `repo`, and `issue_number` from issues.json
  - `body` containing the user-provided comment text
- **AND** SHALL display the comment URL on success

#### Scenario: Close issue via Octokit

- **WHEN** closing an issue (e.g., on archive)
- **THEN** the CLI SHALL call `octokit.rest.issues.update()` with:
  - `owner`, `repo`, and `issue_number` from issues.json
  - `state: "closed"`
  - `state_reason: "completed"`
