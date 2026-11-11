import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAllDocs, getOwner } from '@/lib/store';

// POST { eraseGuest?: boolean }
// Clears Sakhi's own cookies so the next person on this device starts fresh.
// Signed-in data stays safely in the account. A guest's data is tied only to
// this browser, so ending a guest session erases it when eraseGuest is true.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const owner = await getOwner();
  if (owner.isGuest && body.eraseGuest === true) {
    await deleteAllDocs(owner);
  }
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name === 'sakhi_guest_id' || c.name === 'sakhi_preferred_name' || c.name === 'sakhi_active_mode') {
      store.delete(c.name);
    }
  }
  return NextResponse.json({ success: true, wasGuest: owner.isGuest });
}
