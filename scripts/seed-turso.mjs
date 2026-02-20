import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error('TURSO_DATABASE_URL required'); process.exit(1); }

const client = createClient({ url, authToken: authToken || undefined });
const nanoid = () => randomBytes(10).toString('hex');

async function run(sql, args = []) {
  await client.execute({ sql, args });
}

async function seed() {
  console.log('Seeding Turso database...');

  // Clear existing data (reverse dependency order)
  const tables = ['reactions', 'flagged_content', 'activity', 'comments', 'votes', 'arguments', 'debates', 'users'];
  for (const t of tables) {
    await run(`DELETE FROM ${t}`);
  }
  console.log('Cleared existing data.');

  // --- Users ---
  const hash = bcrypt.hashSync('password123', 12);
  const colors = ['#a97847', '#0f766e', '#be185d', '#c74707', '#14b8a6'];
  const users = [
    { id: nanoid(), username: 'arjuna',   email: 'arjuna@example.com',   display_name: 'Arjuna',   avatar_color: colors[0], role: 'admin' },
    { id: nanoid(), username: 'draupadi', email: 'draupadi@example.com', display_name: 'Draupadi', avatar_color: colors[1], role: 'user' },
    { id: nanoid(), username: 'chanakya', email: 'chanakya@example.com', display_name: 'Chanakya', avatar_color: colors[2], role: 'user' },
    { id: nanoid(), username: 'gargi',    email: 'gargi@example.com',    display_name: 'Gargi',    avatar_color: colors[3], role: 'user' },
    { id: nanoid(), username: 'ashoka',   email: 'ashoka@example.com',   display_name: 'Ashoka',   avatar_color: colors[4], role: 'user' },
  ];

  for (const u of users) {
    await run(
      'INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.username, u.email, hash, u.display_name, u.avatar_color, u.role]
    );
  }
  console.log('Inserted 5 users.');

  // --- Debates ---
  const debates = [
    {
      title: 'Should artificial intelligence be granted legal personhood?',
      thesis: 'Advanced AI systems should be granted some form of legal personhood as they become more autonomous and capable of independent decision-making.',
      tagline: 'Can machines have rights?',
      conclusion: 'The question of AI personhood demands careful balancing of accountability and philosophical clarity.',
      category: 'technology',
      description: 'As AI becomes increasingly sophisticated, questions arise about legal rights, accountability, and the nature of personhood.',
      pros: [
        'Legal personhood would create clear accountability frameworks for AI actions, similar to how corporations have legal personhood.',
        'As AI develops greater autonomy, denying any form of legal recognition creates dangerous gaps in legal frameworks.',
        'Granting limited personhood could incentivize responsible AI development by creating legal obligations for AI behavior.',
      ],
      cons: [
        'Legal personhood requires consciousness and subjective experience, which current AI fundamentally lacks.',
        'Corporate personhood has already demonstrated the dangers of extending legal rights to non-human entities.',
        'AI personhood could be exploited to shield human developers from liability for their creations.',
      ],
    },
    {
      title: 'Is universal basic income superior to traditional welfare programs?',
      thesis: 'Universal basic income provides a more efficient, dignified, and effective safety net than means-tested welfare programs.',
      tagline: 'Cash for all, or targeted support?',
      conclusion: "The UBI debate ultimately hinges on whether universality's benefits outweigh its fiscal costs.",
      category: 'economics',
      description: 'Examining whether unconditional cash transfers are better than targeted social programs.',
      pros: [
        'UBI eliminates costly bureaucratic overhead of means-testing, which often consumes 15-30% of welfare budgets.',
        'Unconditional support removes the stigma and dignity issues associated with applying for targeted assistance.',
        'UBI creates a true floor that prevents anyone from falling through cracks in complex categorical programs.',
      ],
      cons: [
        'The fiscal cost of universal payments is enormously higher than targeted support for those who actually need it.',
        'Removing conditions removes incentive structures that traditional programs use to encourage self-sufficiency.',
        'Flat payments ignore that different people have vastly different needs that categorical programs address better.',
      ],
    },
    {
      title: 'Should philosophy be a mandatory subject in all schools?',
      thesis: 'Philosophy should be a core mandatory subject from primary school through secondary education, on par with mathematics and language.',
      tagline: 'Should we teach kids to think about thinking?',
      conclusion: 'Philosophy education offers clear benefits but faces practical implementation challenges.',
      category: 'education',
      description: 'Exploring whether systematic training in philosophical thinking should be standard curriculum.',
      pros: [
        'Philosophy develops critical thinking and logical reasoning skills that transfer to every other subject and life domain.',
        'Countries that introduced philosophy in schools (like some Scandinavian programs) show measurable improvement in student reasoning.',
        'Democratic citizenship requires the capacity for ethical reasoning and evaluating arguments, which philosophy specifically teaches.',
      ],
      cons: [
        'Curriculum time is zero-sum; adding philosophy means reducing time for subjects with more direct practical application.',
        'Philosophy requires mature cognitive development; teaching it to young children risks superficial engagement with deep concepts.',
        'Critical thinking can be taught within existing subjects rather than requiring a separate dedicated course.',
      ],
    },
    {
      title: 'Is nuclear energy essential for combating climate change?',
      thesis: 'Nuclear energy is an indispensable component of any realistic strategy to achieve net-zero carbon emissions by 2050.',
      tagline: 'Atoms for climate?',
      conclusion: 'Nuclear remains a powerful decarbonization tool whose risks must be weighed against climate urgency.',
      category: 'environment',
      description: 'Whether nuclear power must play a central role in decarbonization efforts.',
      pros: [
        'Nuclear provides reliable baseload power with near-zero carbon emissions, unlike intermittent renewables that need fossil backup.',
        'The energy density of nuclear is unmatched; a single plant can replace dozens of square miles of solar or wind installations.',
        'France demonstrated nuclear viability by decarbonizing its grid in under 20 years, a feat no renewables-only strategy has matched.',
      ],
      cons: [
        'Nuclear construction takes 10-15 years and costs billions in overruns, while renewables can be deployed in months at dropping prices.',
        'Unresolved waste storage, proliferation risks, and catastrophic accident potential (Chernobyl, Fukushima) are non-trivial externalities.',
        'Battery storage and grid interconnection are rapidly solving intermittency, making the baseload argument increasingly obsolete.',
      ],
    },
  ];

  const allArgIds = [];

  for (let i = 0; i < debates.length; i++) {
    const d = debates[i];
    const author = users[i % users.length];
    const debateId = nanoid();
    const thesisId = nanoid();

    await run(
      'INSERT INTO debates (id, title, description, thesis, author_id, category, tagline, conclusion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [debateId, d.title, d.description, d.thesis, author.id, d.category, d.tagline, d.conclusion]
    );

    await run(
      'INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, NULL, ?, ?, ?, 0, 0)',
      [thesisId, debateId, author.id, d.thesis, 'thesis']
    );

    await run(
      'INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), debateId, author.id, 'created', 'debate', debateId, JSON.stringify({ title: d.title })]
    );

    // Pro arguments
    for (let j = 0; j < d.pros.length; j++) {
      const argAuthor = users[(i + j + 1) % users.length];
      const argId = nanoid();
      const score = Math.floor(Math.random() * 12) + 1;

      await run(
        'INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [argId, debateId, thesisId, argAuthor.id, d.pros[j], 'pro', score]
      );
      await run(
        'INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nanoid(), debateId, argAuthor.id, 'added_argument', 'argument', argId, JSON.stringify({ type: 'pro' })]
      );
      allArgIds.push(argId);

      // Votes
      for (let k = 0; k < 3; k++) {
        const voter = users[(i + j + k + 2) % users.length];
        try {
          await run(
            'INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)',
            [nanoid(), argId, voter.id, Math.floor(Math.random() * 4) + 1]
          );
        } catch {}
      }
    }

    // Con arguments
    for (let j = 0; j < d.cons.length; j++) {
      const argAuthor = users[(i + j + 2) % users.length];
      const argId = nanoid();
      const score = Math.floor(Math.random() * 10) + 1;

      await run(
        'INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [argId, debateId, thesisId, argAuthor.id, d.cons[j], 'con', score]
      );
      await run(
        'INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nanoid(), debateId, argAuthor.id, 'added_argument', 'argument', argId, JSON.stringify({ type: 'con' })]
      );
      allArgIds.push(argId);

      for (let k = 0; k < 2; k++) {
        const voter = users[(i + j + k + 3) % users.length];
        try {
          await run(
            'INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)',
            [nanoid(), argId, voter.id, Math.floor(Math.random() * 4) + 1]
          );
        } catch {}
      }
    }
  }
  console.log('Inserted 4 debates with 24 arguments, votes, and activity.');

  // --- Flagged content ---
  if (allArgIds.length >= 2) {
    await run(
      'INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 'argument', allArgIds[0], 'toxic', 'Contains disrespectful language targeting a protected group.', users[1].id]
    );
    await run(
      'INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 'argument', allArgIds[1], 'spam', 'Commercial promotion unrelated to debate topic.', users[0].id]
    );
    console.log('Inserted 2 flagged content entries.');
  }

  // --- Comments ---
  if (allArgIds.length >= 4) {
    await run(
      'INSERT INTO comments (id, argument_id, author_id, content) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[0], users[2].id, 'This is a strong point, but it assumes corporations are a good model for AI governance.']
    );
    await run(
      'INSERT INTO comments (id, argument_id, author_id, content) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[3], users[3].id, 'Could you provide a source for the 15-30% figure on bureaucratic overhead?']
    );
    await run(
      'INSERT INTO comments (id, argument_id, author_id, content) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[5], users[0].id, 'The consciousness argument depends heavily on how we define consciousness itself.']
    );
    console.log('Inserted 3 comments.');
  }

  // --- Reactions ---
  if (allArgIds.length >= 6) {
    const reactionEmojis = ['insightful', 'agree', 'disagree', 'thought_provoking'];
    await run(
      'INSERT INTO reactions (id, argument_id, user_id, emoji) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[0], users[3].id, reactionEmojis[0]]
    );
    await run(
      'INSERT INTO reactions (id, argument_id, user_id, emoji) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[1], users[4].id, reactionEmojis[1]]
    );
    await run(
      'INSERT INTO reactions (id, argument_id, user_id, emoji) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[2], users[0].id, reactionEmojis[3]]
    );
    await run(
      'INSERT INTO reactions (id, argument_id, user_id, emoji) VALUES (?, ?, ?, ?)',
      [nanoid(), allArgIds[4], users[1].id, reactionEmojis[2]]
    );
    console.log('Inserted 4 reactions.');
  }

  console.log('\nSeed complete.');
  console.log('Login: any user email (e.g. arjuna@example.com), password: password123');
  console.log('Arjuna = admin, others = regular users.');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
