/**
 * GitHub Bridge: Direct API integration via Octokit
 */

import { Octokit } from '@octokit/rest';
import { IssueRef, CreateIssueOptions, CommentOptions, Issue } from './model.js';

/**
 * GitHub API error with helpful context
 */
export class GitHubError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimitReset?: Date
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

/**
 * Initialize Octokit client with authentication
 */
export function createOctokitClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * Create a new GitHub issue
 */
export async function createIssue(
  octokit: Octokit,
  options: CreateIssueOptions
): Promise<IssueRef> {
  try {
    const response = await octokit.rest.issues.create({
      owner: options.owner,
      repo: options.repo,
      title: options.title,
      body: options.body,
      labels: options.labels || [],
    });

    return {
      provider: 'github',
      owner: options.owner,
      repo: options.repo,
      number: response.data.number,
      url: response.data.html_url,
      title: response.data.title,
    };
  } catch (error) {
    throw handleGitHubError(error, options.owner, options.repo);
  }
}

/**
 * Get a GitHub issue by reference
 */
export async function getIssue(
  octokit: Octokit,
  ref: IssueRef
): Promise<Issue> {
  try {
    const response = await octokit.rest.issues.get({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
    });

    return {
      number: response.data.number,
      title: response.data.title,
      body: response.data.body || '',
      state: response.data.state as 'open' | 'closed',
      html_url: response.data.html_url,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      closed_at: response.data.closed_at,
    };
  } catch (error) {
    throw handleGitHubError(error, ref.owner, ref.repo);
  }
}

/**
 * Update a GitHub issue's body
 */
export async function updateIssueBody(
  octokit: Octokit,
  ref: IssueRef,
  body: string
): Promise<void> {
  try {
    await octokit.rest.issues.update({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
      body,
    });
  } catch (error) {
    throw handleGitHubError(error, ref.owner, ref.repo);
  }
}

/**
 * Post a comment on a GitHub issue
 */
export async function commentOnIssue(
  octokit: Octokit,
  options: CommentOptions
): Promise<string> {
  try {
    const response = await octokit.rest.issues.createComment({
      owner: options.ref.owner,
      repo: options.ref.repo,
      issue_number: options.ref.number,
      body: options.body,
    });

    return response.data.html_url;
  } catch (error) {
    throw handleGitHubError(error, options.ref.owner, options.ref.repo);
  }
}

/**
 * Close a GitHub issue
 */
export async function closeIssue(
  octokit: Octokit,
  ref: IssueRef
): Promise<void> {
  try {
    await octokit.rest.issues.update({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
      state: 'closed',
      state_reason: 'completed',
    });
  } catch (error) {
    throw handleGitHubError(error, ref.owner, ref.repo);
  }
}

/**
 * Handle GitHub API errors with helpful messages
 */
function handleGitHubError(
  error: unknown,
  owner: string,
  repo: string
): GitHubError {
  // Type guard for Octokit errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const octokitError = error as { status: number; message?: string; response?: { headers?: { 'x-ratelimit-reset'?: string } } };
    const status = octokitError.status;

    switch (status) {
      case 401:
        return new GitHubError(
          'GitHub authentication failed. Check that your token is valid and has the required scopes (repo access)',
          401
        );

      case 403:
        // Check if rate limited
        const resetHeader = octokitError.response?.headers?.['x-ratelimit-reset'];
        if (resetHeader) {
          const resetTime = new Date(parseInt(resetHeader) * 1000);
          return new GitHubError(
            `GitHub API rate limit exceeded. Resets at ${resetTime.toISOString()}. Consider using a personal access token for higher limits.`,
            403,
            resetTime
          );
        }
        return new GitHubError(
          'GitHub API access forbidden. Check your token permissions.',
          403
        );

      case 404:
        return new GitHubError(
          `GitHub repository '${owner}/${repo}' not found or not accessible with the provided token`,
          404
        );

      case 422:
        return new GitHubError(
          `GitHub API validation failed: ${octokitError.message || 'Invalid request'}`,
          422
        );

      default:
        return new GitHubError(
          `GitHub API error (${status}): ${octokitError.message || 'Unknown error'}`,
          status
        );
    }
  }

  // Network or other errors
  if (error instanceof Error) {
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return new GitHubError(
        `Failed to connect to GitHub API: ${error.message}`
      );
    }
    return new GitHubError(
      `GitHub operation failed: ${error.message}`
    );
  }

  return new GitHubError('Unknown GitHub API error');
}

/**
 * Test GitHub authentication and repository access
 */
export async function testGitHubAccess(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    await octokit.rest.repos.get({ owner, repo });
    return { valid: true };
  } catch (error) {
    const githubError = handleGitHubError(error, owner, repo);
    return { valid: false, error: githubError.message };
  }
}
