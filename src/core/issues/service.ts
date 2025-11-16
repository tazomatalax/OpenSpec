/**
 * Service layer: High-level functions for GitHub issues operations
 */

import {
  IssueOperationOptions,
  IssueOperationResult,
  IssueRef,
} from './model.js';
import { planIssueFromChange } from './planning.js';
import {
  renderIssueBodyForCreate,
  updateIssueBodyWithTasks,
  renderDryRunPreview,
} from './render.js';
import {
  readIssuesMetadata,
  writeIssuesMetadata,
  issueRefToMetadata,
  metadataToIssueRef,
  markIssueClosed,
} from './storage.js';
import {
  getGitHubConfig,
  requireGitHubToken,
  validateGitHubConfig,
} from './github-config.js';
import {
  createOctokitClient,
  createIssue,
  getIssue,
  updateIssueBody,
  commentOnIssue,
  closeIssue,
} from './github-bridge.js';

/**
 * Create or update a GitHub issue for a change (smart default)
 */
export async function syncIssueForChange(
  changeId: string,
  options: IssueOperationOptions = {}
): Promise<IssueOperationResult> {
  const cwd = options.cwd || process.cwd();

  // Parse the change into a planned issue
  const plan = await planIssueFromChange(changeId, cwd);

  // Dry-run mode: just preview
  if (options.dryRun) {
    if (options.json) {
      // Return JSON preview
      console.log(
        JSON.stringify(
          {
            operation: plan.operation,
            changeId: plan.changeId,
            title: plan.title,
            bodySummary: plan.bodySummary,
            tasks: plan.tasks,
          },
          null,
          2
        )
      );
    } else {
      // Print human-readable preview
      console.log(renderDryRunPreview(plan));
    }

    // Return a dummy result
    return {
      action: plan.operation === 'create' ? 'created' : 'updated',
      change: changeId,
      issue: {
        number: 0,
        url: '(dry-run)',
        title: plan.title,
      },
    };
  }

  // Perform the operation based on plan.operation
  if (plan.operation === 'create') {
    return await createIssuesForChange(changeId, options);
  } else {
    return await updateIssuesForChange(changeId, options);
  }
}

/**
 * Create a GitHub issue for a change
 */
export async function createIssuesForChange(
  changeId: string,
  options: IssueOperationOptions = {}
): Promise<IssueOperationResult> {
  const cwd = options.cwd || process.cwd();

  // Check if issue already exists (unless force is set)
  if (!options.force) {
    const existing = await readIssuesMetadata(changeId, cwd);
    if (existing) {
      throw new Error(
        `GitHub issue already exists for change '${changeId}' (issue #${existing.parent.number}). ` +
          `Use 'openspec issues ${changeId}' to update it.`
      );
    }
  }

  // Get GitHub config and validate
  const githubConfig = await getGitHubConfig(cwd);
  validateGitHubConfig(githubConfig);

  // Get authentication token
  const token = requireGitHubToken(githubConfig);
  const octokit = createOctokitClient(token);

  // Parse the change
  const plan = await planIssueFromChange(changeId, cwd);

  // Generate issue body
  const changeUrl = `https://github.com/${githubConfig.owner}/${githubConfig.repo}/tree/main/openspec/changes/${changeId}`;
  const body = renderIssueBodyForCreate(plan, changeUrl);

  // Create the issue
  const issueRef = await createIssue(octokit, {
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    title: plan.title,
    body,
    labels: githubConfig.defaultLabels || ['openspec'],
  });

  // Write issues.json
  const metadata = issueRefToMetadata(issueRef);
  await writeIssuesMetadata(changeId, metadata, cwd);

  // Return result
  const result: IssueOperationResult = {
    action: 'created',
    change: changeId,
    issue: {
      number: issueRef.number,
      url: issueRef.url,
      title: issueRef.title,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✓ Created GitHub issue #${issueRef.number}`);
    console.log(`  ${issueRef.url}`);
  }

  return result;
}

/**
 * Update a GitHub issue for a change
 */
export async function updateIssuesForChange(
  changeId: string,
  options: IssueOperationOptions = {}
): Promise<IssueOperationResult> {
  const cwd = options.cwd || process.cwd();

  // Read existing issues.json
  const metadata = await readIssuesMetadata(changeId, cwd);
  if (!metadata) {
    throw new Error(
      `No GitHub issue found for change '${changeId}'. ` +
        `Run 'openspec issues ${changeId}' to create one first.`
    );
  }

  // Get GitHub config and token
  const githubConfig = await getGitHubConfig(cwd);
  const token = requireGitHubToken(githubConfig);
  const octokit = createOctokitClient(token);

  // Get issue ref from metadata
  const issueRef = metadataToIssueRef(metadata);

  // Fetch current issue body
  const issue = await getIssue(octokit, issueRef);

  // Parse the change for updated tasks
  const plan = await planIssueFromChange(changeId, cwd);

  // Update the body with new tasks
  const updatedBody = updateIssueBodyWithTasks(issue.body || '', plan);

  // Update the issue
  await updateIssueBody(octokit, issueRef, updatedBody);

  // Return result
  const result: IssueOperationResult = {
    action: 'updated',
    change: changeId,
    issue: {
      number: issueRef.number,
      url: issueRef.url,
      title: issueRef.title,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✓ Updated GitHub issue #${issueRef.number}`);
    console.log(`  ${issueRef.url}`);
  }

  return result;
}

/**
 * Post a comment on a change's GitHub issue
 */
export async function commentOnChangeIssues(
  changeId: string,
  message: string,
  options: IssueOperationOptions = {}
): Promise<IssueOperationResult> {
  const cwd = options.cwd || process.cwd();

  // Read existing issues.json
  const metadata = await readIssuesMetadata(changeId, cwd);
  if (!metadata) {
    throw new Error(
      `No GitHub issue found for change '${changeId}'. ` +
        `Run 'openspec issues ${changeId}' to create one first.`
    );
  }

  // Get GitHub config and token
  const githubConfig = await getGitHubConfig(cwd);
  const token = requireGitHubToken(githubConfig);
  const octokit = createOctokitClient(token);

  // Get issue ref from metadata
  const issueRef = metadataToIssueRef(metadata);

  // Post the comment
  const commentUrl = await commentOnIssue(octokit, {
    ref: issueRef,
    body: message,
  });

  // Return result
  const result: IssueOperationResult = {
    action: 'commented',
    change: changeId,
    issue: {
      number: issueRef.number,
      url: issueRef.url,
      title: issueRef.title,
    },
    commentUrl,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✓ Posted comment to issue #${issueRef.number}`);
    console.log(`  ${commentUrl}`);
  }

  return result;
}

/**
 * Close a change's GitHub issue (for archive workflow)
 */
export async function closeIssuesForChange(
  changeId: string,
  options: IssueOperationOptions = {}
): Promise<IssueOperationResult> {
  const cwd = options.cwd || process.cwd();

  // Read existing issues.json
  const metadata = await readIssuesMetadata(changeId, cwd);
  if (!metadata) {
    // No issue to close, silently succeed
    return {
      action: 'closed',
      change: changeId,
      issue: {
        number: 0,
        url: '',
        title: '',
      },
    };
  }

  // Get GitHub config and token
  const githubConfig = await getGitHubConfig(cwd);
  const token = requireGitHubToken(githubConfig);
  const octokit = createOctokitClient(token);

  // Get issue ref from metadata
  const issueRef = metadataToIssueRef(metadata);

  try {
    // Close the issue
    await closeIssue(octokit, issueRef);

    // Update issues.json with closedAt timestamp
    await markIssueClosed(changeId, new Date().toISOString(), cwd);

    // Return result
    const result: IssueOperationResult = {
      action: 'closed',
      change: changeId,
      issue: {
        number: issueRef.number,
        url: issueRef.url,
        title: issueRef.title,
      },
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`✓ Closed GitHub issue #${issueRef.number}`);
      console.log(`  ${issueRef.url}`);
    }

    return result;
  } catch (error) {
    // If closing fails, log warning but don't throw
    // (archive should not fail if issue can't be closed)
    if (!options.json) {
      console.warn(
        `⚠ Warning: Could not close GitHub issue #${issueRef.number}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return {
      action: 'closed',
      change: changeId,
      issue: {
        number: issueRef.number,
        url: issueRef.url,
        title: issueRef.title,
      },
    };
  }
}
