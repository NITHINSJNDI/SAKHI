import { NextResponse } from 'next/server';
import { getOwner, readAllDocs, storageMode } from '@/lib/store';
import { query } from '@/lib/db';

// GET: download everything Sakhi stores about the current user as JSON
// (data portability, in the spirit of GDPR Art. 20 / India's DPDP Act).
export async function GET() {
  try {
    const owner = await getOwner();
    const documents = await readAllDocs(owner);

    let account: any = null;
    let cycleLogs: any[] = [];
    let triageLogs: any[] = [];
    if (owner.email) {
      const user = await query('SELECT id, email, name, age, bmi, created_at FROM users WHERE email = $1', [owner.email]);
      account = user.rows[0] || { email: owner.email, name: owner.name };
      if (account?.id) {
        cycleLogs = (await query('SELECT * FROM cycle_logs WHERE user_id = $1 ORDER BY start_date DESC', [account.id])).rows;
        triageLogs = (await query('SELECT * FROM triage_logs WHERE user_id = $1 ORDER BY log_date DESC', [account.id])).rows;
      }
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      format: 'sakhi-export-v1',
      storage: await storageMode(),
      account: account || { guest: true },
      documents,
      cycleLogs,
      triageLogs,
    };
    const filename = `sakhi-data-${new Date().toISOString().split('T')[0]}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
