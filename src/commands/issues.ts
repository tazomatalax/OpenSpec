/**
 * Issues command: Create and manage GitHub issues for OpenSpec changes
 */

import { Command } from 'commander';
import {
  syncIssueForChange,
  createIssuesForChange,
  updateIssuesForChange,
  commentOnChangeIssues,
} from '../core/issues/service.js';
import { IssueOperationOptions } from '../core/issues/model.js';

interface IssuesCommandOptions {
  dryRun?: boolean;
  json?: boolean;
  create?: boolean;
  update?: boolean;
  comment?: string;
}

export class IssuesCommand {
  async execute(
    changeId: string | undefined,
    options: IssuesCommandOptions = {}
  ): Promise<void> {
    // Require changeId
    if (!changeId) {
      console.error('Error: change-id is required');
      console.error('');
      console.error('Usage:');
      console.error('  openspec issues <change-id>         # Create or update issue (smart default)');
      console.error('  openspec issues <change-id> --dry-run  # Preview without making changes');
      console.error('  openspec issues <change-id> --create   # Explicitly create issue');
      console.error('  openspec issues <change-id> --update   # Explicitly update existing issue');
      console.error('  openspec issues <change-id> --comment "Message"  # Post comment');
      console.error('');
      console.error('Examples:');
      console.error('  openspec issues add-foo');
      console.error('  openspec issues add-foo --dry-run');
      console.error('  openspec issues add-foo --comment "Deployed to staging"');
      process.exitCode = 1;
      return;
    }

    const opOptions: IssueOperationOptions = {
      dryRun: options.dryRun,
      json: options.json,
      force: false,
    };

    try {
      // Handle --comment flag
      if (options.comment) {
        await commentOnChangeIssues(changeId, options.comment, opOptions);
        return;
      }

      // Handle explicit --create flag
      if (options.create) {
        opOptions.force = true;
        await createIssuesForChange(changeId, opOptions);
        return;
      }

      // Handle explicit --update flag
      if (options.update) {
        await updateIssuesForChange(changeId, opOptions);
        return;
      }

      // Smart default: create or update based on issues.json existence
      await syncIssueForChange(changeId, opOptions);
    } catch (error) {
      if (options.json) {
        console.error(
          JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          )
        );
      } else {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exitCode = 1;
    }
  }

  /**
   * Register the issues command with Commander
   */
  static register(program: Command): void {
    program
      .command('issues')
      .description('Create and manage GitHub issues for OpenSpec changes')
      .argument('[change-id]', 'The ID of the change to create/update an issue for')
      .option('--dry-run', 'Preview changes without modifying GitHub')
      .option('--json', 'Output JSON instead of human-readable text')
      .option('--create', 'Explicitly create a new issue (fails if issue exists)')
      .option('--update', 'Explicitly update existing issue (fails if no issue exists)')
      .option('--comment <message>', 'Post a comment to the issue')
      .action(async (changeId: string | undefined, options: IssuesCommandOptions) => {
        const command = new IssuesCommand();
        await command.execute(changeId, options);
      });
  }
}
