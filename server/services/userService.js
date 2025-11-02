import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.resolve(__dirname, '../data/users.json');

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function findUserByEmail(email) {
  const users = await readUsers();
  const normalised = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return users.find(user => user.email?.toLowerCase() === normalised) || null;
}

export async function verifyPassword(user, plainPassword) {
  if (!user || typeof user.passwordHash !== 'string') {
    return false;
  }
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }
  return bcrypt.compare(plainPassword, user.passwordHash);
}

export function mapUserToPublic(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function updateUserPassword(email, plainPassword) {
  const normalised = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalised || typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }

  const users = await readUsers();
  const index = users.findIndex(user => user.email?.toLowerCase() === normalised);
  if (index === -1) {
    return false;
  }

  const hash = await bcrypt.hash(plainPassword, 10);
  users[index].passwordHash = hash;
  await writeUsers(users);
  return true;
}
