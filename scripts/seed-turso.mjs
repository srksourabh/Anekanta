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
  console.log('Seeding Turso database with quality demo data...\n');

  // Clear existing data (reverse dependency order)
  const tables = [
    'journal_sections', 'journals',
    'article_attachments', 'article_responses', 'articles',
    'debate_tags', 'argument_summaries',
    'claim_sources', 'claim_edits',
    'editorial_notes', 'debate_roles',
    'pending_claims', 'anonymous_identities',
    'tasks', 'team_members', 'teams',
    'bookmarks', 'last_seen',
    'notifications',
    'reactions', 'flagged_content', 'activity',
    'comments', 'votes', 'arguments', 'debates',
    'user_roles', 'password_resets', 'debate_follows',
    'users',
  ];
  for (const t of tables) {
    try { await run(`DELETE FROM ${t}`); } catch {}
  }
  console.log('Cleared existing data.');

  // ─── Users ───
  const hash = bcrypt.hashSync('password123', 12);
  const users = [
    { id: nanoid(), username: 'arjuna',     email: 'arjuna@example.com',     display_name: 'Arjuna Sharma',     avatar_color: '#0f766e', role: 'admin', bio: 'Platform founder. Passionate about structured discourse and Anekantavada.' },
    { id: nanoid(), username: 'meera',       email: 'meera@example.com',       display_name: 'Meera Patel',       avatar_color: '#be185d', role: 'user',  bio: 'Environmental policy researcher at JNU. Climate justice advocate.' },
    { id: nanoid(), username: 'vikram',      email: 'vikram@example.com',      display_name: 'Vikram Rao',        avatar_color: '#2563eb', role: 'user',  bio: 'Technology entrepreneur. Building AI ethics frameworks since 2019.' },
    { id: nanoid(), username: 'priya',       email: 'priya@example.com',       display_name: 'Priya Das',         avatar_color: '#059669', role: 'user',  bio: 'Professor of Philosophy, Presidency University. Specializes in Indian epistemology.' },
    { id: nanoid(), username: 'rahul',       email: 'rahul@example.com',       display_name: 'Rahul Gupta',       avatar_color: '#7b4d33', role: 'user',  bio: 'Economist at NITI Aayog. Policy modeling and development economics.' },
    { id: nanoid(), username: 'ananya',      email: 'ananya@example.com',      display_name: 'Ananya Krishnan',   avatar_color: '#ec4899', role: 'user',  bio: 'Constitutional law scholar. Supreme Court of India advocate.' },
    { id: nanoid(), username: 'dev',         email: 'dev@example.com',         display_name: 'Dev Chatterjee',    avatar_color: '#115e59', role: 'user',  bio: 'Neuroscientist at AIIMS. Consciousness studies and cognitive science.' },
    { id: nanoid(), username: 'sania',       email: 'sania@example.com',       display_name: 'Sania Mirza',       avatar_color: '#14b8a6', role: 'user',  bio: 'Education researcher. Working on NEP 2020 implementation and pedagogy reform.' },
  ];

  for (const u of users) {
    await run(
      'INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, role, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.username, u.email, hash, u.display_name, u.avatar_color, u.role, u.bio]
    );
  }
  console.log(`Inserted ${users.length} users.`);

  // Assign global roles
  await run('INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)', [nanoid(), users[3].id, 'editor', users[0].id]);
  await run('INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)', [nanoid(), users[5].id, 'moderator', users[0].id]);
  await run('INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)', [nanoid(), users[6].id, 'reviewer', users[0].id]);

  // ─── Debates ───
  const allDebates = [];
  const allArgIds = [];

  const debatesData = [
    // ───── Debate 1: AI Consciousness ─────
    {
      title: 'Can artificial intelligence ever achieve genuine consciousness?',
      thesis: 'Current trajectories in AI development will eventually produce systems with genuine subjective experience and consciousness, not merely sophisticated pattern matching.',
      tagline: 'The hard problem meets silicon minds',
      conclusion: '',
      category: 'technology',
      sub_category: 'artificial-intelligence',
      description: 'A deep exploration of whether computational systems can cross the threshold from intelligent behavior to genuine conscious experience, touching on philosophy of mind, neuroscience, and computer science.',
      tags: ['AI', 'consciousness', 'philosophy-of-mind', 'neuroscience', 'technology-ethics'],
      author: 0, // index into users
      pros: [
        {
          content: 'Consciousness likely emerges from information processing complexity rather than biological substrate. If the brain is fundamentally a computational organ, there is no principled reason silicon cannot replicate the same emergent properties given sufficient scale and architecture.',
          author: 2,
          replies: [
            { content: 'The integrated information theory (IIT) by Giulio Tononi provides a mathematical framework (Phi) that applies equally to biological and artificial systems, supporting substrate independence.', type: 'pro', author: 6, replies: [
              { content: 'IIT actually suggests most current AI architectures (feedforward networks) have near-zero Phi. The theory may argue against AI consciousness with current designs.', type: 'con', author: 3 },
            ]},
            { content: 'Substrate independence assumes we understand what generates consciousness. We might be missing a crucial biological mechanism that has no computational analog.', type: 'con', author: 3 },
          ]
        },
        {
          content: 'Large language models already exhibit behaviors previously considered unique markers of understanding: analogical reasoning, creative problem-solving, and contextual nuance. The gap between "simulating" and "having" understanding may be smaller than assumed.',
          author: 5,
          replies: [
            { content: 'The Chinese Room argument remains unrefuted: syntactic manipulation of symbols, no matter how sophisticated, does not constitute semantic understanding or phenomenal experience.', type: 'con', author: 3, replies: [
              { content: 'The systems reply to the Chinese Room is compelling: while no single component understands, the system as a whole might — just as no single neuron understands, yet the brain does.', type: 'pro', author: 2 },
            ]},
          ]
        },
        {
          content: 'Evolutionary pressure produced consciousness as an adaptive advantage for complex decision-making. If we engineer systems facing analogous decision complexity, similar emergent properties could arise through different optimization pressures.',
          author: 6,
        },
      ],
      cons: [
        {
          content: 'The "hard problem of consciousness" identified by David Chalmers remains completely unsolved. We have no scientific theory that explains WHY subjective experience arises from physical processes, making it impossible to engineer it deliberately.',
          author: 3,
          replies: [
            { content: 'Science has historically solved "impossible" problems. The hard problem may dissolve once we develop better conceptual frameworks, just as vitalism dissolved with biochemistry.', type: 'pro', author: 2, replies: [
              { content: 'The disanalogy with vitalism is that consciousness is the only phenomenon defined by subjective experience. We cannot verify its presence from the outside, making this categorically different from any previous scientific problem.', type: 'con', author: 6 },
            ]},
          ]
        },
        {
          content: 'Current AI systems are stochastic parrots (Bender & Gebru, 2021) — they learn statistical correlations in training data without building world models or having genuine comprehension. Scale does not bridge this qualitative gap.',
          author: 1,
          replies: [
            { content: 'Recent research on mechanistic interpretability shows that large models DO build internal representations and world models, not just statistical correlations. The "stochastic parrot" critique may be outdated.', type: 'pro', author: 2 },
          ]
        },
        {
          content: 'Consciousness may require embodiment — sensorimotor interaction with a physical environment — which pure software systems fundamentally lack. The enactivist tradition in cognitive science strongly argues for this position.',
          author: 6,
        },
      ],
    },

    // ───── Debate 2: UBI in India ─────
    {
      title: 'Should India implement a universal basic income to replace existing welfare schemes?',
      thesis: 'India should consolidate its fragmented welfare programs into a single universal basic income of Rs 3,000/month per adult, funded by redirecting existing subsidy budgets and rationalizing tax expenditures.',
      tagline: 'Direct cash vs. targeted subsidies',
      conclusion: '',
      category: 'economics',
      sub_category: 'public-policy',
      description: 'India spends over Rs 5 lakh crore annually on subsidies and welfare programs, many with significant leakage and exclusion errors. This debate examines whether UBI could deliver better outcomes.',
      tags: ['UBI', 'India', 'welfare', 'economics', 'poverty', 'public-policy'],
      author: 4,
      pros: [
        {
          content: 'The Economic Survey 2016-17 estimated that India could fund a UBI at 75% of poverty line by simply redirecting poorly-targeted subsidies. The fiscal math works if we rationalize existing spending rather than adding new expenditure.',
          author: 4,
          replies: [
            { content: 'The JAM trinity (Jan Dhan-Aadhaar-Mobile) finally provides the infrastructure for direct transfers at scale. 480 million Jan Dhan accounts and 99.9% Aadhaar coverage make UBI administratively feasible for the first time.', type: 'pro', author: 0 },
            { content: 'Replacing in-kind subsidies (PDS food grains, fertilizer) with cash assumes functioning local markets. In remote tribal and rural areas, markets fail and cash alone cannot ensure food security.', type: 'con', author: 1 },
          ]
        },
        {
          content: 'The Madhya Pradesh SEWA-UNICEF pilot (2011-13) showed that unconditional cash transfers to 6,000 individuals led to improved nutrition, school attendance, and small business investment — without the "laziness" effect critics predicted.',
          author: 1,
          replies: [
            { content: 'Small pilot programs cannot predict behavior at national scale. When everyone receives UBI simultaneously, inflationary pressures and labor market effects could be very different from isolated pilot results.', type: 'con', author: 4 },
          ]
        },
        {
          content: 'Current welfare targeting suffers from 40-60% exclusion errors (World Bank, 2018) — the poorest and most vulnerable are systematically left out due to documentation requirements, corruption, and bureaucratic barriers. Universality eliminates this injustice.',
          author: 5,
        },
      ],
      cons: [
        {
          content: 'At Rs 3,000/month for 900 million adults, UBI would cost Rs 32.4 lakh crore annually — roughly 12% of GDP and more than the entire current central government expenditure. This is fiscally impossible without massive tax increases or deficit spending.',
          author: 4,
          replies: [
            { content: 'The cost calculation should net out existing subsidies being replaced. India already spends Rs 5+ lakh crore on subsidies with significant waste. The net additional cost is much lower.', type: 'pro', author: 0, replies: [
              { content: 'Politically, no government can actually eliminate popular subsidies like PDS, LPG, or fertilizer subsidies. UBI becomes an additional cost, not a replacement.', type: 'con', author: 5 },
            ]},
          ]
        },
        {
          content: 'India still needs massive public investment in healthcare, education, and infrastructure. Distributing cash to individuals diverts resources from building the public goods that create long-term development — hospitals, schools, roads, and sanitation systems.',
          author: 1,
          replies: [
            { content: 'This is a false dichotomy. UBI replaces inefficient subsidies, not public investment. Building hospitals and sending cash transfers are complementary, not competing, priorities.', type: 'pro', author: 4 },
          ]
        },
        {
          content: 'In a patriarchal society, cash given to households often gets captured by male members for alcohol and tobacco rather than reaching women and children. In-kind benefits like food and nutrition supplements have better targeting within households.',
          author: 1,
        },
      ],
    },

    // ───── Debate 3: Constitutional Reform ─────
    {
      title: 'Does India need a new constitution for the 21st century?',
      thesis: 'The Indian Constitution, despite its remarkable adaptability through 105+ amendments, needs a comprehensive review and possible rewriting to address structural challenges of governance in the 21st century.',
      tagline: 'A 75-year-old framework for a new India',
      conclusion: '',
      category: 'law',
      sub_category: 'constitutional-law',
      description: 'India\'s Constitution has been amended over 105 times. Some argue it needs fundamental restructuring for modern challenges; others see its flexibility as its greatest strength.',
      tags: ['constitution', 'India', 'governance', 'law', 'democracy', 'federalism'],
      author: 5,
      pros: [
        {
          content: 'The anti-defection law (52nd Amendment) and party whip system have made legislators mere rubber stamps for party leadership, destroying the deliberative function of Parliament. No piecemeal amendment can fix this structural democratic deficit.',
          author: 5,
          replies: [
            { content: 'The anti-defection law was itself a constitutional response to rampant horse-trading in the 1980s. The cure for democratic deficits is better democratic design within the existing framework, not wholesale replacement.', type: 'con', author: 3 },
          ]
        },
        {
          content: 'India\'s colonial-era administrative structure — district collectors, IAS cadre, centralized planning — is embedded in constitutional provisions that make genuine decentralization impossible despite 73rd/74th amendments giving lip service to panchayati raj.',
          author: 0,
        },
        {
          content: 'Environmental rights, digital privacy, data sovereignty, and AI governance are 21st-century imperatives that the 1950 framers could not have anticipated. Retrofitting these through judicial interpretation creates constitutional law by unelected judges.',
          author: 2,
          replies: [
            { content: 'The Supreme Court has successfully evolved the Constitution through expansive interpretation — right to privacy (Puttaswamy, 2017), environmental rights (Article 21), and digital rights. This proves the framework is adaptable.', type: 'con', author: 5, replies: [
              { content: 'Judicial activism substituting for constitutional reform creates legitimacy problems. Unelected judges making de facto constitutional changes undermines democratic sovereignty more than a formal constitutional convention would.', type: 'pro', author: 3 },
            ]},
          ]
        },
      ],
      cons: [
        {
          content: 'The Indian Constitution is a living document that has successfully navigated 75 years of challenges — Emergency, linguistic reorganization, economic liberalization, terrorism. Its flexibility through amendment and judicial interpretation is precisely its genius.',
          author: 3,
          replies: [
            { content: 'Surviving is not thriving. India ranks 107th on the Human Development Index despite being the 5th largest economy. The Constitution enables governance but may not optimize it for the scale and complexity of modern India.', type: 'pro', author: 4 },
          ]
        },
        {
          content: 'In the current polarized political climate, a constitutional convention would be captured by majoritarian forces. The 1950 Constituent Assembly had Ambedkar, Nehru, and Patel — today\'s political class lacks comparable statesmanship for such a foundational exercise.',
          author: 5,
        },
        {
          content: 'The fundamental rights framework, directive principles, and basic structure doctrine form an interlocking system of checks and balances evolved over decades. Replacing this with an untested new framework risks catastrophic institutional failure.',
          author: 6,
        },
      ],
    },

    // ───── Debate 4: Climate & Nuclear ─────
    {
      title: 'Is nuclear energy essential for India to meet its net-zero 2070 target?',
      thesis: 'India must expand its nuclear capacity from 7 GW to at least 100 GW by 2050 as a necessary (not sufficient) condition for achieving its net-zero 2070 commitment without sacrificing economic growth.',
      tagline: 'Atoms for a carbon-free India',
      conclusion: '',
      category: 'environment',
      sub_category: 'energy-policy',
      description: 'India committed to net-zero by 2070 at COP26. With energy demand projected to triple by 2050, can renewables alone meet the challenge, or is nuclear indispensable?',
      tags: ['nuclear-energy', 'climate-change', 'India', 'energy-policy', 'net-zero', 'renewables'],
      author: 1,
      pros: [
        {
          content: 'India\'s electricity demand is projected to reach 15,820 TWh by 2070 (TERI estimate). Even with aggressive renewable deployment, solar/wind intermittency and India\'s limited pumped hydro storage potential mean nuclear must provide reliable baseload power.',
          author: 1,
          replies: [
            { content: 'India has enormous untapped pumped hydro potential — the Central Electricity Authority identified 96 GW of sites. Battery costs are falling 15% annually. The baseload argument assumes technology freezes at 2024 levels.', type: 'con', author: 2 },
          ]
        },
        {
          content: 'India has the world\'s largest thorium reserves (estimated 846,000 tonnes). The three-stage nuclear program, if completed, gives India energy independence for centuries. No other country has this strategic advantage in nuclear fuel.',
          author: 6,
          replies: [
            { content: 'The three-stage thorium program has been "10 years away" for 60 years. India\'s actual thorium reactor achievements are minimal despite decades of investment. This is a theoretical advantage, not a practical one.', type: 'con', author: 4, replies: [
              { content: 'The PFBR at Kalpakkam achieved criticality in 2024 after decades of delays. Stage 2 is finally operational. The technology trajectory is real, even if slower than hoped.', type: 'pro', author: 6 },
            ]},
          ]
        },
        {
          content: 'Nuclear has the smallest land footprint of any clean energy source. A 1 GW nuclear plant needs ~1 sq km; equivalent solar needs ~20 sq km. In land-scarce India, this matters enormously for scaling to 100+ GW.',
          author: 0,
        },
      ],
      cons: [
        {
          content: 'Solar costs in India have fallen to Rs 2.14/kWh (SECI auctions, 2024) while nuclear costs Rs 12-15/kWh (NPCIL estimates). Even with storage costs, renewables + storage are cheaper than new nuclear builds by a factor of 3-5x.',
          author: 4,
          replies: [
            { content: 'Comparing LCOE without accounting for system costs (grid stability, backup, transmission) is misleading. When you include the cost of making renewables reliable 24/7, the gap narrows significantly.', type: 'pro', author: 1 },
          ]
        },
        {
          content: 'India\'s nuclear safety record includes the Kaiga tritium contamination incident (2009), Kakrapar coolant leak (2016), and chronic underperformance of aging PHWR reactors. Scaling up 14x requires safety governance India has not demonstrated.',
          author: 1,
        },
        {
          content: 'Nuclear construction timelines of 10-15 years mean plants commissioned today won\'t generate power until 2035-2040. Solar and wind can be deployed in 12-18 months. For urgent climate action, renewables deliver faster decarbonization.',
          author: 2,
          replies: [
            { content: 'Small modular reactors (SMRs) promise 3-5 year construction timelines and factory-built standardization. India\'s BARC is developing the AHWR-300, specifically designed for faster deployment.', type: 'pro', author: 6 },
          ]
        },
      ],
    },

    // ───── Debate 5: Education ─────
    {
      title: 'Should India adopt the Finnish education model of eliminating standardized testing?',
      thesis: 'India should fundamentally reform its examination system by replacing high-stakes standardized tests (board exams, entrance exams) with continuous, competency-based assessment modeled on Finland\'s approach.',
      tagline: 'From exam warriors to lifelong learners',
      conclusion: '',
      category: 'education',
      sub_category: 'assessment-reform',
      description: 'India\'s education system produces 30 million exam-takers annually for board exams alone. Finland, consistently ranked #1 in education, has virtually no standardized testing. Is this model transferable?',
      tags: ['education', 'Finland', 'assessment', 'NEP-2020', 'India', 'pedagogy'],
      author: 7,
      pros: [
        {
          content: 'India loses an estimated 26 students daily to suicide, with exam pressure as a leading cause (NCRB data). The psychological toll of high-stakes testing is a public health emergency that cannot be justified by any assessment benefit.',
          author: 7,
          replies: [
            { content: 'Correlation is not causation. Student suicides have complex causes including family pressure, social media, and mental health access. Removing exams without addressing root causes may not reduce suicides.', type: 'con', author: 3 },
          ]
        },
        {
          content: 'NEP 2020 already envisions moving toward competency-based assessment. The policy framework exists — what is lacking is the political will to implement it against the coaching industry lobby worth Rs 58,000 crore annually.',
          author: 0,
        },
        {
          content: 'Finland\'s PISA scores consistently rank in the global top 10 without standardized testing. Their system trusts trained teachers to assess students continuously, producing both equity and excellence simultaneously.',
          author: 7,
          replies: [
            { content: 'Finland has 5.5 million people and highly homogeneous demographics. India has 260 million school-age children across 22 languages. Scale and diversity make Finnish-style teacher-based assessment impractical.', type: 'con', author: 4 },
          ]
        },
      ],
      cons: [
        {
          content: 'In a society with deep caste, class, and regional inequalities, standardized exams are the ONLY meritocratic pathway for disadvantaged students. Removing them would entrench privilege by making subjective teacher assessments the gatekeeper.',
          author: 5,
          replies: [
            { content: 'The current exam system already entrenches privilege — urban students with coaching access score higher. A well-designed continuous assessment with blind external moderation could be more equitable, not less.', type: 'pro', author: 7 },
          ]
        },
        {
          content: 'India has 9.6 million teachers, many inadequately trained (ASER reports show 30% of government school teachers lack basic competencies). Finnish teachers have mandatory master\'s degrees. You cannot implement Finnish-style assessment with Indian teacher quality.',
          author: 4,
        },
        {
          content: 'Continuous assessment requires institutional trust that does not exist in India\'s education system. Mark inflation, favoritism, and corruption would flourish without the accountability check of external standardized examinations.',
          author: 6,
          replies: [
            { content: 'This is a solvable design problem. Technology-enabled assessment platforms with blind evaluation, random sampling audits, and cross-school moderation can prevent corruption while eliminating high-stakes testing.', type: 'pro', author: 2, replies: [
              { content: 'Technology solutions assume universal internet access and digital literacy among teachers and students. In rural India, 35% of schools lack electricity. The digital divide makes tech-based assessment another vector of inequality.', type: 'con', author: 1 },
            ]},
          ]
        },
      ],
    },

    // ───── Debate 6: Philosophy ─────
    {
      title: 'Is Anekantavada (many-sidedness) a more robust epistemology than Western binary logic?',
      thesis: 'The Jain philosophical framework of Anekantavada — which holds that truth is multi-faceted and can be expressed from multiple valid perspectives simultaneously — offers a more accurate model of reality than Aristotelian binary logic.',
      tagline: 'Can two contradictions both be true?',
      conclusion: '',
      category: 'philosophy',
      sub_category: 'epistemology',
      description: 'This meta-debate examines the philosophical foundation of the Anekanta platform itself: is multi-perspective reasoning superior to binary true/false logic?',
      tags: ['anekantavada', 'Jain-philosophy', 'epistemology', 'logic', 'Indian-philosophy', 'syadvada'],
      author: 3,
      pros: [
        {
          content: 'Quantum mechanics empirically demonstrates that reality is not binary — particles exist in superposition states until measured. Anekantavada\'s syadvada ("maybe") logic anticipated quantum logic by 2,500 years.',
          author: 3,
          replies: [
            { content: 'This is a false analogy. Quantum superposition is a precisely defined mathematical formalism, not a philosophical "maybe." Mapping ancient philosophy onto modern physics is poetic but not rigorous.', type: 'con', author: 6 },
          ]
        },
        {
          content: 'Most real-world problems — ethics, policy, governance — are genuinely multi-perspectival. Binary logic forces false dichotomies (pro/con, right/wrong) that oversimplify and polarize. Anekantavada naturally models the complexity of human disagreement.',
          author: 0,
        },
        {
          content: 'Modern developments in paraconsistent logic, fuzzy logic, and multi-valued logic independently converge toward the same insight Anekantavada expressed millennia ago: classical binary logic is a special case, not the universal framework.',
          author: 3,
        },
      ],
      cons: [
        {
          content: 'Binary logic underpins all of mathematics, computer science, and formal reasoning. Without the law of non-contradiction (A cannot be both true and not-true), no rigorous proof or computation is possible. Anekantavada cannot build bridges or write software.',
          author: 2,
          replies: [
            { content: 'Anekantavada does not deny binary logic — it contextualizes it. "Is this a particle or a wave?" gets the Anekantavada answer: "Both, depending on the frame of reference." Binary logic works within frames; Anekantavada works across frames.', type: 'pro', author: 3 },
          ]
        },
        {
          content: 'If everything is "maybe true from some perspective," then nothing is decisively false. This epistemological permissiveness can justify harmful relativism — every conspiracy theory is "true from some perspective."',
          author: 5,
          replies: [
            { content: 'Anekantavada has rigorous internal constraints through Syadvada\'s seven-fold predication (saptabhangi). It is not "anything goes" — it is a disciplined framework for qualifying truth claims with their conditions and limitations.', type: 'pro', author: 3 },
          ]
        },
        {
          content: 'Anekantavada works well for philosophical contemplation but fails as a decision framework. Leaders must make binary decisions: go to war or not, fund program X or Y. Multi-perspectival truth is a luxury of the contemplative, not the practical.',
          author: 4,
        },
      ],
    },
  ];

  for (let i = 0; i < debatesData.length; i++) {
    const d = debatesData[i];
    const author = users[d.author];
    const debateId = nanoid();
    const thesisId = nanoid();

    await run(
      'INSERT INTO debates (id, title, description, thesis, author_id, category, sub_category, tagline, conclusion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [debateId, d.title, d.description, d.thesis, author.id, d.category, d.sub_category || '', d.tagline, d.conclusion]
    );

    await run(
      'INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, NULL, ?, ?, ?, 0, ?)',
      [thesisId, debateId, author.id, d.thesis, 'thesis', Math.floor(Math.random() * 15) + 5]
    );

    await run(
      'INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), debateId, author.id, 'created', 'debate', debateId, JSON.stringify({ title: d.title })]
    );

    // Insert tags
    for (const tag of (d.tags || [])) {
      await run('INSERT INTO debate_tags (id, debate_id, tag) VALUES (?, ?, ?)', [nanoid(), debateId, tag]);
    }

    // Recursive argument inserter
    async function insertArgs(args, parentId, depth, type) {
      for (let j = 0; j < args.length; j++) {
        const a = args[j];
        const argAuthor = users[a.author];
        const argId = nanoid();
        const score = Math.floor(Math.random() * 12) + 1;
        const argType = a.type || type;

        await run(
          'INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, vote_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [argId, debateId, parentId, argAuthor.id, a.content, argType, depth, score]
        );
        await run(
          'INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [nanoid(), debateId, argAuthor.id, 'added_argument', 'argument', argId, JSON.stringify({ type: argType })]
        );
        allArgIds.push(argId);

        // Add votes from other users
        const numVotes = Math.floor(Math.random() * 4) + 2;
        for (let k = 0; k < numVotes; k++) {
          const voter = users[(a.author + k + 1) % users.length];
          try {
            await run(
              'INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)',
              [nanoid(), argId, voter.id, Math.floor(Math.random() * 4) + 1]
            );
          } catch {}
        }

        // Recurse into replies
        if (a.replies && a.replies.length > 0) {
          await insertArgs(a.replies, argId, depth + 1, argType);
        }
      }
    }

    await insertArgs(d.pros, thesisId, 1, 'pro');
    await insertArgs(d.cons, thesisId, 1, 'con');

    allDebates.push({ id: debateId, thesisId, title: d.title, authorId: author.id });
  }
  console.log(`Inserted ${debatesData.length} debates with nested argument trees.`);

  // ─── Comments ───
  const comments = [
    { argIdx: 0, author: 3, content: 'This is a strong point, but substrate independence is still a philosophical assumption, not an empirical finding. We need to be precise about what "complexity" means here.' },
    { argIdx: 2, author: 1, content: 'The Chinese Room thought experiment has been debated for 40+ years. I think the real issue is whether we can ever have a satisfactory test for machine consciousness.' },
    { argIdx: 5, author: 0, content: 'Could you provide the specific SEWA-UNICEF study citation? I want to read the methodology section on their measurement of "laziness effects."' },
    { argIdx: 8, author: 2, content: 'The anti-defection law issue is well-taken, but wouldn\'t a constitutional amendment suffice rather than a full rewrite?' },
    { argIdx: 12, author: 4, content: 'The LCOE comparison needs updating — the 2024 solar auction prices are even lower than what you cited.' },
    { argIdx: 15, author: 7, content: 'As someone working on NEP implementation, I can confirm that the coaching industry lobbying is the single biggest obstacle to assessment reform.' },
    { argIdx: 18, author: 6, content: 'The quantum mechanics analogy is philosophically interesting but I agree it shouldn\'t be taken literally. The mathematical structures are quite different.' },
    { argIdx: 20, author: 5, content: 'This point about harmful relativism is crucial. How does Anekantavada distinguish between legitimate perspectives and conspiracy theories?' },
  ];

  for (const c of comments) {
    if (allArgIds[c.argIdx]) {
      await run(
        'INSERT INTO comments (id, argument_id, author_id, content) VALUES (?, ?, ?, ?)',
        [nanoid(), allArgIds[c.argIdx], users[c.author].id, c.content]
      );
    }
  }
  console.log(`Inserted ${comments.length} comments.`);

  // ─── Reactions ───
  const reactionTypes = ['insightful', 'agree', 'disagree', 'thought_provoking'];
  for (let i = 0; i < Math.min(allArgIds.length, 25); i++) {
    const numReactions = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numReactions; j++) {
      const userIdx = (i + j + 1) % users.length;
      const emoji = reactionTypes[Math.floor(Math.random() * reactionTypes.length)];
      try {
        await run(
          'INSERT INTO reactions (id, argument_id, user_id, emoji) VALUES (?, ?, ?, ?)',
          [nanoid(), allArgIds[i], users[userIdx].id, emoji]
        );
      } catch {}
    }
  }
  console.log('Inserted reactions.');

  // ─── Sources on key arguments ───
  const sources = [
    { argIdx: 0, url: 'https://doi.org/10.1093/nc/niy013', quote: 'Integrated Information Theory posits that consciousness is identical to a specific structure of information processing.' },
    { argIdx: 4, url: 'https://dl.acm.org/doi/10.1145/3442188.3445922', quote: 'On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?' },
    { argIdx: 5, url: 'https://www.unicef.org/india/media/1846/file', quote: 'SEWA-UNICEF pilot: 6,000 individuals across 8 villages received unconditional cash transfers for 18 months.' },
    { argIdx: 8, url: 'https://indiankanoon.org/doc/127517806/', quote: 'K.S. Puttaswamy v. Union of India — Right to Privacy as fundamental right.' },
    { argIdx: 15, url: 'https://ncrb.gov.in/accidental-deaths-suicides-in-india', quote: 'NCRB Accidental Deaths & Suicides in India annual report data on student suicides.' },
    { argIdx: 18, url: 'https://plato.stanford.edu/entries/jainism-epistemology/', quote: 'Stanford Encyclopedia of Philosophy entry on Jain Epistemology and Anekantavada.' },
  ];

  for (const s of sources) {
    if (allArgIds[s.argIdx]) {
      await run(
        'INSERT INTO claim_sources (id, argument_id, url, quote, added_by) VALUES (?, ?, ?, ?, ?)',
        [nanoid(), allArgIds[s.argIdx], s.url, s.quote, users[0].id]
      );
    }
  }
  console.log(`Inserted ${sources.length} argument sources.`);

  // ─── Articles ───
  const articles = [
    {
      title: 'The Consciousness Threshold: When Does Intelligence Become Awareness?',
      summary: 'An exploration of the philosophical and scientific boundaries between sophisticated AI behavior and genuine conscious experience.',
      content: `The question of machine consciousness sits at the intersection of philosophy, neuroscience, and computer science. As large language models demonstrate increasingly sophisticated reasoning, creative writing, and even emotional responsiveness, the boundary between "simulating understanding" and "genuine comprehension" becomes harder to locate.\n\nDavid Chalmers' "hard problem of consciousness" — why subjective experience exists at all — remains the central obstacle. Even if we could build an AI that behaves identically to a conscious being in every measurable way, we would still face the philosophical zombie problem: how do we know it experiences anything at all?\n\nIntegrated Information Theory (IIT) offers one promising framework. Developed by neuroscientist Giulio Tononi, IIT proposes that consciousness corresponds to a mathematical quantity called Phi (Φ), which measures how much information a system generates above and beyond its individual parts. Crucially, IIT is substrate-independent — it applies to biological brains and silicon circuits alike.\n\nHowever, IIT also suggests that most current AI architectures (primarily feedforward neural networks) have extremely low Phi, meaning they may be fundamentally incapable of consciousness regardless of their behavioral sophistication. This creates an interesting possibility: AI might need to be architecturally redesigned, not just scaled up, to approach consciousness.\n\nThe enactivist tradition adds another dimension. Philosophers like Evan Thompson argue that consciousness requires embodiment — a physical body interacting with an environment through sensorimotor loops. Pure software, running on servers, would lack this grounding in physical experience.\n\nFor India, these questions have particular resonance. The Jain philosophical tradition of Anekantavada suggests that consciousness may be a graduated, multi-dimensional property rather than a binary on/off state. This framework might prove more useful than Western binary logic for thinking about the spectrum between rock and human that AI occupies.`,
      author: 6,
      category: 'technology',
    },
    {
      title: 'From Subsidies to Sovereignty: The Case for and Against Indian UBI',
      summary: 'A comprehensive analysis of India\'s readiness for universal basic income, examining fiscal feasibility, implementation infrastructure, and social impact evidence.',
      content: `India's welfare architecture is a complex edifice built over seven decades. From the Public Distribution System to MGNREGA, from PM-KISAN to Jan Dhan Yojana, the country runs hundreds of schemes across central and state governments. The result is impressive in ambition but troubled in execution: significant leakage, exclusion errors, and bureaucratic overhead consume resources meant for the poorest.\n\nThe Economic Survey of India 2016-17 made a bold case for UBI, arguing that India could fund a basic income at 75% of the poverty line by simply redirecting existing subsidies. The arithmetic was straightforward: India spends roughly 5% of GDP on subsidies, much of it reaching the non-poor or lost to corruption.\n\nThe Madhya Pradesh SEWA-UNICEF experiment (2011-2013) provided India's strongest empirical evidence. Over 6,000 individuals in 8 villages received unconditional cash transfers for 18 months. The results challenged conventional wisdom: nutrition improved, school enrollment increased, and small business activity grew. Crucially, labor supply did not decrease — the "laziness" prediction failed.\n\nBut scaling from village pilots to 1.4 billion people presents categorically different challenges. Macroeconomic effects — inflation, labor market shifts, fiscal sustainability — cannot be predicted from micro-experiments. The political economy is equally daunting: eliminating popular subsidies like PDS rations or LPG subsidies would face fierce resistance.\n\nThe JAM trinity (Jan Dhan-Aadhaar-Mobile) has created infrastructure that makes direct cash transfers technically feasible. But "technically feasible" and "politically implementable" are vastly different categories in Indian democracy.\n\nPerhaps the most compelling argument against UBI is the opportunity cost: India still needs massive investment in public healthcare, education, and infrastructure. Every rupee sent as cash transfer is a rupee not spent building the hospitals and schools that create long-term human capital.`,
      author: 4,
      category: 'economics',
    },
    {
      title: 'Anekantavada in the Age of Polarization: Ancient Wisdom for Modern Discourse',
      summary: 'How the Jain principle of many-sidedness can transform political discourse and public debate in an era of echo chambers and binary thinking.',
      content: `In an age of Twitter threads and cable news debates, political discourse has collapsed into binary tribal warfare. You are either pro-X or anti-X, left or right, progressive or conservative. The Jain philosophical tradition of Anekantavada — literally "many-sidedness" or "non-absolutism" — offers a radical alternative that is simultaneously ancient and urgently contemporary.\n\nAnekantavada holds that reality is fundamentally multi-faceted. No single perspective can capture the full truth of any complex phenomenon. This is not wishy-washy relativism — Anekantavada has rigorous internal structure through Syadvada, the doctrine of conditional predication, which provides seven modes (saptabhangi) for qualifying truth claims.\n\nThe seven modes are: (1) Maybe it is, (2) Maybe it is not, (3) Maybe it is and is not, (4) Maybe it is indescribable, (5) Maybe it is and is indescribable, (6) Maybe it is not and is indescribable, (7) Maybe it is, is not, and is indescribable. These are not vague hand-waving but precise logical categories for handling the inherent complexity of truth.\n\nApplied to modern debates, Anekantavada transforms the question from "Who is right?" to "From what perspective, under what conditions, is each position valid?" This is precisely what the Anekanta platform attempts to operationalize.\n\nConsider the climate vs. development debate. From the environmental perspective, aggressive emission cuts are urgently necessary. From the development perspective, cheap energy is essential for lifting billions from poverty. Anekantavada says both are simultaneously true — and that good policy must hold both truths in tension rather than choosing one and dismissing the other.\n\nThe practical power of this approach is visible in actual governance. India's National Action Plan on Climate Change attempts (imperfectly) to hold development and environment in productive tension. The best policies emerge not from one side winning, but from the creative synthesis that multi-perspectival thinking enables.`,
      author: 3,
      category: 'philosophy',
    },
  ];

  for (const a of articles) {
    const articleId = nanoid();
    await run(
      'INSERT INTO articles (id, title, content, summary, author_id, category, status, read_time_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [articleId, a.title, a.content, a.summary, users[a.author].id, a.category, 'published', Math.ceil(a.content.length / 1200)]
    );
  }
  console.log(`Inserted ${articles.length} articles.`);

  // ─── Journals ───
  if (allDebates.length >= 2) {
    const journal1Id = nanoid();
    await run(
      'INSERT INTO journals (id, debate_id, title, status, editor_id, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [journal1Id, allDebates[0].id, 'AI Consciousness: A Multi-Perspectival Analysis', 'published', users[3].id, new Date().toISOString()]
    );

    const sections1 = [
      { type: 'abstract', title: 'Abstract', content: 'This journal compiles and synthesizes the structured debate on whether artificial intelligence can achieve genuine consciousness. Drawing from philosophy of mind, neuroscience, and computer science, we present the strongest arguments from both sides and identify areas of genuine uncertainty.', order: 0 },
      { type: 'thesis_analysis', title: 'Thesis Analysis', content: 'The thesis that current AI trajectories will produce conscious systems rests on the assumption of substrate independence — that consciousness depends on computational structure rather than biological material. This is a strong but unproven claim that divides experts in the field.', order: 1 },
      { type: 'pro_synthesis', title: 'Arguments For AI Consciousness', content: 'The strongest pro arguments center on three pillars: (1) Integrated Information Theory provides a substrate-independent framework, (2) behavioral evidence from LLMs increasingly blurs the simulation/reality boundary, and (3) evolutionary analogy suggests consciousness could emerge from optimization pressure.', order: 2 },
      { type: 'con_synthesis', title: 'Arguments Against AI Consciousness', content: 'Opposition arguments are equally compelling: (1) The hard problem of consciousness remains unsolved, making deliberate engineering impossible, (2) current AI may be fundamentally different from conscious processing, and (3) embodiment may be a necessary condition that software lacks.', order: 3 },
      { type: 'conclusion', title: 'Editorial Conclusion', content: 'The debate reveals a genuine epistemological impasse. We lack the theoretical tools to definitively answer whether AI can be conscious, because we lack a complete theory of consciousness itself. Both sides argue from reasonable premises to divergent conclusions, exemplifying the Anekantavada principle that complex truths are irreducibly multi-perspectival.', order: 4 },
    ];

    for (const s of sections1) {
      await run(
        'INSERT INTO journal_sections (id, journal_id, section_type, title, content, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [nanoid(), journal1Id, s.type, s.title, s.content, s.order]
      );
    }

    const journal2Id = nanoid();
    await run(
      'INSERT INTO journals (id, debate_id, title, status, editor_id, reviewer_id, review_notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [journal2Id, allDebates[1].id, 'Universal Basic Income for India: Evidence and Feasibility', 'under_review', users[3].id, users[6].id, 'Strong analysis but needs updated cost figures post-2024 inflation data.']
    );

    const sections2 = [
      { type: 'abstract', title: 'Abstract', content: 'This working paper examines the viability of universal basic income as a replacement for India\'s fragmented welfare system, drawing on pilot study evidence, fiscal analysis, and comparative policy research.', order: 0 },
      { type: 'thesis_analysis', title: 'Policy Context', content: 'India\'s welfare spending exceeds Rs 5 lakh crore annually across hundreds of central and state schemes. Significant leakage (estimated 40-60% exclusion errors) and administrative overhead suggest room for radical simplification.', order: 1 },
    ];

    for (const s of sections2) {
      await run(
        'INSERT INTO journal_sections (id, journal_id, section_type, title, content, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [nanoid(), journal2Id, s.type, s.title, s.content, s.order]
      );
    }

    console.log('Inserted 2 journals with sections.');
  }

  // ─── Debate follows ───
  for (let i = 0; i < allDebates.length; i++) {
    const numFollowers = Math.floor(Math.random() * 4) + 3;
    for (let j = 0; j < numFollowers; j++) {
      const userIdx = (i + j) % users.length;
      try {
        await run('INSERT INTO debate_follows (user_id, debate_id) VALUES (?, ?)', [users[userIdx].id, allDebates[i].id]);
      } catch {}
    }
  }
  console.log('Inserted debate follows.');

  // ─── Flagged content ───
  if (allArgIds.length >= 10) {
    await run(
      'INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 'argument', allArgIds[7], 'misleading', 'The cited statistics may be outdated. Source verification needed.', users[4].id]
    );
    await run(
      'INSERT INTO flagged_content (id, content_type, content_id, reason, description, flagged_by) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 'argument', allArgIds[12], 'needs_source', 'Specific cost claims should be backed by verifiable sources.', users[1].id]
    );
    console.log('Inserted 2 flagged content entries.');
  }

  // ─── Debate roles ───
  if (allDebates.length >= 3) {
    await run(
      'INSERT INTO debate_roles (id, debate_id, user_id, role, assigned_by) VALUES (?, ?, ?, ?, ?)',
      [nanoid(), allDebates[0].id, users[3].id, 'editor', users[0].id]
    );
    await run(
      'INSERT INTO debate_roles (id, debate_id, user_id, role, assigned_by) VALUES (?, ?, ?, ?, ?)',
      [nanoid(), allDebates[0].id, users[5].id, 'moderator', users[0].id]
    );
    await run(
      'INSERT INTO debate_roles (id, debate_id, user_id, role, assigned_by) VALUES (?, ?, ?, ?, ?)',
      [nanoid(), allDebates[2].id, users[5].id, 'editor', users[0].id]
    );
    console.log('Inserted debate roles.');
  }

  console.log('\n=== Seed complete ===');
  console.log(`${users.length} users, ${debatesData.length} debates, ${allArgIds.length} arguments (with nested replies)`);
  console.log(`${articles.length} articles, 2 journals, ${comments.length} comments, ${sources.length} sources`);
  console.log('\nLogin credentials:');
  console.log('  Any email (e.g., arjuna@example.com), password: password123');
  console.log('  Arjuna = admin, Priya = editor, Ananya = moderator, Dev = reviewer');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
