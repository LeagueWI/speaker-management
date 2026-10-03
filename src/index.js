import * as health from '../functions/api/health.js';
import * as setup from '../functions/api/setup.js';
import * as state from '../functions/api/state.js';
import * as record from '../functions/api/record.js';
import * as batch from '../functions/api/batch.js';
import * as email from '../functions/api/email.js';

const routes = {
  '/api/health': health,
  '/api/setup': setup,
  '/api/state': state,
  '/api/record': record,
  '/api/batch': batch,
  '/api/email': email
};

const handlerForMethod = {
  GET: 'onRequestGet',
  POST: 'onRequestPost',
  PUT: 'onRequestPut',
  PATCH: 'onRequestPatch',
  DELETE: 'onRequestDelete',
  OPTIONS: 'onRequestOptions'
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = routes[url.pathname];

    if (route) {
      const handlerName = handlerForMethod[request.method];
      const handler = handlerName ? route[handlerName] : null;
      if (!handler) {
        const allowed = Object.entries(handlerForMethod)
          .filter(([, name]) => typeof route[name] === 'function')
          .map(([method]) => method)
          .join(', ');
        return json(
          { ok: false, error: `Method ${request.method} is not allowed for ${url.pathname}.` },
          405,
          allowed ? { Allow: allowed } : {}
        );
      }

      try {
        return await handler({
          request,
          env,
          params: {},
          data: {},
          functionPath: url.pathname,
          waitUntil: promise => ctx.waitUntil(promise),
          next: () => env.ASSETS.fetch(request)
        });
      } catch (err) {
        console.error('Unhandled API bridge error', err);
        return json({ ok: false, error: err?.message || 'Unexpected bridge error.' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'API route not found.' }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
