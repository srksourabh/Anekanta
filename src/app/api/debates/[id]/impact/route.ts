import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Compute impact scores for all arguments in a debate.
 * Score (0-100) from:
 *   Vote weight (40%): normalized average vote × total votes
 *   Response depth (20%): max depth of sub-tree below this argument
 *   Engagement (20%): total votes + comments + reactions
 *   Descendants (20%): total sub-arguments beneath it
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  // Get all arguments with vote/comment/reaction counts
  const args = await db.prepare(`
    SELECT a.id, a.type, a.parent_id, a.depth, a.vote_score, a.content, a.perspective, a.author_id,
      (SELECT COUNT(*) FROM votes WHERE argument_id = a.id) as vote_count,
      (SELECT COUNT(*) FROM comments WHERE argument_id = a.id) as comment_count,
      (SELECT COUNT(*) FROM reactions WHERE argument_id = a.id) as reaction_count
    FROM arguments a
    WHERE a.debate_id = ? AND a.type != 'thesis'
  `).all(debateId) as any[];

  if (args.length === 0) {
    return NextResponse.json({
      topPro: [], topCon: [],
      perspectiveBreakdown: [],
      stats: { totalArguments: 0, totalVotes: 0, totalParticipants: 0, avgDepth: 0, proCount: 0, conCount: 0 },
    });
  }

  // Build parent-child map for computing descendants and max depth
  const childrenMap = new Map<string, string[]>();
  for (const a of args) {
    if (a.parent_id) {
      if (!childrenMap.has(a.parent_id)) childrenMap.set(a.parent_id, []);
      childrenMap.get(a.parent_id)!.push(a.id);
    }
  }

  // Compute descendants count and max sub-tree depth recursively
  const descendantCache = new Map<string, number>();
  const depthCache = new Map<string, number>();

  function computeDescendants(id: string): number {
    if (descendantCache.has(id)) return descendantCache.get(id)!;
    const children = childrenMap.get(id) || [];
    let count = children.length;
    for (const child of children) {
      count += computeDescendants(child);
    }
    descendantCache.set(id, count);
    return count;
  }

  function computeMaxDepth(id: string): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const children = childrenMap.get(id) || [];
    if (children.length === 0) { depthCache.set(id, 0); return 0; }
    let maxD = 0;
    for (const child of children) {
      maxD = Math.max(maxD, 1 + computeMaxDepth(child));
    }
    depthCache.set(id, maxD);
    return maxD;
  }

  // Find max values for normalization
  let maxVotes = 1, maxEngagement = 1, maxDescendants = 1, maxSubDepth = 1;
  for (const a of args) {
    const desc = computeDescendants(a.id);
    const subDepth = computeMaxDepth(a.id);
    const engagement = a.vote_count + a.comment_count + a.reaction_count;
    if (a.vote_count > maxVotes) maxVotes = a.vote_count;
    if (engagement > maxEngagement) maxEngagement = engagement;
    if (desc > maxDescendants) maxDescendants = desc;
    if (subDepth > maxSubDepth) maxSubDepth = subDepth;
  }

  // Compute scores
  const scored = args.map(a => {
    const desc = computeDescendants(a.id);
    const subDepth = computeMaxDepth(a.id);
    const engagement = a.vote_count + a.comment_count + a.reaction_count;

    // Vote weight: avg score (0-4 scale → 0-1) × volume factor (0-1)
    const avgVote = a.vote_count > 0 ? a.vote_score / a.vote_count : 0;
    const voteWeight = (avgVote / 4) * (a.vote_count / maxVotes) * 40;

    const responseDepth = (subDepth / maxSubDepth) * 20;
    const engagementScore = (engagement / maxEngagement) * 20;
    const descendantScore = (desc / maxDescendants) * 20;

    const score = Math.round(voteWeight + responseDepth + engagementScore + descendantScore);

    return {
      id: a.id,
      type: a.type,
      content: a.content,
      perspective: a.perspective,
      score,
      voteWeight: Math.round(voteWeight * 10) / 10,
      responseDepth: Math.round(responseDepth * 10) / 10,
      engagement: Math.round(engagementScore * 10) / 10,
      descendants: Math.round(descendantScore * 10) / 10,
    };
  });

  // Top 3 pro and con by impact score
  const topPro = scored.filter(a => a.type === 'pro').sort((a, b) => b.score - a.score).slice(0, 3);
  const topCon = scored.filter(a => a.type === 'con').sort((a, b) => b.score - a.score).slice(0, 3);

  // Perspective breakdown
  const perspectiveCounts = new Map<string, number>();
  for (const a of args) {
    if (a.perspective) {
      perspectiveCounts.set(a.perspective, (perspectiveCounts.get(a.perspective) || 0) + 1);
    }
  }
  const perspectiveBreakdown = Array.from(perspectiveCounts.entries())
    .map(([perspective, count]) => ({ perspective, count }))
    .sort((a, b) => b.count - a.count);

  // Stats
  const uniqueAuthors = new Set(args.map(a => a.author_id));
  const totalVotes = args.reduce((sum, a) => sum + a.vote_count, 0);
  const avgDepth = args.reduce((sum, a) => sum + a.depth, 0) / args.length;

  return NextResponse.json({
    impacts: scored,
    topPro,
    topCon,
    perspectiveBreakdown,
    stats: {
      totalArguments: args.length,
      totalVotes,
      totalParticipants: uniqueAuthors.size,
      avgDepth,
      proCount: args.filter(a => a.type === 'pro').length,
      conCount: args.filter(a => a.type === 'con').length,
    },
  });
}
