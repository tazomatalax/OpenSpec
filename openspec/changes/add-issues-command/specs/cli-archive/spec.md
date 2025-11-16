# cli-archive Delta

## ADDED Requirements

### Requirement: Optional issue closing on archive

The `archive` command SHALL close the associated GitHub issue when archiving a change that has an `issues.json` file.

#### Scenario: Close issue on successful archive

- **GIVEN** a change exists at `openspec/changes/add-feature/`
- **AND** an `issues.json` file exists with issue metadata
- **WHEN** executing `openspec archive add-feature --yes`
- **AND** the archive operation succeeds
- **THEN** the CLI SHALL close the associated GitHub issue
- **AND** SHALL update `issues.json` with a `closedAt` timestamp

#### Scenario: Skip closing when no issue exists

- **GIVEN** a change exists with no `issues.json` file
- **WHEN** executing `openspec archive add-feature --yes`
- **THEN** the CLI SHALL complete the archive operation normally
- **AND** SHALL NOT attempt to close a GitHub issue

#### Scenario: Archive continues if issue close fails

- **GIVEN** a change exists with an `issues.json` file
- **AND** the GitHub MCP server is unavailable or returns an error
- **WHEN** executing `openspec archive add-feature --yes`
- **THEN** the CLI SHALL complete the archive operation
- **AND** SHALL log a warning that the issue could not be closed
- **AND** SHALL NOT fail the archive due to issue close failure

#### Scenario: Optional flag to skip issue closing

- **GIVEN** a change exists with an `issues.json` file
- **WHEN** executing `openspec archive add-feature --yes --no-close-issues`
- **THEN** the CLI SHALL complete the archive operation
- **AND** SHALL NOT attempt to close the GitHub issue
