// Simple rule-based content moderation with toxicity scoring
// In production, replace with a real AI API (OpenAI moderation, Perspective API, etc.)

const TOXIC_PATTERNS = [
  // Hate speech indicators
  /\b(hate|kill|murder|destroy)\s+(all|every|them)\b/i,
  // Slurs and derogatory terms (simplified set)
  /\b(idiot|stupid|moron|retard|dumb)\b/i,
  // Threats
  /\b(i will|gonna|going to)\s+(kill|hurt|attack|destroy)\b/i,
  // Personal attacks
  /\b(you are|you're|ur)\s+(stupid|idiot|trash|garbage|worthless)\b/i,
];

const SPAM_PATTERNS = [
  /(.)\1{5,}/,  // Repeated characters
  /(buy|click|visit|check out|free money|earn \$)/i,
  /https?:\/\/\S+/g, // Multiple URLs
];

const FOUL_LANGUAGE = [
  // Basic profanity filter - add more as needed
  /\b(fuck|shit|bitch|ass|damn|hell|crap)\b/i,
  /\b(bastard|whore|slut|dick|cock|pussy)\b/i,
];

export interface ModerationResult {
  approved: boolean;
  score: number; // 0-1, higher = more toxic
  flags: ModerationFlag[];
  action: 'allow' | 'warn' | 'block' | 'review';
}

export interface ModerationFlag {
  type: 'toxicity' | 'spam' | 'foul_language' | 'personal_attack' | 'threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detail: string;
}

export function moderateContent(text: string): ModerationResult {
  const flags: ModerationFlag[] = [];
  let score = 0;

  // Check toxic patterns
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({
        type: 'toxicity',
        severity: 'high',
        detail: 'Content contains potentially harmful language',
      });
      score += 0.4;
    }
  }

  // Check threats
  if (/\b(i will|gonna|going to)\s+(kill|hurt|attack)/i.test(text)) {
    flags.push({
      type: 'threat',
      severity: 'critical',
      detail: 'Content contains a potential threat',
    });
    score += 0.5;
  }

  // Check personal attacks
  if (/\b(you are|you're)\s+(stupid|idiot|trash|worthless)/i.test(text)) {
    flags.push({
      type: 'personal_attack',
      severity: 'high',
      detail: 'Content contains a personal attack',
    });
    score += 0.3;
  }

  // Check spam
  let spamCount = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) spamCount++;
  }
  if (spamCount > 0) {
    flags.push({
      type: 'spam',
      severity: spamCount > 1 ? 'high' : 'medium',
      detail: 'Content may be spam',
    });
    score += 0.2 * spamCount;
  }

  // Check foul language
  let foulCount = 0;
  for (const pattern of FOUL_LANGUAGE) {
    const matches = text.match(pattern);
    if (matches) foulCount += matches.length;
  }
  if (foulCount > 0) {
    flags.push({
      type: 'foul_language',
      severity: foulCount > 2 ? 'high' : 'low',
      detail: `Content contains ${foulCount} instance(s) of inappropriate language`,
    });
    score += 0.15 * foulCount;
  }

  score = Math.min(score, 1);

  let action: ModerationResult['action'];
  if (score >= 0.7) action = 'block';
  else if (score >= 0.4) action = 'review';
  else if (score >= 0.15) action = 'warn';
  else action = 'allow';

  return {
    approved: action === 'allow' || action === 'warn',
    score,
    flags,
    action,
  };
}
