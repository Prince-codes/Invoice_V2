import { authJsonResponse, clearSessionCookie } from '../../_auth.js';

export async function onRequestPost({ request }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return authJsonResponse({ error: 'Request origin is not allowed.' }, 403);
  }

  return authJsonResponse(
    { message: 'Signed out.' },
    200,
    { 'Set-Cookie': clearSessionCookie(request.url) }
  );
}
