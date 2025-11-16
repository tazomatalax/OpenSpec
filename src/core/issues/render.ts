/**
 * Rendering module: Generate GitHub issue bodies from planned issues
 */

import { PlannedIssue, PlannedTask } from './model.js';

const TASKS_START_MARKER = '<!-- openspec-tasks:start -->';
const TASKS_END_MARKER = '<!-- openspec-tasks:end -->';

/**
 * Render the tasks section with markers
 */
export function renderTasksSection(plan: PlannedIssue): string {
  const lines: string[] = [];
  
  lines.push(TASKS_START_MARKER);
  lines.push('## Tasks');
  lines.push('');

  for (const task of plan.tasks) {
    const indent = '  '.repeat(task.indent);
    const checkbox = task.checked ? '[x]' : '[ ]';
    const prefix = task.key ? `${task.key} ` : '';
    lines.push(`${indent}- ${checkbox} ${prefix}${task.text}`);
  }

  lines.push(TASKS_END_MARKER);
  
  return lines.join('\n');
}

/**
 * Render full issue body for initial creation
 */
export function renderIssueBodyForCreate(
  plan: PlannedIssue,
  changeUrl?: string
): string {
  const lines: string[] = [];
  
  // Add Why section from proposal
  lines.push('## Why');
  lines.push('');
  lines.push(plan.bodySummary);
  lines.push('');

  // Add change reference if URL provided
  if (changeUrl) {
    lines.push(`**Change:** ${changeUrl}`);
    lines.push('');
  }

  // Add tasks section
  lines.push(renderTasksSection(plan));
  
  return lines.join('\n');
}

/**
 * Update existing issue body by replacing the tasks block
 */
export function updateIssueBodyWithTasks(
  existingBody: string,
  plan: PlannedIssue
): string {
  const startIndex = existingBody.indexOf(TASKS_START_MARKER);
  const endIndex = existingBody.indexOf(TASKS_END_MARKER);

  // If markers don't exist, append tasks to the end
  if (startIndex === -1 || endIndex === -1) {
    const separator = existingBody.trim() ? '\n\n' : '';
    return existingBody + separator + renderTasksSection(plan);
  }

  // Extract content before and after markers
  const before = existingBody.substring(0, startIndex);
  const after = existingBody.substring(endIndex + TASKS_END_MARKER.length);

  // Reconstruct with updated tasks
  return before + renderTasksSection(plan) + after;
}

/**
 * Extract the tasks section from an existing issue body (for debugging/testing)
 */
export function extractTasksSection(issueBody: string): string | null {
  const startIndex = issueBody.indexOf(TASKS_START_MARKER);
  const endIndex = issueBody.indexOf(TASKS_END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    return null;
  }

  return issueBody.substring(
    startIndex,
    endIndex + TASKS_END_MARKER.length
  );
}

/**
 * Check if an issue body contains OpenSpec task markers
 */
export function hasTaskMarkers(issueBody: string): boolean {
  return (
    issueBody.includes(TASKS_START_MARKER) &&
    issueBody.includes(TASKS_END_MARKER)
  );
}

/**
 * Generate a preview string for dry-run mode
 */
export function renderDryRunPreview(plan: PlannedIssue): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push(`Operation: ${plan.operation.toUpperCase()}`);
  lines.push(`Change: ${plan.changeId}`);
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Title: ${plan.title}`);
  lines.push('');
  lines.push('Body:');
  lines.push('-'.repeat(80));
  
  if (plan.operation === 'create') {
    lines.push(renderIssueBodyForCreate(plan));
  } else {
    lines.push('(Will update tasks section in existing issue)');
    lines.push('');
    lines.push(renderTasksSection(plan));
  }
  
  lines.push('-'.repeat(80));
  lines.push('');
  lines.push(`Total tasks: ${plan.tasks.length}`);
  lines.push(`Completed: ${plan.tasks.filter(t => t.checked).length}`);
  
  return lines.join('\n');
}
