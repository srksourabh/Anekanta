export interface Debate {
  id: string;
  title: string;
  description: string;
  thesis: string;
  author_id: string;
  category: string;
  status: string;
  is_anonymous?: boolean;
  tagline?: string;
  conclusion?: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_color?: string;
  argument_count?: number;
  vote_count?: number;
}

export interface Argument {
  id: string;
  debate_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  type: 'pro' | 'con' | 'thesis';
  depth: number;
  vote_score: number;
  is_anonymous?: boolean;
  created_at: string;
  author_name?: string;
  author_color?: string;
  children?: Argument[];
  user_vote?: number;
  comment_count?: number;
}

export interface Comment {
  id: string;
  argument_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_color?: string;
}

export interface Activity {
  id: string;
  debate_id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: string;
  created_at: string;
  user_name?: string;
  user_color?: string;
  debate_title?: string;
}

export interface FlaggedContent {
  id: string;
  content_type: 'debate' | 'argument' | 'comment';
  content_id: string;
  author_id: string;
  flagged_by: string;
  reason: string;
  flags: string;
  score: number;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
}

export interface Reaction {
  id: string;
  argument_id: string;
  user_id: string;
  type: 'insightful' | 'agree' | 'disagree' | 'thought_provoking';
  created_at: string;
}

export type ReactionType = 'insightful' | 'agree' | 'disagree' | 'thought_provoking';

export const CATEGORIES = [
  'politics', 'philosophy', 'science', 'ethics', 'technology',
  'economics', 'education', 'environment', 'health', 'society',
  'religion', 'culture', 'law', 'history', 'general'
] as const;

export const REACTION_TYPES = ['insightful', 'agree', 'disagree', 'thought_provoking'] as const;

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  author_id: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  cover_image_url?: string;
  read_time_minutes: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_color?: string;
  response_count?: number;
}

export interface ArticleResponse {
  id: string;
  article_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  type: 'agree' | 'disagree' | 'question' | 'elaboration';
  vote_score: number;
  created_at: string;
  author_name?: string;
  author_color?: string;
  children?: ArticleResponse[];
}

export interface Task {
  id: string;
  debate_id: string;
  created_by: string;
  assigned_to: string | null;
  task_type: 'write_claims' | 'vote_claims' | 'add_sources' | 'review_claims';
  target_count: number;
  current_count: number;
  status: 'active' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PendingClaim {
  id: string;
  debate_id: string;
  parent_id: string;
  author_id: string;
  content: string;
  type: 'pro' | 'con';
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  author_name?: string;
  author_color?: string;
}

export interface AnonymousIdentity {
  debate_id: string;
  user_id: string;
  anonymous_name: string;
  anonymous_color: string;
}

export interface ClaimEdit {
  id: string;
  argument_id: string;
  author_id: string;
  old_content: string;
  new_content: string;
  edit_type: string;
  created_at: string;
  author_name?: string;
}

export interface VoteDistribution {
  distribution: number[];
  total: number;
  average: number;
}
