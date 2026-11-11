import { NextResponse } from 'next/server';
import { getOwner, readDoc, storageMode } from '@/lib/store';

// GET: lightweight "who am I" for client components (name, which modes are set
// up, consent status). Health data cookies are httpOnly, so the browser can no
// longer read them directly.
export async function GET() {
  try {
    const owner = await getOwner();
    const [her, preg, consent, storage] = await Promise.all([
      readDoc<any>('her_profile', null, owner),
      readDoc<any>('preg_profile', null, owner),
      readDoc<any>('consent', null, owner),
      storageMode(),
    ]);
    return NextResponse.json({
      authenticated: !owner.isGuest,
      email: owner.email || null,
      name: preg?.preferred_name || her?.preferred_name || owner.name?.split(' ')[0] || '',
      hasHerProfile: Boolean(her),
      hasMomProfile: Boolean(preg && preg.preferred_name),
      consent: consent || null,
      storage,
    });
  } catch (err: any) {
    console.error('/api/me error:', err);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
