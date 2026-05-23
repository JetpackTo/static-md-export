#!/usr/bin/env node
import { generateMarkdownVersions } from './generator.js';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2);
const getFlag = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const configPath = getFlag('--config') || 'md-export.config.js';
const srcFlag = getFlag('--src');
const outputFlag = getFlag('--output');

async function run() {
  let options;

  const absConfig = path.resolve(process.cwd(), configPath);
  if (fs.existsSync(absConfig)) {
    const mod = await import(absConfig);
    options = mod.default ?? mod;
  } else if (srcFlag && outputFlag) {
    options = { collections: [{ src: srcFlag, output: outputFlag }] };
  } else {
    console.error('Usage: static-md-export [--config md-export.config.js]');
    console.error('       static-md-export --src src/content/blog --output dist/blog');
    process.exit(1);
  }

  try {
    const results = await generateMarkdownVersions(options);
    const total = results.reduce((n, r) => n + r.count, 0);
    console.log(`\n✅ Done — ${total} markdown files generated across ${results.length} collection(s)`);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

run();
