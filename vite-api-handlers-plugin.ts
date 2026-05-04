// V4 hot-fix May 4 — run the Vercel-style /api/*.ts handlers inside the
// Vite dev server, so `npm run dev` works end-to-end without needing
// `vercel dev` running on a separate port.
//
// Each request to /api/<segment>/.../<x> resolves to api/<segment>/.../<x>.ts.
// The plugin uses Vite's ssrLoadModule to compile + cache on-the-fly, then
// adapts Node's IncomingMessage / ServerResponse so the handler sees the
// VercelRequest / VercelResponse shape it expects (.status, .json, .send,
// .setHeader chainable).
//
// .env values are merged into process.env so handlers can read secrets
// like TWILIO_AUTH_TOKEN / SUPABASE_SERVICE_ROLE_KEY without a Vite-time
// `define` for each one.
//
// Production is unaffected — this plugin only runs during `vite dev`.
// Deployed Vercel builds still serve api/*.ts the normal way.

import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';

interface PluginOptions {
  /** Repo-relative directory holding the api/*.ts handlers. Defaults to "api". */
  apiDir?: string;
}

export function viteApiHandlersPlugin(options: PluginOptions = {}): Plugin {
  const apiDir = options.apiDir ?? 'api';

  return {
    name: 'rebel-api-handlers',
    apply: 'serve', // dev-only — production routes via Vercel/host platform
    configureServer(server) {
      const apiRoot = path.resolve(server.config.root, apiDir);

      // Hydrate process.env from .env (and .env.local) so api/* files can
      // read non-VITE_ secrets. Vite's loadEnv with empty prefix returns
      // every key, including TWILIO_AUTH_TOKEN etc.
      const envFromFiles = loadEnv(server.config.mode, server.config.root, '');
      let injectedKeys = 0;
      for (const [key, value] of Object.entries(envFromFiles)) {
        if (process.env[key] === undefined && value !== undefined) {
          process.env[key] = value;
          injectedKeys += 1;
        }
      }
      if (injectedKeys > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[rebel-api-handlers] hydrated ${injectedKeys} env keys from .env into process.env for /api/* handlers`,
        );
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const segments = url.pathname
          .replace(/^\/api\//, '')
          .split('/')
          .filter(Boolean);
        if (segments.length === 0) return next();

        // Resolve <api>/<a>/<b>.ts or <api>/<a>/<b>/index.ts.
        const fileCandidate = path.join(apiRoot, ...segments) + '.ts';
        const indexCandidate = path.join(apiRoot, ...segments, 'index.ts');
        let handlerPath: string | null = null;
        if (fs.existsSync(fileCandidate)) handlerPath = fileCandidate;
        else if (fs.existsSync(indexCandidate)) handlerPath = indexCandidate;
        if (!handlerPath) {
          // Let other middlewares handle (or 404).
          return next();
        }

        try {
          const mod = await server.ssrLoadModule(handlerPath);
          const handler = (mod as { default?: unknown }).default;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: `Handler at ${path.relative(server.config.root, handlerPath)} has no default export`,
              }),
            );
            return;
          }

          const body = await readRequestBody(req);
          const vercelReq = req as unknown as Record<string, unknown>;
          vercelReq.body = body;
          vercelReq.query = Object.fromEntries(url.searchParams);

          const vercelRes = adaptResponse(res);

          // Surface uncaught throws as JSON 500s so the browser sees a
          // useful payload rather than a stalled connection.
          await (handler as (req: unknown, res: unknown) => unknown | Promise<unknown>)(
            vercelReq,
            vercelRes,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Handler threw';
          // eslint-disable-next-line no-console
          console.error(`[rebel-api-handlers] ${req.method} ${req.url} →`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
          }
        }
      });
    },
  };
}

// Minimal body parser. Twilio webhooks send form-encoded; everything else
// in this codebase sends JSON.
async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return resolve(undefined);
      const contentType = (req.headers['content-type'] ?? '').toLowerCase();
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
        return;
      }
      if (contentType.includes('application/x-www-form-urlencoded')) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }
      resolve(raw);
    });
    req.on('error', reject);
  });
}

// Wrap a Node ServerResponse with the chainable status/json/send helpers
// that @vercel/node provides. We mutate the original res so methods that
// the handler calls on the original (.setHeader, .end) keep working.
function adaptResponse(res: ServerResponse): ServerResponse & {
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
  send: (data: unknown) => unknown;
} {
  const adapted = res as ServerResponse & {
    status: (code: number) => unknown;
    json: (data: unknown) => unknown;
    send: (data: unknown) => unknown;
  };

  adapted.status = (code: number) => {
    res.statusCode = code;
    return adapted;
  };
  adapted.json = (data: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return adapted;
  };
  adapted.send = (data: unknown) => {
    if (data === undefined || data === null) {
      res.end();
    } else if (typeof data === 'string' || Buffer.isBuffer(data)) {
      res.end(data);
    } else {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(data));
    }
    return adapted;
  };
  return adapted;
}
