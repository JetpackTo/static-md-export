// md-export.config.js — place in your project root
// Run: npx static-md-export

export default {
  collections: [
    // Standard blog
    { src: 'src/content/blog', output: 'dist/blog' },
    // Articles section
    { src: 'src/content/articles', output: 'dist/articles' },
    // Case studies with a different folder name
    { src: 'src/content/case-studies', output: 'dist/case-studies' },
  ],
};
