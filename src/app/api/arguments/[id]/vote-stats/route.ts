import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const argumentId = params.id;

  const rows = await db.prepare(
    'SELECT value, COUNT(*) as count FROM votes WHERE argument_id = ? GROUP BY value ORDER BY value'
  ).all(argumentId) as any[];

  const distribution = [0, 0, 0, 0, 0]; // indices 0-4
  let total = 0;
  let sum = 0;

  for (const row of rows) {
    const val = Number(row.value);
    if (val >= 0 && val <= 4) {
      distribution[val] = Number(row.count);
      total += Number(row.count);
      sum += val * Number(row.count);
    }
  }

  return NextResponse.json({
    distribution,
    total,
    average: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
  });
}
