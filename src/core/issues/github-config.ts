/**
 * GitHub configuration management
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubConfig } from './model.js';

const execAsync = promisify(exec);

interface ConfigFile {
  github?: GitHubConfig;
}

/**
 * Read GitHub configuration from config.json
 */
export async function readGitHubConfig(
  cwd: string = process.cwd()
): Promise<GitHubConfig | null> {
  const configPath = path.join(cwd, 'openspec', 'config.json');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as ConfigFile;
    return config.github || null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw err;
  }
}

/**
 * Write GitHub configuration to config.json
 */
export async function writeGitHubConfig(
  githubConfig: GitHubConfig,
  cwd: string = process.cwd()
): Promise<void> {
  const configPath = path.join(cwd, 'openspec', 'config.json');
  
  // Read existing config or create new one
  let config: ConfigFile = {};
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(content) as ConfigFile;
  } catch {
    // File doesn't exist, use empty config
  }
  
  // Update github section
  config.github = githubConfig;
  
  // Ensure openspec directory exists
  const openspecDir = path.dirname(configPath);
  await fs.mkdir(openspecDir, { recursive: true });
  
  // Write with pretty formatting
  const content = JSON.stringify(config, null, 2) + '\n';
  await fs.writeFile(configPath, content, 'utf-8');
}

/**
 * Get GitHub configuration with fallbacks and auto-discovery
 */
export async function getGitHubConfig(
  cwd: string = process.cwd()
): Promise<GitHubConfig> {
  // Try reading from config.json
  let config = await readGitHubConfig(cwd);
  
  if (!config) {
    // Try to infer from git remote
    config = await inferGitHubConfigFromRemote(cwd);
    
    if (!config) {
      throw new Error(
        'GitHub repository not configured. Add to openspec/config.json:\n' +
        '{\n' +
        '  "github": {\n' +
        '    "owner": "your-org",\n' +
        '    "repo": "your-repo"\n' +
        '  }\n' +
        '}'
      );
    }
  }
  
  return config;
}

/**
 * Attempt to infer GitHub owner and repo from git remote
 */
async function inferGitHubConfigFromRemote(
  cwd: string
): Promise<GitHubConfig | null> {
  try {
    const { stdout } = await execAsync('git remote -v', { cwd });
    
    // Look for origin remote with GitHub URL
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (!line.includes('origin')) continue;
      
      // Try to parse GitHub URL
      const match = line.match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?[\s)]/);
      if (match) {
        const [, owner, repo] = match;
        return {
          owner,
          repo,
          defaultLabels: ['openspec'],
        };
      }
    }
    
    return null;
  } catch {
    return null; // Not a git repo or no remotes
  }
}

/**
 * Get GitHub token from environment or config
 */
export function getGitHubToken(
  config: GitHubConfig | null = null
): string | null {
  // Prefer environment variable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  
  // Fallback to config file
  if (config?.token) {
    return config.token;
  }
  
  return null;
}

/**
 * Get GitHub token or throw descriptive error
 */
export function requireGitHubToken(
  config: GitHubConfig | null = null
): string {
  const token = getGitHubToken(config);
  
  if (!token) {
    throw new Error(
      'GitHub token required. Choose one:\n' +
      '1. Set environment variable: export GITHUB_TOKEN=ghp_xxx\n' +
      '2. Add to openspec/config.json: { "github": { "token": "ghp_xxx" } }\n' +
      '\n' +
      'Create a token at: https://github.com/settings/tokens/new\n' +
      'Required scopes: repo (Full control of private repositories)'
    );
  }
  
  return token;
}

/**
 * Validate GitHub configuration
 */
export function validateGitHubConfig(config: GitHubConfig): void {
  if (!config.owner || !config.repo) {
    throw new Error(
      'GitHub configuration must include "owner" and "repo" fields'
    );
  }
  
  if (typeof config.owner !== 'string' || typeof config.repo !== 'string') {
    throw new Error(
      'GitHub "owner" and "repo" must be strings'
    );
  }
  
  if (config.owner.trim() === '' || config.repo.trim() === '') {
    throw new Error(
      'GitHub "owner" and "repo" cannot be empty'
    );
  }
}
