import { getDb } from './db';
import type { User } from './auth';

/**
 * Check if a user has a specific role (moderator/editor) for a given debate.
 */
export async function hasDebateRole(userId: string, debateId: string, role: 'moderator' | 'editor'): Promise<boolean> {
  const db = await getDb();
  const row = await db.prepare(
    'SELECT id FROM debate_roles WHERE debate_id = ? AND user_id = ? AND role = ?'
  ).get(debateId, userId, role);
  return !!row;
}

/**
 * Check if user can moderate a debate (is owner, admin, or has moderator role).
 */
export async function canModerate(user: User, debateId: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  const db = await getDb();
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  if (debate?.author_id === user.id) return true;
  return hasDebateRole(user.id, debateId, 'moderator');
}

/**
 * Check if user can edit/curate a debate (is owner, admin, or has editor role).
 */
export async function canEdit(user: User, debateId: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  const db = await getDb();
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  if (debate?.author_id === user.id) return true;
  return hasDebateRole(user.id, debateId, 'editor');
}

/**
 * Check if user is the debate owner.
 */
export async function isDebateOwner(userId: string, debateId: string): Promise<boolean> {
  const db = await getDb();
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  return debate?.author_id === userId;
}

/**
 * Check if user can post arguments to a debate based on its environment settings.
 */
export async function canPostArgument(user: User, debateId: string): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDb();
  const debate = await db.prepare(
    'SELECT author_id, who_can_post, max_arguments_per_user, argument_time_limit FROM debates WHERE id = ?'
  ).get(debateId) as any;

  if (!debate) return { allowed: false, reason: 'Debate not found' };

  // Owner and admin can always post
  if (debate.author_id === user.id || user.role === 'admin') return { allowed: true };

  // Check who_can_post setting
  if (debate.who_can_post === 'team_members') {
    const membership = await db.prepare(
      `SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.debate_id = ? AND tm.user_id = ?`
    ).get(debateId, user.id);
    if (!membership) return { allowed: false, reason: 'Only team members can post in this debate' };
  }

  // Check time limit
  if (debate.argument_time_limit) {
    const deadline = new Date(debate.argument_time_limit);
    if (new Date() > deadline) return { allowed: false, reason: 'The deadline for adding arguments has passed' };
  }

  // Check max arguments per user
  if (debate.max_arguments_per_user) {
    const count = await db.prepare(
      'SELECT COUNT(*) as c FROM arguments WHERE debate_id = ? AND author_id = ?'
    ).get(debateId, user.id) as any;
    if ((count?.c || 0) >= debate.max_arguments_per_user) {
      return { allowed: false, reason: `You have reached the maximum of ${debate.max_arguments_per_user} arguments for this debate` };
    }
  }

  return { allowed: true };
}
