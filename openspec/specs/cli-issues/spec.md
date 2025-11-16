# cli-issues Specification# cli-issues Specification



## Purpose## Purpose



`cli-issues` enables OpenSpec to project each change proposal into a single GitHub issue, keeping the issue's task checklist synchronized with the change's `tasks.md` file. This bridges OpenSpec's repository-based planning with GitHub's issue tracking, notifications, and project management workflows, while maintaining OpenSpec as the source of truth.`cli-issues` enables OpenSpec to project each change proposal into a single GitHub issue, keeping the issue's task checklist synchronized with the change's `tasks.md` file. This bridges OpenSpec's repository-based planning with GitHub's issue tracking, notifications, and project management workflows, while maintaining OpenSpec as the source of truth.



## Requirements## Requirements



### Requirement: Issues command SHALL create or update GitHub issues with smart defaults### Requirement: Issues command SHALL create or update GitHub issues with smart defaults



The `openspec issues <change-id>` command SHALL synchronize a change with a GitHub issue using smart default behavior:The `openspec issues <change-id>` command SHALL synchronize a change with a GitHub issue using smart default behavior:



- If `openspec/changes/<change-id>/issues.json` does not exist, CREATE a new GitHub issue and write tracking metadata- If `openspec/changes/<change-id>/issues.json` does not exist, CREATE a new GitHub issue and write tracking metadata

- If `issues.json` exists, UPDATE the GitHub issue's task checklist to match current `tasks.md`- If `issues.json` exists, UPDATE the GitHub issue's task checklist to match current `tasks.md`



#### Scenario: Create issue on first run#### Scenario: Create issue on first run



- **WHEN** running `openspec issues add-foo` and `issues.json` does not exist- **WHEN** running `openspec issues add-foo` and `issues.json` does not exist

- **THEN** create a GitHub issue with:- **THEN** create a GitHub issue with:

  - Title: `[OpenSpec] add-foo: {summary from proposal.md}`  - Title: `[OpenSpec] add-foo: {summary from proposal.md}`

  - Body: Rendered from `proposal.md` (Why section) + tasks checklist from `tasks.md`  - Body: Rendered from `proposal.md` (Why section) + tasks checklist from `tasks.md`

  - Labels: Default labels from config (e.g., `["openspec"]`)  - Labels: Default labels from config (e.g., `["openspec"]`)

- **AND** write `openspec/changes/add-foo/issues.json` with issue number, URL, title, owner, repo, createdAt- **AND** write `openspec/changes/add-foo/issues.json` with issue number, URL, title, owner, repo, createdAt



#### Scenario: Update issue on subsequent runs#### Scenario: Update issue on subsequent runs



- **WHEN** running `openspec issues add-foo` and `issues.json` exists- **WHEN** running `openspec issues add-foo` and `issues.json` exists

- **THEN** fetch the existing GitHub issue body- **THEN** fetch the existing GitHub issue body

- **AND** replace content between `<!-- openspec-tasks:start -->` and `<!-- openspec-tasks:end -->` markers with freshly rendered tasks from `tasks.md`- **AND** replace content between `<!-- openspec-tasks:start -->` and `<!-- openspec-tasks:end -->` markers with freshly rendered tasks from `tasks.md`

- **AND** preserve all content outside the marker block- **AND** preserve all content outside the marker block



#### Scenario: Explicit dry-run mode#### Scenario: Explicit dry-run mode



- **WHEN** running `openspec issues add-foo --dry-run`- **WHEN** running `openspec issues add-foo --dry-run`

- **THEN** parse proposal and tasks, render issue body, display preview- **THEN** parse proposal and tasks, render issue body, display preview

- **AND** do NOT call GitHub API or write `issues.json`- **AND** do NOT call GitHub API or write `issues.json`



#### Scenario: Explicit create mode#### Scenario: Explicit create mode



- **WHEN** running `openspec issues add-foo --create`- **WHEN** running `openspec issues add-foo --create`

- **THEN** create GitHub issue even if `issues.json` already exists- **THEN** create GitHub issue even if `issues.json` already exists

- **AND** update `issues.json` with new issue metadata- **AND** update `issues.json` with new issue metadata



#### Scenario: Explicit update mode#### Scenario: Explicit update mode



- **WHEN** running `openspec issues add-foo --update`- **WHEN** running `openspec issues add-foo --update`

- **THEN** fail with error if `issues.json` does not exist- **THEN** fail with error if `issues.json` does not exist

- **AND** update existing GitHub issue if `issues.json` is found- **AND** update existing GitHub issue if `issues.json` is found



### Requirement: Tasks block markers SHALL enable safe partial overwrites### Requirement: Tasks block markers SHALL enable safe partial overwrites



The GitHub issue body SHALL include marker comments to delimit the OpenSpec-managed tasks section, allowing safe updates without destroying manual edits outside the marker block.The GitHub issue body SHALL include marker comments to delimit the OpenSpec-managed tasks section, allowing safe updates without destroying manual edits outside the marker block.



#### Scenario: Render tasks block with markers#### Scenario: Render tasks block with markers

- **WHEN** rendering issue body for create or update

- **WHEN** rendering issue body for create or update- **THEN** wrap the tasks checklist in HTML comments:

- **THEN** wrap the tasks checklist in HTML comments:```markdown

<!-- openspec-tasks:start -->

```markdown## Tasks

<!-- openspec-tasks:start -->

## Tasks- [ ] 1.1 Create database schema

- [x] 1.2 Implement API endpoint

- [ ] 1.1 Create database schema<!-- openspec-tasks:end -->

- [x] 1.2 Implement API endpoint```

<!-- openspec-tasks:end -->

```#### Scenario: Preserve content outside markers on update

- **WHEN** updating an issue where the body includes content before or after the marker block

#### Scenario: Preserve content outside markers on update- **THEN** retain all text outside `<!-- openspec-tasks:start -->` and `<!-- openspec-tasks:end -->`

- **AND** replace only the content between markers

- **WHEN** updating an issue where the body includes content before or after the marker block

- **THEN** retain all text outside `<!-- openspec-tasks:start -->` and `<!-- openspec-tasks:end -->`### Requirement: Issues metadata SHALL be tracked per change

- **AND** replace only the content between markers

Each change with a GitHub issue SHALL have an `issues.json` file at `openspec/changes/<change-id>/issues.json` containing:

### Requirement: Issues metadata SHALL be tracked per change- `version`: Metadata schema version (integer, currently 1)

- `provider`: Issue tracking provider (currently "github")

Each change with a GitHub issue SHALL have an `issues.json` file at `openspec/changes/<change-id>/issues.json` containing:- `owner`: GitHub repository owner

- `repo`: GitHub repository name

- `version`: Metadata schema version (integer, currently 1)- `parent`: Object with `number`, `url`, `title` for the parent GitHub issue

- `provider`: Issue tracking provider (currently "github")- `createdAt`: ISO 8601 timestamp when issue was created

- `owner`: GitHub repository owner- `closedAt`: ISO 8601 timestamp when issue was closed (null if open)

- `repo`: GitHub repository name

- `parent`: Object with `number`, `url`, `title` for the parent GitHub issue#### Scenario: Write issues.json on create

- `createdAt`: ISO 8601 timestamp when issue was created- **WHEN** creating a GitHub issue for change `add-foo`

- `closedAt`: ISO 8601 timestamp when issue was closed (null if open)- **THEN** write `openspec/changes/add-foo/issues.json`:

```json

#### Scenario: Write issues.json on create{

  "version": 1,

- **WHEN** creating a GitHub issue for change `add-foo`  "provider": "github",

- **THEN** write `openspec/changes/add-foo/issues.json`:  "owner": "myorg",

  "repo": "myrepo",

```json  "parent": {

{    "number": 123,

  "version": 1,    "url": "https://github.com/myorg/myrepo/issues/123",

  "provider": "github",    "title": "[OpenSpec] add-foo: Add Feature Foo"

  "owner": "myorg",  },

  "repo": "myrepo",  "createdAt": "2025-11-16T12:00:00Z",

  "parent": {  "closedAt": null

    "number": 123,}

    "url": "https://github.com/myorg/myrepo/issues/123",```

    "title": "[OpenSpec] add-foo: Add Feature Foo"

  },#### Scenario: Update closedAt on archive

  "createdAt": "2025-11-16T12:00:00Z",- **WHEN** closing the GitHub issue via `openspec archive add-foo`

  "closedAt": null- **THEN** update `issues.json` with `closedAt` timestamp

}

```### Requirement: GitHub configuration SHALL be minimal and auto-discoverable



#### Scenario: Update closedAt on archiveOpenSpec projects SHALL configure GitHub integration with minimal manual setup, inferring owner and repo from `git remote` where possible.



- **WHEN** closing the GitHub issue via `openspec archive add-foo`#### Scenario: Read GitHub config from config.json

- **THEN** update `issues.json` with `closedAt` timestamp- **WHEN** running `openspec issues <change-id>`

- **THEN** read `openspec/config.json` for:

### Requirement: GitHub configuration SHALL be minimal and auto-discoverable  - `github.owner`: Repository owner (e.g., "myorg")

  - `github.repo`: Repository name (e.g., "myrepo")

OpenSpec projects SHALL configure GitHub integration with minimal manual setup, inferring owner and repo from `git remote` where possible.  - `github.defaultLabels`: Optional array of labels (e.g., `["openspec"]`)

  - `github.token`: Optional token (if not using GITHUB_TOKEN env var)

#### Scenario: Read GitHub config from config.json

#### Scenario: Infer owner/repo from git remote

- **WHEN** running `openspec issues <change-id>`- **WHEN** `github.owner` or `github.repo` is missing from config

- **THEN** read `openspec/config.json` for:- **THEN** run `git remote -v` and parse the origin URL

  - `github.owner`: Repository owner (e.g., "myorg")- **AND** extract owner and repo from URL patterns like:

  - `github.repo`: Repository name (e.g., "myrepo")  - `https://github.com/myorg/myrepo.git`

  - `github.defaultLabels`: Optional array of labels (e.g., `["openspec"]`)  - `git@github.com:myorg/myrepo.git`

  - `github.token`: Optional token (if not using GITHUB_TOKEN env var)

#### Scenario: Fail with helpful error if config is incomplete

#### Scenario: Infer owner/repo from git remote- **WHEN** GitHub config cannot be determined

- **THEN** display error message:

- **WHEN** `github.owner` or `github.repo` is missing from config```

- **THEN** run `git remote -v` and parse the origin URLGitHub repository not configured. Add to openspec/config.json:

- **AND** extract owner and repo from URL patterns like:{

  - `https://github.com/myorg/myrepo.git`  "github": {

  - `git@github.com:myorg/myrepo.git`    "owner": "your-org",

    "repo": "your-repo"

#### Scenario: Fail with helpful error if config is incomplete  }

}

- **WHEN** GitHub config cannot be determined```

- **THEN** display error message:

### Requirement: GitHub authentication SHALL support token-based access

```

GitHub repository not configured. Add to openspec/config.json:The CLI SHALL authenticate with GitHub using a token from environment variables or configuration.

{

  "github": {#### Scenario: Use GITHUB_TOKEN environment variable

    "owner": "your-org",- **WHEN** `GITHUB_TOKEN` environment variable is set

    "repo": "your-repo"- **THEN** use it for GitHub API authentication

  }

}#### Scenario: Use token from config.json

```- **WHEN** `GITHUB_TOKEN` is not set but `github.token` exists in `openspec/config.json`

- **THEN** use the config token for authentication

### Requirement: GitHub authentication SHALL support token-based access

#### Scenario: Fail with setup instructions if no token

The CLI SHALL authenticate with GitHub using a token from environment variables or configuration.- **WHEN** no token is available from env var or config

- **THEN** display error message:

#### Scenario: Use GITHUB_TOKEN environment variable```

GitHub token required. Choose one:

- **WHEN** `GITHUB_TOKEN` environment variable is set1. Set environment variable: export GITHUB_TOKEN=ghp_xxx

- **THEN** use it for GitHub API authentication2. Add to openspec/config.json: { "github": { "token": "ghp_xxx" } }



#### Scenario: Use token from config.jsonCreate a token at: https://github.com/settings/tokens/new

Required scopes: repo (Full control of private repositories)

- **WHEN** `GITHUB_TOKEN` is not set but `github.token` exists in `openspec/config.json````

- **THEN** use the config token for authentication

### Requirement: Comment operation SHALL post messages to existing issues

#### Scenario: Fail with setup instructions if no token

The CLI SHALL support posting comments to the GitHub issue associated with a change.

- **WHEN** no token is available from env var or config

- **THEN** display error message:#### Scenario: Post comment via --comment flag

- **WHEN** running `openspec issues add-foo --comment "Deployed to staging"`

```- **THEN** read `issues.json` to get issue number

GitHub token required. Choose one:- **AND** post comment to GitHub issue via API

1. Set environment variable: export GITHUB_TOKEN=ghp_xxx- **AND** display comment URL in output

2. Add to openspec/config.json: { "github": { "token": "ghp_xxx" } }

#### Scenario: Fail if issue does not exist

Create a token at: https://github.com/settings/tokens/new- **WHEN** running `openspec issues add-foo --comment "..."` but `issues.json` is missing

Required scopes: repo (Full control of private repositories)- **THEN** display error: "No GitHub issue found for change 'add-foo'. Run 'openspec issues add-foo' to create one first."

```

### Requirement: JSON output SHALL provide structured issue data

### Requirement: Comment operation SHALL post messages to existing issues

The CLI SHALL support `--json` flag to output structured issue data for scripting and automation.

The CLI SHALL support posting comments to the GitHub issue associated with a change.

#### Scenario: Output JSON for created issue

#### Scenario: Post comment via --comment flag- **WHEN** running `openspec issues add-foo --create --json`

- **THEN** output JSON with issue metadata:

- **WHEN** running `openspec issues add-foo --comment "Deployed to staging"````json

- **THEN** read `issues.json` to get issue number{

- **AND** post comment to GitHub issue via API  "action": "created",

- **AND** display comment URL in output  "change": "add-foo",

  "issue": {

#### Scenario: Fail if issue does not exist    "number": 123,

    "url": "https://github.com/myorg/myrepo/issues/123",

- **WHEN** running `openspec issues add-foo --comment "..."` but `issues.json` is missing    "title": "[OpenSpec] add-foo: Add Feature Foo"

- **THEN** display error: "No GitHub issue found for change 'add-foo'. Run 'openspec issues add-foo' to create one first."  }

}

### Requirement: JSON output SHALL provide structured issue data```



The CLI SHALL support `--json` flag to output structured issue data for scripting and automation.#### Scenario: Output JSON for updated issue

- **WHEN** running `openspec issues add-foo --update --json`

#### Scenario: Output JSON for created issue- **THEN** output JSON with action "updated" and issue metadata



- **WHEN** running `openspec issues add-foo --create --json`### Requirement: Error handling SHALL provide actionable guidance

- **THEN** output JSON with issue metadata:

The CLI SHALL detect and report errors with specific remediation steps.

```json

{#### Scenario: GitHub API authentication failure

  "action": "created",- **WHEN** GitHub API returns 401 (unauthorized)

  "change": "add-foo",- **THEN** display error: "GitHub authentication failed. Check that your token is valid and has the required scopes (repo access)"

  "issue": {

    "number": 123,#### Scenario: GitHub repository not found

    "url": "https://github.com/myorg/myrepo/issues/123",- **WHEN** GitHub API returns 404 for repository

    "title": "[OpenSpec] add-foo: Add Feature Foo"- **THEN** display error: "GitHub repository '{owner}/{repo}' not found or not accessible with the provided token"

  }

}#### Scenario: Rate limit exceeded

```- **WHEN** GitHub API returns 403 with rate limit headers

- **THEN** display error: "GitHub API rate limit exceeded. Resets at {reset_time}. Consider using a personal access token for higher limits."

#### Scenario: Output JSON for updated issue

#### Scenario: Network error

- **WHEN** running `openspec issues add-foo --update --json`- **WHEN** GitHub API request fails due to network issues

- **THEN** output JSON with action "updated" and issue metadata- **THEN** display error: "Failed to connect to GitHub API: {error.message}"



### Requirement: Error handling SHALL provide actionable guidance#### Scenario: Change not found

- **WHEN** specified change ID does not exist

The CLI SHALL detect and report errors with specific remediation steps.- **THEN** display error: "Change '{change-id}' not found. Run 'openspec list changes' to see available changes."


#### Scenario: GitHub API authentication failure

- **WHEN** GitHub API returns 401 (unauthorized)
- **THEN** display error: "GitHub authentication failed. Check that your token is valid and has the required scopes (repo access)"

#### Scenario: GitHub repository not found

- **WHEN** GitHub API returns 404 for repository
- **THEN** display error: "GitHub repository '{owner}/{repo}' not found or not accessible with the provided token"

#### Scenario: Rate limit exceeded

- **WHEN** GitHub API returns 403 with rate limit headers
- **THEN** display error: "GitHub API rate limit exceeded. Resets at {reset_time}. Consider using a personal access token for higher limits."

#### Scenario: Network error

- **WHEN** GitHub API request fails due to network issues
- **THEN** display error: "Failed to connect to GitHub API: {error.message}"

#### Scenario: Change not found

- **WHEN** specified change ID does not exist
- **THEN** display error: "Change '{change-id}' not found. Run 'openspec list changes' to see available changes."
