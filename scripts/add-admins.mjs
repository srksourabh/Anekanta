import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error('TURSO_DATABASE_URL required'); process.exit(1); }

const client = createClient({ url, authToken: authToken || undefined });
const nanoid = () => randomBytes(10).toString('hex');

async function addAdmins() {
  const hash = bcrypt.hashSync('password123', 12);
  const admins = [
    { username: 'dipanjan', email: 'dipanjansletterbox@gmail.com', display_name: 'Dipanjan', avatar_color: '#0f766e' },
    { username: 'sourabh', email: 'srksourabh@gmail.com', display_name: 'Sourabh', avatar_color: '#a97847' },
  ];

  for (const a of admins) {
    // Check if email already exists
    const existing = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [a.email] });
    if (existing.rows.length > 0) {
      // Update role to admin
      await client.execute({ sql: 'UPDATE users SET role = ? WHERE email = ?', args: ['admin', a.email] });
      console.log(`Updated ${a.email} to admin (already existed).`);
    } else {
      await client.execute({
        sql: 'INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [nanoid(), a.username, a.email, hash, a.display_name, a.avatar_color, 'admin'],
      });
      console.log(`Created admin: ${a.email}`);
    }
  }
  console.log('Done. Both accounts: password123, role: admin.');
}

addAdmins().catch(err => { console.error('Failed:', err); process.exit(1); });
