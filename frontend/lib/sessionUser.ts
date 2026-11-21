import { headers } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { decode, encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';

export interface SessionUser {
  email: string;
  name: string | null;
}

/** Lifetime of tokens issued to the native app. */
export const NATIVE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = () => authOptions.secret as string;

/** Sign a NextAuth-compatible JWT for the native app (same secret as web sessions). */
export async function issueNativeToken(user: { id: string; email: string; name: string | null; image?: string | null }) {
  const token = await encode({
    secret: secret(),
    maxAge: NATIVE_TOKEN_MAX_AGE,
    token: { id: user.id, email: user.email, name: user.name, picture: user.image ?? null, native: true },
  });
  return { token, expiresAt: new Date(Date.now() + NATIVE_TOKEN_MAX_AGE * 1000).toISOString() };
}

async function bearerUser(): Promise<SessionUser | null> {
  const auth = (await headers()).get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  try {
    const payload = await decode({ token: m[1], secret: secret() });
    if (!payload?.email) return null;
    return { email: String(payload.email), name: payload.name ? String(payload.name) : null };
  } catch {
    return null;
  }
}

/**
 * The signed-in user for this request: a web session cookie, or an
 * `Authorization: Bearer <token>` header from the mobile app.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const fromBearer = await bearerUser();
  if (fromBearer) return fromBearer;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return email ? { email, name: session?.user?.name ?? null } : null;
}
