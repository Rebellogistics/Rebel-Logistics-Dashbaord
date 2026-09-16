/**
 * Writes a static HTML file for every public marketing route.
 *
 * Runs after both Vite builds:
 *   1. the normal client build  -> dist/
 *   2. an SSR build of entry-server -> dist-ssr/
 *
 * For each route it renders the React tree to a string, serialises the head
 * that page asked for via `useSeo`, and writes dist/<route>/index.html. Vercel
 * checks the filesystem before applying the SPA rewrite, so those files are
 * served directly and the rewrite only catches what is left (the dashboard).
 *
 * The client bundle still boots on top and hydrates, so behaviour is unchanged
 * for anyone with JavaScript. What changes is what a crawler gets on the first
 * fetch: finished HTML instead of an empty div.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const { render, getPrerenderRoutes } = await import(join(root, 'dist-ssr/entry-server.js'));

/** Escape a value being placed inside a double-quoted HTML attribute. */
const attr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape text placed between tags. */
const text = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function serialiseHead(tags) {
  return tags
    .map((tag) => {
      switch (tag.kind) {
        case 'title':
          return `<title>${text(tag.text)}</title>`;
        case 'meta':
          return `<meta ${tag.attr}="${attr(tag.key)}" content="${attr(tag.content)}">`;
        case 'link':
          return `<link rel="${attr(tag.rel)}" href="${attr(tag.href)}">`;
        case 'jsonld':
          // `<` is escaped so a string in the data can never close the script.
          return `<script type="application/ld+json" data-seo="${attr(tag.id)}">${JSON.stringify(
            tag.data,
          ).replace(/</g, '\\u003c')}</script>`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n    ');
}

const template = await readFile(join(dist, 'index.html'), 'utf8');

// The template's own title and description are the SPA defaults. Every
// pre-rendered page supplies its own, so drop them rather than emit two.
const base = template
  .replace(/\n?\s*<title>[\s\S]*?<\/title>/i, '')
  .replace(/\n?\s*<meta\s+name="description"[^>]*>/i, '');

if (!base.includes('</head>')) {
  throw new Error('dist/index.html has no </head> — cannot inject the pre-rendered head.');
}
if (!/<div id="root">\s*<\/div>/.test(base)) {
  throw new Error('dist/index.html has no empty <div id="root"></div> — cannot inject markup.');
}

// The SPA fallback needs its own shell. `/` is about to become the finished
// home page, so pointing the rewrite at index.html would serve home markup for
// every dashboard URL — a flash of the marketing site, then a hydration
// mismatch. app.html keeps the empty #root the app expects. vercel.json
// rewrites unmatched paths here.
const shell = template.replace(
  '</head>',
  '  <meta name="robots" content="noindex">\n  </head>',
);
await writeFile(join(dist, 'app.html'), shell, 'utf8');

const routes = getPrerenderRoutes();
const written = [];
const failed = [];

for (const route of routes) {
  let result;
  try {
    result = render(route);
  } catch (err) {
    failed.push({ route, reason: err?.message ?? String(err) });
    continue;
  }

  const { html: rendered, head } = result;

  // React 19's renderToString emits resource hints (<link rel="preload">) inline
  // at the top of the markup rather than into the head. Left in #root they are
  // real DOM children the client never renders, which fails hydration — and they
  // do nothing for the browser from inside the body. Lift them into the head,
  // where they actually earn their keep on LCP.
  const hoisted = [];
  const html = rendered.replace(/<link\b[^>]*>/g, (tag) => {
    hoisted.push(tag);
    return '';
  });

  if (!html || html.trim().length === 0) {
    failed.push({ route, reason: 'rendered empty markup' });
    continue;
  }
  if (!head || head.length === 0) {
    failed.push({ route, reason: 'page did not call useSeo — no head to write' });
    continue;
  }

  const hints = [...new Set(hoisted)].join('\n    ');
  const page = base
    .replace('</head>', `  ${serialiseHead(head)}${hints ? `\n    ${hints}` : ''}\n  </head>`)
    .replace(/<div id="root">\s*<\/div>/, `<div id="root">${html}</div>`);

  const outPath = route === '/' ? join(dist, 'index.html') : join(dist, route, 'index.html');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, page, 'utf8');
  written.push({ route, bytes: Buffer.byteLength(page) });
}

const total = written.reduce((n, w) => n + w.bytes, 0);
console.log(`\nPre-rendered ${written.length}/${routes.length} routes (${(total / 1024).toFixed(0)} KB)`);

const sample = ['/', '/about', '/logistics', '/areas/toorak'];
for (const route of sample) {
  const hit = written.find((w) => w.route === route);
  if (hit) console.log(`  ${route.padEnd(22)} ${(hit.bytes / 1024).toFixed(1)} KB`);
}

if (failed.length) {
  console.error(`\n${failed.length} route(s) failed to pre-render:`);
  for (const f of failed) console.error(`  ${f.route} — ${f.reason}`);
  process.exit(1);
}
