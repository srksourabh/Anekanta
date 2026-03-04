const ANIMALS = [
  'Wise Owl', 'Calm Elephant', 'Swift Deer', 'Bold Tiger',
  'Gentle Dove', 'Brave Lion', 'Clever Fox', 'Patient Turtle',
  'Curious Cat', 'Loyal Wolf', 'Free Eagle', 'Silent Snake',
  'Kind Bear', 'Noble Horse', 'Quick Rabbit', 'Deep Whale',
  'Bright Parrot', 'Steady Ox', 'Agile Monkey', 'Sacred Peacock',
  'Ancient Crane', 'Mystic Dolphin', 'Fierce Falcon', 'Humble Cow',
];

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#d946ef',
  '#e11d48', '#ea580c', '#65a30d', '#0891b2',
  '#7c3aed', '#c026d3', '#dc2626', '#059669',
  '#2563eb', '#9333ea', '#db2777', '#ca8a04',
];

/**
 * Generate a deterministic anonymous identity for a user within a debate.
 * Uses a simple hash of debateId + userId to pick an animal and color.
 */
export function generateAnonymousIdentity(debateId: string, userId: string): {
  name: string;
  color: string;
} {
  const combined = debateId + userId;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  hash = Math.abs(hash);

  return {
    name: ANIMALS[hash % ANIMALS.length],
    color: COLORS[hash % COLORS.length],
  };
}
