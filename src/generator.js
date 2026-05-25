// src/generator.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function stripMdx(content) {
  return content
    // Remove import/export statements
    .replace(/^(import|export)\s.+$/gm, '')
    // Remove self-closing JSX tags (PascalCase, kebab-case, namespaced)
    .replace(/<[A-Za-z][a-zA-Z0-9]*(?:\.[A-Za-z][a-zA-Z0-9]*)?(?:-[a-zA-Z0-9]+)*[^>]*\/>/g, '')
    // Remove JSX block tags — non-greedy per line to avoid cross-tag bleed
    // Use a simple open/close tag stripper that keeps inner content
    .replace(/<([A-Za-z][a-zA-Z0-9]*(?:\.[A-Za-z][a-zA-Z0-9]*)?(?:-[a-zA-Z0-9]+)*)[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    // Clean up extra blank lines left behind
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

function buildMarkdown(slug, data, body) {
  const title = data.title ?? slug;
  const date = formatDate(data.pubDate ?? data.date ?? data.publishedAt ?? null);
  const author = data.author ?? null;
  const description = data.description ?? null;
  const tags = data.tags ?? data.keywords ?? null;

  let out = `# ${title}\n\n`;
  if (date) out += `**Published:** ${date}\n`;
  if (author) out += `**Author:** ${author}\n`;
  out += '\n';
  if (description) out += `${description}\n\n`;
  if (tags && Array.isArray(tags) && tags.length > 0) {
    out += `**Tags:** ${tags.join(', ')}\n\n`;
  }
  out += `---\n\n`;
  out += body.trim();
  return out;
}

export async function generateCollection({ src, output, rootDir = process.cwd() }) {
  const srcDir = path.resolve(rootDir, src);
  const outDir = path.resolve(rootDir, output);

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  console.log(`📝 ${src} → ${output} (${files.length} files)`);

  const generated = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const raw = fs.readFileSync(path.join(srcDir, file), 'utf-8');
    const { data, content } = matter(raw);
    const body = file.endsWith('.mdx') ? stripMdx(content) : content;
    const markdown = buildMarkdown(slug, data, body);
    const outPath = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(outPath, markdown, 'utf-8');
    console.log(`  ✓ ${slug}.md`);
    generated.push(slug);
  }

  console.log(`✅ Generated ${generated.length} files → ${output}\n`);
  return { src, output, count: generated.length, files: generated };
}

export async function generateMarkdownVersions(options = {}) {
  const { collections = [], rootDir = process.cwd() } = options;

  if (collections.length === 0) {
    throw new Error('No collections configured. Provide at least one { src, output } entry.');
  }

  return Promise.all(collections.map(col => generateCollection({ ...col, rootDir })));
}
