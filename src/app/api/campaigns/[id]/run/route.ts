import { NextRequest, NextResponse } from 'next/server';
import { runCampaign } from '@/lib/scheduler';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Don't await — fire and forget, return immediately
  runCampaign(id, 'manual').catch(console.error);
  return NextResponse.json({ triggered: true });
}
