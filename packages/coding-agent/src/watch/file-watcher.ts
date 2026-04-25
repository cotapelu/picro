/**
 * File Watcher
 * Watch project files and suggest reload on changes
 */
import { watch } from 'fs';
import type { FSWatcher } from 'fs';
import { resolve, relative } from 'path';

export interface FileWatcherOptions {
  paths: string[];
  ignore?: string[];
  onChange?: (path: string) => void;
  debounceMs?: number;
}

export class FileWatcher {
  private watchers: FSWatcher[] = [];
  private options: Required<FileWatcherOptions>;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private changedFiles: Set<string> = new Set();

  constructor(options: FileWatcherOptions) {
    this.options = {
      paths: options.paths,
      ignore: options.ignore ?? ['node_modules', '.git', 'dist', '.coding-agent'],
      onChange: options.onChange ?? (() => {}),
      debounceMs: options.debounceMs ?? 500,
    };
  }

  start(): void {
    console.log('👀 Starting file watcher...');
    
    for (const path of this.options.paths) {
      try {
        const watcher = watch(path, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          
          const fullPath = resolve(path, filename);
          
          // Skip ignored paths
          if (this.options.ignore.some(ignored => {
            return filename.includes(ignored) || fullPath.includes(ignored);
          })) {
            return;
          }

          // Debounce changes
          this.changedFiles.add(fullPath);
          clearTimeout(this.debounceTimer!);
          this.debounceTimer = setTimeout(() => {
            if (this.changedFiles.size > 0) {
              const files = Array.from(this.changedFiles);
              this.changedFiles.clear();
              
              console.log(`\n📝 Files changed:`);
              files.forEach(f => console.log(`   ${relative(process.cwd(), f)}`));
              console.log(`\n💡 Press Ctrl+R to reload or continue working\n`);
              
              this.options.onChange(files[0]);
            }
          }, this.options.debounceMs);
        });

        this.watchers.push(watcher);
      } catch (err) {
        console.warn(`Failed to watch ${path}:`, err);
      }
    }
  }

  stop(): void {
    console.log('🛑 Stopping file watcher...');
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    clearTimeout(this.debounceTimer!);
    this.changedFiles.clear();
  }

  isWatching(): boolean {
    return this.watchers.length > 0;
  }
}

/**
 * Create watcher for project
 */
export function createProjectWatcher(projectPath: string): FileWatcher {
  return new FileWatcher({
    paths: [projectPath],
    ignore: [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.coding-agent',
      'coverage',
      '*.log',
    ],
    debounceMs: 300,
  });
}
