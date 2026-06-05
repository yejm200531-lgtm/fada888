import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const logs = db
    .prepare('SELECT * FROM run_logs WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(id);
  return NextResponse.json(logs);
}
