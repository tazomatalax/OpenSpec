# Design: GitHub Issues Integration

## Context

OpenSpec currently focuses on capturing and evolving specifications within a repository structure (`openspec/specs/` for current truth, `openspec/changes/` for proposed updates). This works well for structured planning and AI-driven implementation, but teams often use GitHub Issues for daily work tracking, notifications, and project management workflows. Without integration, these systems remain disconnected, leading to manual duplication and drift.

This design introduces an `openspec issues` command that projects each OpenSpec change into a single GitHub issue, keeping the issue's task checklist synchronized with the change's `tasks.md` file. OpenSpec remains the source of truth; GitHub issues are a derived, read-only projection (from OpenSpec's perspective).

## Goals / Non-Goals

### Goals

- **Single command per change:** Users run `openspec issues <change-id>` to create or update a GitHub issue, with smart defaults that "just work".
- **Local is authoritative:** `tasks.md` defines the checklist; the GitHub issue body is derived and overwritten on each sync.
- **Minimal configuration:** Auto-infer GitHub owner/repo from `git remote` where possible; prompt once and persist.
- **Idempotency:** Running the command multiple times is safe; it creates once, then updates the checklist on subsequent runs.
- **Optional workflow hooks:** Integrate with `openspec validate --create-issues` and `openspec archive` for automatic issue lifecycle management.

### Non-Goals

- **Bidirectional sync:** Changes made directly in GitHub (e.g., editing the checklist) are overwritten by `tasks.md` on the next sync. This is intentional to keep OpenSpec as the single source of truth.
- **One issue per task:** The design uses a single parent issue per change with an embedded checklist. Future extensions could support sub-issues, but that's out of scope for the initial implementation.
- **Rich GitHub integration:** Advanced features like assigning issues, managing milestones, or syncing comments back into OpenSpec are not part of this design.

## Decisions

### Decision 1: Smart default behavior

**Chosen:** When running `openspec issues <change-id>` without explicit flags:

- If `openspec/changes/<change-id>/issues.json` does not exist → **create** the GitHub issue and write `issues.json`.
- If `issues.json` exists → **update** the GitHub issue's task checklist to match `tasks.md`.

**Alternatives considered:**

- Always require explicit `--create` or `--update` flags.
  - **Rejected:** More friction; users would need to remember state. Smart defaults reduce cognitive load.
- Default to dry-run unless a flag is passed.
  - **Rejected:** Adds an extra step for the common case (actually creating/updating).

**Rationale:** The smart default aligns with the "works in any repo with minimal config" goal. Users can always override with `--dry-run` for safety or `--create`/`--update` for explicit control.

### Decision 2: Single parent issue with embedded checklist

**Chosen:** Each OpenSpec change maps to one GitHub issue. All tasks from `tasks.md` are rendered as a markdown checklist in the issue body, enclosed in `<!-- openspec-tasks:start -->` and `<!-- openspec-tasks:end -->` markers.

**Alternatives considered:**

- One GitHub issue per task.
  - **Rejected:** Creates noise (dozens of issues for a large change) and complicates tracking. The parent issue provides a single conversation space and overview.
- Use GitHub Projects or a different primitive.
  - **Rejected:** GitHub Projects API is more complex, and not all teams use Projects. Issues are universal.

**Rationale:** A single parent issue with a checklist is the simplest, most portable solution. It matches how many teams already structure feature work in GitHub.

### Decision 3: Tasks block markers for safe overwrite

**Chosen:** The tasks section in the GitHub issue body is wrapped in HTML comments:

```markdown
<!-- openspec-tasks:start -->
## Tasks

- [ ] 1.1 Create database schema
- [x] 1.2 Implement API endpoint
<!-- openspec-tasks:end -->
```

When updating, OpenSpec replaces everything between these markers with freshly rendered content from `tasks.md`. Content outside the markers is preserved.

**Alternatives considered:**

- Parse the entire issue body and try to intelligently merge checkboxes.
  - **Rejected:** Fragile and error-prone. Requires complex diff logic and breaks if the body is edited manually.
- Append tasks as separate comments.
  - **Rejected:** Comments are for conversation, not canonical state. Mixing the two would confuse users.

**Rationale:** Markers make the contract explicit: "OpenSpec owns this section." It's robust, simple, and aligns with how tools like Renovate and Dependabot manage automated updates.

### Decision 4: Minimal GitHub configuration

**Chosen:** Store GitHub settings in a small configuration file (e.g., `openspec/config.json` or a section in `openspec/project.md`) with:

```json
{
  "github": {
    "provider": "github",
    "owner": "my-org",
    "repo": "my-repo",
    "defaultLabels": ["openspec"]
  }
}
```

On first use of `openspec issues`, if the config is missing:

- Try to infer `owner` and `repo` from `git remote -v`.
- If ambiguous or unavailable, prompt the user once and persist the result.

**Alternatives considered:**

- Require environment variables for GitHub configuration.
  - **Rejected:** Less discoverable and not persisted in the repo.
- Store config in `.git/config` or a hidden file.
  - **Rejected:** Not version-controlled; every contributor would need to configure separately.

**Rationale:** A repo-level config file is simple, version-controlled, and aligns with OpenSpec's philosophy of keeping important metadata in the repo.

### Decision 5: Hybrid GitHub integration (Octokit + LLM/MCP orchestration)

**Chosen:** Support **two complementary paths** for GitHub operations:

#### Path 1: Direct CLI via Octokit (standalone, scriptable)

The CLI uses Octokit for direct GitHub API calls when:
- Running in CI/CD pipelines
- User explicitly runs `openspec issues` commands
- Token is configured via `GITHUB_TOKEN` env var or `openspec/config.json`

Bridge module (`src/core/issues/github-bridge.ts`) exposes:
- `createIssue(opts): Promise<IssueRef>` → `octokit.rest.issues.create()`
- `getIssue(ref): Promise<Issue>` → `octokit.rest.issues.get()`
- `updateIssueBody(ref, body): Promise<void>` → `octokit.rest.issues.update()`
- `commentOnIssue(ref, body): Promise<void>` → `octokit.rest.issues.createComment()`
- `closeIssue(ref): Promise<void>` → `octokit.rest.issues.update()` with `state: "closed"`

**Authentication (Path 1):**
- GitHub token from `GITHUB_TOKEN` env var (standard convention)
- Fallback: read from `openspec/config.json` → `github.token`
- If missing: suggest LLM orchestration as an alternative (Path 2)

#### Path 2: LLM orchestration via MCP (natural language, no token management)

When an LLM with GitHub MCP access is available, users can skip token management entirely:

**Natural language commands:**
- "Create GitHub issues for add-foo"
- "Update issues for add-foo to match current tasks"
- "Close issues for add-foo"

**LLM workflow:**
1. Reads `proposal.md` and `tasks.md` for the change
2. Calls GitHub MCP tools directly:
   - `mcp_github_github_issue_write` (create/update/close)
   - `mcp_github_github_issue_read` (get current state)
   - `mcp_github_github_add_issue_comment` (post comments)
3. Writes `issues.json` with issue metadata
4. Confirms completion to user

**When to use Path 2:**
- User doesn't want to manage GitHub tokens
- Working in an LLM chat session
- Prefer natural language over CLI commands

**Alternatives considered:**

- **Octokit-only (no LLM path):**
  - **Rejected:** Forces all users to manage tokens, even when LLM with MCP is readily available.
  
- **MCP-only (no Octokit):**
  - **Rejected:** Breaks CI/CD and scripting; requires LLM for every operation.
  
- **Build custom HTTP client:**
  - **Rejected:** Reinventing the wheel; Octokit is well-maintained and official.

**Rationale:** The hybrid approach gives users flexibility:
- **Power users / CI/CD:** Use Octokit path for deterministic, scriptable workflows
- **LLM users:** Use MCP path for zero-config, natural language experience
- **Both work:** The same `issues.json` format ensures compatibility between paths

This design acknowledges that LLMs are often available (as you noted) while preserving the ability to run standalone when needed (CI/CD, automation scripts).

## Risks / Trade-offs

### Risk: MCP server availability

**Risk:** If the GitHub MCP server is unavailable or not configured, `openspec issues` will fail.

**Mitigation:**

- Provide clear error messages when the MCP server is unreachable.
- Document fallback options (e.g., manual issue creation or direct API integration) in a troubleshooting guide.
- Consider a future enhancement where `github-bridge.ts` can optionally use Octokit directly if MCP is unavailable.

### Risk: Overwriting manual edits to GitHub issue body

**Risk:** If a user manually edits the GitHub issue body (e.g., adds notes outside the tasks block), those edits are preserved. But if they edit the tasks checklist directly in GitHub, those changes are overwritten on the next `openspec issues` run.

**Mitigation:**

- Document clearly that `tasks.md` is the source of truth.
- Consider a future enhancement: detect out-of-band changes to the tasks block and prompt the user before overwriting.

### Trade-off: Smart defaults vs. explicit control

**Trade-off:** The smart default behavior (create if missing, update if present) is convenient but might surprise users who expect explicit flags.

**Mitigation:**

- Support `--dry-run` to preview changes before applying them.
- Support explicit `--create` and `--update` flags for scripts and automation.
- Document the smart default behavior prominently in the README and help text.

## LLM Orchestration Path (MCP)

When users prefer natural language and have an LLM with GitHub MCP access, they can skip the CLI entirely and use prompts like:

### Example: Create issues via LLM

**User:** "Create GitHub issues for the add-issues-command change"

**LLM workflow:**
1. Reads `openspec/changes/add-issues-command/proposal.md` for title and summary
2. Reads `openspec/changes/add-issues-command/tasks.md` for checklist
3. Reads GitHub config from `openspec/config.json` (owner/repo)
4. Calls `mcp_github_github_issue_write` with `method: "create"`:
   ```typescript
   {
     method: "create",
     owner: "tazomatalax",
     repo: "openspec",
     title: "[OpenSpec] add-issues-command: Add Issues Command",
     body: "## Why\n\n...\n\n<!-- openspec-tasks:start -->...",
     labels: ["openspec"]
   }
   ```
5. Writes `openspec/changes/add-issues-command/issues.json`:
   ```json
   {
     "version": 1,
     "provider": "github",
     "owner": "tazomatalax",
     "repo": "openspec",
     "parent": {
       "number": 123,
       "url": "https://github.com/tazomatalax/openspec/issues/123",
       "title": "[OpenSpec] add-issues-command: Add Issues Command"
     },
     "createdAt": "2025-11-16T12:00:00Z",
     "closedAt": null
   }
   ```

### Example: Update issues via LLM

**User:** "Sync GitHub issues for add-issues-command with current tasks"

**LLM workflow:**
1. Reads `issues.json` to get issue number
2. Calls `mcp_github_github_issue_read` to fetch current body
3. Reads `tasks.md` to get current task states
4. Regenerates tasks block between `<!-- openspec-tasks:start/end -->` markers
5. Calls `mcp_github_github_issue_write` with `method: "update"` and new body

### Example: Close issues on archive

**User:** "Archive the add-issues-command change" (via OpenSpec slash command)

**LLM workflow:**
1. Runs `openspec archive add-issues-command --yes`
2. After successful archive, reads `issues.json`
3. Calls `mcp_github_github_issue_write` with:
   ```typescript
   {
     method: "update",
     owner: "tazomatalax",
     repo: "openspec",
     issue_number: 123,
     state: "closed",
     state_reason: "completed"
   }
   ```
4. Updates `issues.json` with `closedAt` timestamp

### Benefits of LLM path

- **No token management:** MCP handles auth automatically
- **Natural language:** Users don't need to memorize CLI flags
- **Contextual:** LLM can read proposal/tasks and format issue body intelligently
- **Discoverable:** Works via chat without needing to install/configure anything

## CLI Path: GitHub API Integration via Octokit

This section provides the exact mapping between OpenSpec CLI operations and GitHub REST API calls via Octokit.

### Authentication Setup

**Token sources (in priority order):**
1. Environment variable: `GITHUB_TOKEN`
2. Config file: `openspec/config.json` → `github.token`

**Octokit initialization:**
```typescript
import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_TOKEN || config.github?.token;
if (!token) {
  throw new Error("GitHub token required. Set GITHUB_TOKEN environment variable or add 'github.token' to openspec/config.json");
}

const octokit = new Octokit({ auth: token });
```

### Create Issue Operation

**OpenSpec function:** `createIssue(opts)`

**Octokit method:** `octokit.rest.issues.create()`

**Example implementation:**
```typescript
async function createIssue(opts: CreateIssueOptions): Promise<IssueRef> {
  const response = await octokit.rest.issues.create({
    owner: opts.owner,
    repo: opts.repo,
    title: opts.title,        // "[OpenSpec] add-foo: Add Feature"
    body: opts.body,          // rendered from proposal.md + tasks.md
    labels: opts.labels || []  // ["openspec"]
  });

  return {
    provider: "github",
    owner: opts.owner,
    repo: opts.repo,
    number: response.data.number,
    url: response.data.html_url,
    title: response.data.title
  };
}
```

### Get Issue Operation

**OpenSpec function:** `getIssue(ref)`

**Octokit method:** `octokit.rest.issues.get()`

**Example implementation:**
```typescript
async function getIssue(ref: IssueRef): Promise<Issue> {
  const response = await octokit.rest.issues.get({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number
  });

  return response.data;  // includes body, state, etc.
}
```

### Update Issue Body Operation

**OpenSpec function:** `updateIssueBody(ref, newBody)`

**Octokit method:** `octokit.rest.issues.update()`

**Example implementation:**
```typescript
async function updateIssueBody(ref: IssueRef, body: string): Promise<void> {
  await octokit.rest.issues.update({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number,
    body: body  // new body with updated tasks block
  });
}
```

### Comment on Issue Operation

**OpenSpec function:** `commentOnIssue(ref, commentBody)`

**Octokit method:** `octokit.rest.issues.createComment()`

**Example implementation:**
```typescript
async function commentOnIssue(ref: IssueRef, body: string): Promise<string> {
  const response = await octokit.rest.issues.createComment({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number,
    body: body  // "Deployed to staging"
  });

  return response.data.html_url;  // comment URL for display
}
```

### Close Issue Operation

**OpenSpec function:** `closeIssue(ref)`

**Octokit method:** `octokit.rest.issues.update()`

**Example implementation:**
```typescript
async function closeIssue(ref: IssueRef): Promise<void> {
  await octokit.rest.issues.update({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number,
    state: "closed",
    state_reason: "completed"  // indicates successful completion
  });
}
```

### Error Handling

All Octokit calls should be wrapped in try-catch blocks to handle:

1. **Missing token:**
   - Error message: "GitHub token required. Set GITHUB_TOKEN environment variable or add to openspec/config.json"
   - Exit code: 1

2. **Authentication failure (401):**
   - Error message: "GitHub authentication failed. Check that your token is valid and has the required scopes (repo access)"
   - Exit code: 1

3. **Not found (404):**
   - Error message: "GitHub repository '{owner}/{repo}' not found or not accessible with the provided token"
   - Exit code: 1

4. **Rate limiting (403 with rate limit headers):**
   - Error message: "GitHub API rate limit exceeded. Resets at {reset_time}. Consider using a personal access token for higher limits"
   - Exit code: 1

5. **Network errors:**
   - Error message: "Failed to connect to GitHub API: {error.message}"
   - Exit code: 1

### Configuration Discovery

Before making any API calls, the CLI should:

1. **Read GitHub config:**
   - Check `openspec/config.json` for `github.owner`, `github.repo`, and optionally `github.token`
   - If `owner`/`repo` missing, attempt to infer from `git remote -v` output (parse origin URL)

2. **Validate configuration:**
   - Ensure `owner` and `repo` are non-empty strings
   - If invalid, display error: "GitHub repository not configured. Add 'github.owner' and 'github.repo' to openspec/config.json"

3. **Check token availability:**
   - Look for `GITHUB_TOKEN` env var or `github.token` in config
   - If missing, display setup instructions:
     ```
     GitHub token required. Choose one:
     1. Set environment variable: export GITHUB_TOKEN=ghp_xxx
     2. Add to openspec/config.json: { "github": { "token": "ghp_xxx" } }
     
     Create a token at: https://github.com/settings/tokens/new
     Required scopes: repo (Full control of private repositories)
     ```

## Migration Plan

Not applicable (this is a new feature with no existing state to migrate).

## Open Questions

1. **Should `openspec archive` close issues by default, or require a flag?**
   - **Suggestion:** Close by default, but provide `--no-close-issues` to opt out. Most teams will want issues closed when work is complete.

2. **Should we support multiple repositories in a single OpenSpec project?**
   - **Suggestion:** Defer to a future enhancement. For now, assume one GitHub repo per OpenSpec project.

3. **How should we handle changes that span multiple capabilities?**
   - **Suggestion:** Still create one parent issue per change. The issue body can link to multiple spec deltas or list affected capabilities.

4. **Should the CLI prompt to configure GitHub on first run, or fail with an error?**
   - **Suggestion:** Fail with a helpful error message pointing to `openspec init` or manual config creation. This keeps the command non-interactive by default, which is better for scripting.
