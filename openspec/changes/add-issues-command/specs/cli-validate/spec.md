# cli-validate Delta

## ADDED Requirements

### Requirement: Optional issue creation after validation

The `validate` command SHALL support a `--create-issues` flag that creates a GitHub issue for a change after successful validation.

#### Scenario: Create issue after successful validation

- **GIVEN** a change exists at `openspec/changes/add-feature/`
- **AND** no `issues.json` file exists in that directory
- **WHEN** executing `openspec validate add-feature --create-issues`
- **AND** validation passes
- **THEN** the CLI SHALL create a GitHub issue for the change
- **AND** SHALL write issue metadata to `openspec/changes/add-feature/issues.json`

#### Scenario: Skip issue creation when validation fails

- **GIVEN** a change exists with validation errors
- **WHEN** executing `openspec validate add-feature --create-issues`
- **AND** validation fails
- **THEN** the CLI SHALL NOT create a GitHub issue
- **AND** SHALL display validation errors
- **AND** SHALL exit with code 1

#### Scenario: Skip issue creation when issue already exists

- **GIVEN** a change exists with an `issues.json` file
- **WHEN** executing `openspec validate add-feature --create-issues`
- **AND** validation passes
- **THEN** the CLI SHALL NOT create a duplicate issue
- **AND** SHALL inform the user that an issue already exists
- **AND** SHALL suggest using `openspec issues add-feature` to update the issue

#### Scenario: Create issues respects no-interactive mode

- **GIVEN** a change exists and validation passes
- **WHEN** executing `openspec validate add-feature --create-issues --no-interactive`
- **THEN** the CLI SHALL create the issue without prompting the user
- **AND** SHALL proceed with default options for any GitHub configuration
