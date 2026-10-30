import {
  authJsonResponse,
  constantTimeStringEquals,
  createSessionCookie,
  getAuthConfiguration
} from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return authJsonResponse({ error: 'Request origin is not allowed.' }, 403);
  }

  const config = getAuthConfiguration(env);
  if (!config) {
    return authJsonResponse({ error: 'Login is not configured on the server.' }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return authJsonResponse({ error: 'Invalid login request.' }, 400);
  }

  const username = typeof payload?.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  if (!username || !password || username.length > 128 || password.length > 1024) {
    return authJsonResponse({ error: 'Invalid username or password.' }, 400);
  }

  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeStringEquals(username, config.username),
    constantTimeStringEquals(password, config.password)
  ]);
  if (!usernameMatches || !passwordMatches) {
    return authJsonResponse({ error: 'Invalid username or password.' }, 401);
  }

  const cookie = await createSessionCookie(username, config.secret, request.url);
  return authJsonResponse({ user: { username } }, 200, { 'Set-Cookie': cookie });
}
