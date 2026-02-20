(async () => {
  const initSqlJs = require('sql.js');
  const bcrypt = require('bcryptjs');
  const { randomBytes } = require('crypto');
  const path = require('path');
  const fs = require('fs');

  const DB_PATH = process.env.DATABASE_PATH || '/tmp/anekanta.db';
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Remove existing db for clean seed
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  // Initialize sql.js
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();

  // Initialize tables (same as db.ts)
  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, bio TEXT DEFAULT '', avatar_color TEXT DEFAULT '#a97847', role TEXT DEFAULT 'user', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS debates (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', thesis TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL DEFAULT 'general', status TEXT DEFAULT 'active', is_anonymous INTEGER DEFAULT 0, tagline TEXT DEFAULT '', conclusion TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS arguments (id TEXT PRIMARY KEY, debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE, parent_id TEXT REFERENCES arguments(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, type TEXT NOT NULL, depth INTEGER DEFAULT 0, vote_score INTEGER DEFAULT 0, is_anonymous INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), value INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), UNIQUE(argument_id, user_id));
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS flagged_content (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, content_id TEXT NOT NULL, reason TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'pending', flagged_by TEXT NOT NULL REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, resolved_by TEXT);
    CREATE TABLE IF NOT EXISTS reactions (id TEXT PRIMARY KEY, argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), emoji TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), UNIQUE(argument_id, user_id, emoji));
  `);

  const nanoid = () => randomBytes(10).toString('hex');
  const hash = bcrypt.hashSync('password123', 12);
  const colors = ['#a97847', '#0f766e', '#be185d', '#c74707', '#14b8a6'];

  // Users
  const users = [
    { id: nanoid(), username: 'arjuna', email: 'arjuna@example.com', display_name: 'Arjuna', avatar_color: colors[0], role: 'admin' },
    { id: nanoid(), username: 'draupadi', email: 'draupadi@example.com', display_name: 'Draupadi', avatar_color: colors[1], role: 'user' },
    { id: nanoid(), username: 'chanakya', email: 'chanakya@example.com', display_name: 'Chanakya', avatar_color: colors[2], role: 'user' },
    { id: nanoid(), username: 'gargi', email: 'gargi@example.com', display_name: 'Gargi', avatar_color: colors[3], role: 'user' },
    { id: nanoid(), username: 'ashoka', email: 'ashoka@example.com', display_name: 'Ashoka', avatar_color: colors[4], role: 'user' },
  ];

  for (const u of users) {
    sqlDb.run('INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.username, u.email, hash, u.display_name, u.avatar_color, u.role]);
  }

  // Debates with arguments
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
      conclusion: 'The UBI debate ultimately hinges on whether universality\'s benefits outweigh its fiscal costs.',
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

  const argIds = [];
  for (let i = 0; i < debates.length; i++) {
    const d = debates[i];
    const author = users[i % users.length];
    const debateId = nanoid();
    const thesisId = nanoid();

    sqlDb.run('INSERT INTO debates (id, title, description, thesis, author_id, category, tagline, conclusion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [debateId, d.title, d.description, d.thesis, author.id, d.category, d.tagline, d.conclusion]);
    sqlDb.run('INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [thesisId, debateId, null, author.id, d.thesis, 'thesis', 0, 0]);
    sqlDb.run('INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)', [nanoid(), debateId, author.id, 'created', 'debate', debateId, JSON.stringify({ title: d.title })]);

    // Add pro arguments
    for (let j = 0; j < d.pros.length; j++) {
      const argAuthor = users[(i + j + 1) % users.length];
      const argId = nanoid();
      const score = Math.floor(Math.random() * 12) + 1;
      sqlDb.run('INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [argId, debateId, thesisId, argAuthor.id, d.pros[j], 'pro', 1, score]);
      sqlDb.run('INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)', [nanoid(), debateId, argAuthor.id, 'added_argument', 'argument', argId, JSON.stringify({ type: 'pro' })]);
      argIds.push({ id: argId, type: 'pro' });

      // Add some votes
      for (let k = 0; k < 3; k++) {
        const voter = users[(i + j + k + 2) % users.length];
        try {
          sqlDb.run('INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)', [nanoid(), argId, voter.id, Math.floor(Math.random() * 4) + 1]);
        } catch {}
      }
    }

    // Add con arguments
    for (let j = 0; j < d.cons.length; j++) {
      const argAuthor = users[(i + j + 2) % users.length];
      const argId = nanoid();
      const score = Math.floor(Math.random() * 10) + 1;
      sqlDb.run('INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [argId, debateId, thesisId, argAuthor.id, d.cons[j], 'con', 1, score]);
      sqlDb.run('INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)', [nanoid(), debateId, argAuthor.id, 'added_argument', 'argument', argId, JSON.stringify({ type: 'con' })]);
      argIds.push({ id: argId, type: 'con' });

      for (let k = 0; k < 2; k++) {
        const voter = users[(i + j + k + 3) % users.length];
        try {
          sqlDb.run('INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)', [nanoid(), argId, voter.id, Math.floor(Math.random() * 4) + 1]);
        } catch {}
      }
    }
  }

  // Add demo flagged content entries
  const arjuna = users[0];
  const draupadi = users[1];
  if (argIds.length >= 2) {
    sqlDb.run('INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)', [nanoid(), 'argument', argIds[0].id, 'toxic', 'Contains disrespectful language targeting a protected group.', draupadi.id]);
    sqlDb.run('INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)', [nanoid(), 'argument', argIds[1].id, 'spam', 'Commercial promotion unrelated to debate topic.', arjuna.id]);
  }

  // Export database and save to file
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('Seed complete: 5 users, 4 debates with arguments and votes.');
  console.log('Arjuna has admin role; other users are regular users.');
  console.log('Added flagged_content and reactions tables with demo flag entries.');
  console.log('Login with any user email (e.g., arjuna@example.com) and password: password123');
})();
