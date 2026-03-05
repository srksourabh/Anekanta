import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserGlobalRoles } from '@/lib/permissions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  const globalRoles = await getUserGlobalRoles(user.id);
  return NextResponse.json({ ...user, globalRoles });
}
