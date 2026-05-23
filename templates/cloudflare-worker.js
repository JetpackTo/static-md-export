// Cloudflare Worker — content negotiation for markdown
// Deploy this as a Worker in front of your static site

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const accept = request.headers.get('Accept') || '';

    // Check if client wants markdown and path looks like a content page
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

    // Default: pass through to origin
    return fetch(request);
  },
};
