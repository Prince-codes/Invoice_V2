import { getAuthConfiguration, getSessionUser } from './_auth.js';

const publicPaths = new Set([
  '/',
  '/index.html',
  '/login.css',
  '/login.js',
  '/Assets/logo.png',
  '/api/auth/login',
  '/api/auth/session',
  '/api/auth/logout'
]);

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isPublicPath = publicPaths.has(pathname);

  if (!isPublicPath) {
    const config = getAuthConfiguration(env);
    if (!config) {
      return new Response('Authentication is not configured. Set LOGIN_USERNAME, LOGIN_PASSWORD, and SESSION_SECRET in Cloudflare Pages.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const username = await getSessionUser(request, config.secret);
    if (!username) {
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: new URL('/index.html', url).toString(),
          'Cache-Control': 'no-store'
        }
      });
    }

    data.username = username;

    if (
      pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'DELETE'].includes(request.method.toUpperCase()) &&
      request.headers.get('Origin') !== url.origin
    ) {
      return new Response(JSON.stringify({ error: 'Request origin is not allowed.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  if (!isPublicPath) headers.set('Cache-Control', 'no-store');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
