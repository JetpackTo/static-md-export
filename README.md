# @jetpackto/static-md-export

Generate static `.md` versions of your content so AI agents get clean markdown instead of HTML.

---

## Why

AI agents and LLM tools increasingly send `Accept: text/markdown` when crawling sites. Serving raw HTML wastes tokens and loses structure — a typical article page is 90% nav, footer, and markup noise by the time an agent ingests it.

This tool generates a pre-built `.md` file for every piece of content at build time. Zero runtime cost. No middleware. No dynamic rendering. Your server routes `Accept: text/markdown` requests to the `.md` files using a handful of rewrite rules.

Works with any folder structure and any collection name — `blog/`, `articles/`, `case-studies/`, `posts/`, whatever you have. Handles both `.md` and `.mdx` source files. For `.mdx`, it strips import/export statements and JSX components and keeps the text content.

---

## Install

```bash
npm install -D @jetpackto/static-md-export
# or
pnpm add -D @jetpackto/static-md-export
```

---

## Quick start (CLI)

**1. Create a config file in your project root:**

```js
// md-export.config.js
export default {
  collections: [
    { src: 'src/content/blog', output: 'dist/blog' },
    { src: 'src/content/articles', output: 'dist/articles' },
  ],
};
```

**2. Run the generator:**

```bash
npx static-md-export
```

**Single-collection shorthand** (no config file needed):

```bash
npx static-md-export --src src/content/blog --output dist/blog
```

**Add to your build script in `package.json`:**

```json
{
  "scripts": {
    "build": "astro build && static-md-export"
  }
}
```

---

## Config reference

```js
// md-export.config.js
export default {
  collections: [
    {
      src: 'src/content/blog',      // Required. Relative path to your content directory.
      output: 'dist/blog',          // Required. Relative path where .md files will be written.
    },
  ],
};
```

| Option | Type | Description |
|--------|------|-------------|
| `collections` | `Array` | One entry per content collection. |
| `collections[].src` | `string` | Relative path to the source directory containing `.md` or `.mdx` files. Can be any folder name: `blog`, `posts`, `articles`, `case-studies`, etc. |
| `collections[].output` | `string` | Relative path where generated `.md` files will be written. |

---

## Astro integration

The Astro integration runs automatically at the end of every `astro build` via the `astro:build:done` hook.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { staticMdExport } from '@jetpackto/static-md-export/astro';

export default defineConfig({
  integrations: [
    staticMdExport({
      collections: [
        { src: 'src/content/blog', output: 'dist/blog' },
        { src: 'src/content/articles', output: 'dist/articles' },
      ],
    }),
  ],
});
```

---

## Frontmatter fields

The generator reads these frontmatter fields and renders them as structured metadata at the top of each `.md` file.

| Field | Aliases | Output |
|-------|---------|--------|
| `title` | — | `# Title` as h1. Falls back to the filename slug if not present. |
| `pubDate` | `date`, `publishedAt` | `**Published:** Month Day, Year` |
| `author` | — | `**Author:** Name` |
| `description` | — | Paragraph below the metadata block. |
| `tags` | `keywords` | `**Tags:** tag1, tag2, tag3` |

---

## Server setup

Each server config routes requests with `Accept: text/markdown` to the pre-built `.md` files. Adjust the path regex to match your URL structure.

### Nginx

```nginx
# Place inside your server {} block
location ~ ^/articles/([^/]+)/?$ {
    set $slug $1;
    if ($http_accept ~* "text/markdown") {
        rewrite ^ /articles/$slug.md last;
    }
    try_files $uri $uri/index.html =404;
}

location ~ ^/articles/.+\.md$ {
    default_type text/markdown;
    add_header Content-Type "text/markdown; charset=utf-8";
    add_header Cache-Control "public, max-age=3600";
    add_header X-Content-Format "markdown";
    try_files $uri =404;
}

# Duplicate for each collection:
# location ~ ^/blog/([^/]+)/?$ { ... }
```

Full template: [`templates/nginx.conf`](./templates/nginx.conf)

### Caddy

```caddyfile
@markdown_articles {
    path_regexp slug ^/articles/([^/]+)/?$
    header Accept *text/markdown*
}
rewrite @markdown_articles /articles/{re.slug.1}.md

@md_files path *.md
header @md_files Content-Type "text/markdown; charset=utf-8"
header @md_files Cache-Control "public, max-age=3600"
header @md_files X-Content-Format "markdown"
```

Full template: [`templates/Caddyfile`](./templates/Caddyfile)

### Apache

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP_ACCEPT} text/markdown
    RewriteRule ^articles/([^/]+)/?$ /articles/$1.md [L]
</IfModule>

<FilesMatch "\.md$">
    ForceType text/markdown
    Header set Content-Type "text/markdown; charset=utf-8"
    Header set Cache-Control "public, max-age=3600"
    Header set X-Content-Format "markdown"
</FilesMatch>
```

Full template: [`templates/apache.conf`](./templates/apache.conf)

### Vercel

Vercel does not support `Accept` header routing natively in `vercel.json`. The config below ensures `.md` files are served with the correct content type when accessed directly. For full content negotiation, use the Cloudflare Workers approach below.

```json
{
  "headers": [
    {
      "source": "/articles/:slug.md",
      "headers": [
        { "key": "Content-Type", "value": "text/markdown; charset=utf-8" },
        { "key": "Cache-Control", "value": "public, max-age=3600" },
        { "key": "X-Content-Format", "value": "markdown" }
      ]
    }
  ]
}
```

Full template: [`templates/vercel.json`](./templates/vercel.json)

### Cloudflare Workers

Deploy a Worker in front of your static site. This is the recommended approach for Vercel-hosted sites as well — put a Cloudflare Worker (or Pages Function) in front to handle the `Accept` header routing.

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const accept = request.headers.get('Accept') || '';

    const articleMatch = url.pathname.match(/^\/articles\/([^/]+)\/?$/);
    if (articleMatch && accept.includes('text/markdown')) {
      const mdUrl = new URL(url);
      mdUrl.pathname = `/articles/${articleMatch[1]}.md`;
      const mdResponse = await fetch(mdUrl.toString());
      if (mdResponse.ok) {
        return new Response(mdResponse.body, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Format': 'markdown',
          },
        });
      }
    }

    return fetch(request);
  },
};
```

Full template: [`templates/cloudflare-worker.js`](./templates/cloudflare-worker.js)

---

## How it works

1. At build time, reads all `.md` and `.mdx` files from each configured source directory.
2. Parses frontmatter with [`gray-matter`](https://github.com/jonschlinkert/gray-matter).
3. For `.mdx` files: strips `import`/`export` statements and JSX component tags, preserving any text content inside JSX blocks.
4. Builds a clean markdown document: h1 title, metadata lines, description paragraph, tags, separator, then the body content.
5. Writes one `.md` file per source file into the configured output directory, alongside your HTML build.
6. Your server routes `Accept: text/markdown` requests to the `.md` files using rewrite rules — no runtime processing required.

---

## License

MIT
