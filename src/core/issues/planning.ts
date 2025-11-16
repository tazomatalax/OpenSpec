/**
 * Planning module: Parse change proposals and tasks to plan GitHub issues
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PlannedIssue, PlannedTask } from './model.js';

const TASK_PATTERN = /^(\s*)[-*]\s+\[([\sx])\]\s+(.+)$/i;
const TASK_KEY_PATTERN = /^(\d+(?:\.\d+)*)\s+(.+)$/;

/**
 * Parse a change's proposal.md and tasks.md into a planned GitHub issue
 */
export async function planIssueFromChange(
  changeId: string,
  cwd: string = process.cwd()
): Promise<PlannedIssue> {
  const changeDir = path.join(cwd, 'openspec', 'changes', changeId);
  
  // Check if change exists
  try {
    await fs.access(changeDir);
  } catch {
    throw new Error(`Change '${changeId}' not found at ${changeDir}`);
  }

  // Read proposal.md
  const proposalPath = path.join(changeDir, 'proposal.md');
  let proposalContent: string;
  try {
    proposalContent = await fs.readFile(proposalPath, 'utf-8');
  } catch {
    throw new Error(`proposal.md not found for change '${changeId}'`);
  }

  // Extract "Why" section for body summary
  const bodySummary = extractWhySection(proposalContent);
  
  // Extract title from proposal (first H1) or generate from change ID
  const title = extractTitle(proposalContent, changeId);

  // Read tasks.md
  const tasksPath = path.join(changeDir, 'tasks.md');
  let tasksContent: string;
  try {
    tasksContent = await fs.readFile(tasksPath, 'utf-8');
  } catch {
    throw new Error(`tasks.md not found for change '${changeId}'`);
  }

  // Parse tasks
  const tasks = parseTasksFromContent(tasksContent);

  // Check if issue already exists to determine operation
  const issuesJsonPath = path.join(changeDir, 'issues.json');
  let operation: 'create' | 'update' = 'create';
  try {
    await fs.access(issuesJsonPath);
    operation = 'update';
  } catch {
    // File doesn't exist, create operation
  }

  return {
    changeId,
    title,
    bodySummary,
    tasks,
    operation,
  };
}

/**
 * Extract the "Why" section from proposal.md
 */
function extractWhySection(content: string): string {
  const lines = content.split('\n');
  const whyIndex = lines.findIndex(line => line.trim() === '## Why');
  
  if (whyIndex === -1) {
    throw new Error('proposal.md must have a "## Why" section');
  }

  // Find the next H2 section or end of file
  let endIndex = lines.length;
  for (let i = whyIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      endIndex = i;
      break;
    }
  }

  // Extract and trim the content
  const whyContent = lines.slice(whyIndex + 1, endIndex).join('\n').trim();
  
  if (!whyContent) {
    throw new Error('"## Why" section in proposal.md cannot be empty');
  }

  return whyContent;
}

/**
 * Extract title from proposal or generate from change ID
 */
function extractTitle(content: string, changeId: string): string {
  // Try to find first H1
  const lines = content.split('\n');
  const h1Line = lines.find(line => line.startsWith('# '));
  
  if (h1Line) {
    const title = h1Line.substring(2).trim();
    return `[OpenSpec] ${changeId}: ${title}`;
  }

  // Fallback: capitalize change ID
  const readableId = changeId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `[OpenSpec] ${changeId}: ${readableId}`;
}

/**
 * Parse tasks from tasks.md content
 */
export function parseTasksFromContent(content: string): PlannedTask[] {
  const lines = content.split('\n');
  const tasks: PlannedTask[] = [];

  for (const line of lines) {
    const match = line.match(TASK_PATTERN);
    if (!match) continue;

    const [, indentStr, checkbox, text] = match;
    const indent = Math.floor(indentStr.length / 2); // 2 spaces per indent level
    const checked = checkbox.toLowerCase() === 'x';

    // Try to extract task key (e.g., "1.1" from "1.1 Create database schema")
    const keyMatch = text.trim().match(TASK_KEY_PATTERN);
    let key: string | undefined;
    let cleanText = text.trim();

    if (keyMatch) {
      key = keyMatch[1];
      cleanText = keyMatch[2];
    }

    tasks.push({
      key,
      text: cleanText,
      checked,
      indent,
    });
  }

  return tasks;
}

/**
 * Validate that a change directory has the required files for issue creation
 */
export async function validateChangeForIssues(
  changeId: string,
  cwd: string = process.cwd()
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const changeDir = path.join(cwd, 'openspec', 'changes', changeId);

  // Check change directory exists
  try {
    await fs.access(changeDir);
  } catch {
    errors.push(`Change directory not found: ${changeDir}`);
    return { valid: false, errors };
  }

  // Check proposal.md exists
  const proposalPath = path.join(changeDir, 'proposal.md');
  try {
    await fs.access(proposalPath);
  } catch {
    errors.push(`proposal.md not found for change '${changeId}'`);
  }

  // Check tasks.md exists
  const tasksPath = path.join(changeDir, 'tasks.md');
  try {
    await fs.access(tasksPath);
  } catch {
    errors.push(`tasks.md not found for change '${changeId}'`);
  }

  // If files exist, try to parse them to validate structure
  if (errors.length === 0) {
    try {
      await planIssueFromChange(changeId, cwd);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
