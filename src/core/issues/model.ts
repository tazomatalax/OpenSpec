/**
 * Core type definitions for GitHub Issues integration
 */

/**
 * Reference to a GitHub issue
 */
export interface IssueRef {
  provider: "github";
  owner: string;
  repo: string;
  number: number;
  url: string;
  title: string;
}

/**
 * Metadata stored in issues.json for a change
 */
export interface IssuesMetadata {
  version: 1;
  provider: "github";
  owner: string;
  repo: string;
  parent: {
    number: number;
    url: string;
    title: string;
  };
  createdAt: string; // ISO 8601 timestamp
  closedAt: string | null; // ISO 8601 timestamp or null if still open
}

/**
 * A parsed task from tasks.md
 */
export interface PlannedTask {
  key?: string; // e.g., "1.1" or "2.3.1"
  text: string; // Task description
  checked: boolean; // Whether task is marked complete
  indent: number; // Indentation level (0 for top-level, 1 for nested, etc.)
}

/**
 * A planned GitHub issue parsed from proposal.md and tasks.md
 */
export interface PlannedIssue {
  changeId: string;
  title: string; // e.g., "[OpenSpec] add-foo: Add Feature Foo"
  bodySummary: string; // Rendered from proposal.md "Why" section
  tasks: PlannedTask[];
  operation: "create" | "update";
}

/**
 * GitHub configuration from config.json
 */
export interface GitHubConfig {
  owner: string;
  repo: string;
  defaultLabels?: string[];
  token?: string;
}

/**
 * Options for issue operations
 */
export interface IssueOperationOptions {
  cwd?: string;
  dryRun?: boolean;
  json?: boolean;
  force?: boolean; // For explicit --create or --update
}

/**
 * Options for creating a GitHub issue via API
 */
export interface CreateIssueOptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}

/**
 * Options for commenting on a GitHub issue
 */
export interface CommentOptions {
  ref: IssueRef;
  body: string;
}

/**
 * Result of an issue operation
 */
export interface IssueOperationResult {
  action: "created" | "updated" | "commented" | "closed";
  change: string;
  issue: {
    number: number;
    url: string;
    title: string;
  };
  commentUrl?: string; // For comment operations
}

/**
 * Full GitHub issue data from API
 */
export interface Issue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}
