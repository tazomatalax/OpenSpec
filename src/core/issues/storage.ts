/**
 * Storage module: Read and write issues.json metadata files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { IssuesMetadata, IssueRef } from './model.js';

/**
 * Read issues.json for a change
 */
export async function readIssuesMetadata(
  changeId: string,
  cwd: string = process.cwd()
): Promise<IssuesMetadata | null> {
  const issuesJsonPath = getIssuesJsonPath(changeId, cwd);
  
  try {
    const content = await fs.readFile(issuesJsonPath, 'utf-8');
    const metadata = JSON.parse(content) as IssuesMetadata;
    
    // Validate schema version
    if (metadata.version !== 1) {
      throw new Error(
        `Unsupported issues.json version: ${metadata.version}. Expected version 1.`
      );
    }
    
    return metadata;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw err;
  }
}

/**
 * Write issues.json for a change
 */
export async function writeIssuesMetadata(
  changeId: string,
  metadata: IssuesMetadata,
  cwd: string = process.cwd()
): Promise<void> {
  const issuesJsonPath = getIssuesJsonPath(changeId, cwd);
  
  // Ensure the change directory exists
  const changeDir = path.dirname(issuesJsonPath);
  await fs.mkdir(changeDir, { recursive: true });
  
  // Write with pretty formatting
  const content = JSON.stringify(metadata, null, 2) + '\n';
  await fs.writeFile(issuesJsonPath, content, 'utf-8');
}

/**
 * Convert IssueRef to IssuesMetadata for persistence
 */
export function issueRefToMetadata(
  ref: IssueRef,
  createdAt?: string,
  closedAt?: string | null
): IssuesMetadata {
  return {
    version: 1,
    provider: 'github',
    owner: ref.owner,
    repo: ref.repo,
    parent: {
      number: ref.number,
      url: ref.url,
      title: ref.title,
    },
    createdAt: createdAt || new Date().toISOString(),
    closedAt: closedAt || null,
  };
}

/**
 * Convert IssuesMetadata to IssueRef
 */
export function metadataToIssueRef(metadata: IssuesMetadata): IssueRef {
  return {
    provider: 'github',
    owner: metadata.owner,
    repo: metadata.repo,
    number: metadata.parent.number,
    url: metadata.parent.url,
    title: metadata.parent.title,
  };
}

/**
 * Update closedAt timestamp in issues.json
 */
export async function markIssueClosed(
  changeId: string,
  closedAt: string = new Date().toISOString(),
  cwd: string = process.cwd()
): Promise<void> {
  const metadata = await readIssuesMetadata(changeId, cwd);
  
  if (!metadata) {
    throw new Error(`No issues.json found for change '${changeId}'`);
  }
  
  metadata.closedAt = closedAt;
  await writeIssuesMetadata(changeId, metadata, cwd);
}

/**
 * Check if a change has an associated GitHub issue
 */
export async function hasGitHubIssue(
  changeId: string,
  cwd: string = process.cwd()
): Promise<boolean> {
  const metadata = await readIssuesMetadata(changeId, cwd);
  return metadata !== null;
}

/**
 * Get the path to issues.json for a change
 */
function getIssuesJsonPath(changeId: string, cwd: string): string {
  return path.join(cwd, 'openspec', 'changes', changeId, 'issues.json');
}

/**
 * Delete issues.json for a change (for testing/cleanup)
 */
export async function deleteIssuesMetadata(
  changeId: string,
  cwd: string = process.cwd()
): Promise<void> {
  const issuesJsonPath = getIssuesJsonPath(changeId, cwd);
  
  try {
    await fs.unlink(issuesJsonPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    // Ignore if file doesn't exist
  }
}
