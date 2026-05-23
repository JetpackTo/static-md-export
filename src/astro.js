import { generateMarkdownVersions } from './generator.js';

export function staticMdExport(options = {}) {
  return {
    name: '@jetpackto/static-md-export',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // dir is a URL object pointing to the dist folder
        const rootDir = process.cwd();
        await generateMarkdownVersions({ ...options, rootDir });
      },
    },
  };
}
