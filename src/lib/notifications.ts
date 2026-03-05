import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * Auto-follow a debate for a user (idempotent — INSERT OR IGNORE).
 */
export async function autoFollowDebate(userId: string, debateId: string) {
  const db = await getDb();
  await db.prepare(
    `INSERT OR IGNORE INTO debate_follows (user_id, debate_id) VALUES (?, ?)`
  ).run(userId, debateId);
}

/**
 * Create notification rows for all followers of a debate, except the actor.
 */
export async function createNotificationsForFollowers(
  debateId: string,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: object = {}
) {
  const db = await getDb();

  // Get all followers except the person who triggered the action
  const followers = await db.prepare(
    `SELECT user_id FROM debate_follows WHERE debate_id = ? AND user_id != ?`
  ).all(debateId, actorId) as { user_id: string }[];

  if (followers.length === 0) return;

  // Insert a notification for each follower
  const metaStr = JSON.stringify(metadata);
  for (const follower of followers) {
    await db.prepare(
      `INSERT INTO notifications (id, user_id, debate_id, actor_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(nanoid(), follower.user_id, debateId, actorId, action, targetType, targetId, metaStr);
  }
}
