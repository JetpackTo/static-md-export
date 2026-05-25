import { generateMarkdownVersions } from './generator.js';
import { fileURLToPath } from 'url';
import path from 'path';

export function staticMdExport(options = {}) {
  return {
    name: '@jetpackto/static-md-export',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // Derive rootDir from the dist dir Astro gives us (go up one level)
        const distDir = fileURLToPath(dir);
        const rootDir = path.dirname(distDir);
        try {
          await generateMarkdownVersions({ ...options, rootDir });
        } catch (err) {
          console.error('[@jetpackto/static-md-export] ❌', err.message);
          throw err;
        }
      },
    },
  };
}
