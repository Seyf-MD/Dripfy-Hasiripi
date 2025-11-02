import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import {
  readCollection,
  writeCollection,
} from './storageService.js';

const USERS_COLLECTION = 'users';

async function readUsers() {
  const data = await readCollection(USERS_COLLECTION);
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

async function writeUsers(users) {
  await writeCollection(USERS_COLLECTION, users);
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

export async function setLastLogin(userId, timestamp = new Date()) {
  const users = await readUsers();
  const index = users.findIndex(user => user.id === userId);
  if (index === -1) {
    return false;
  }
  users[index].lastLogin = new Date(timestamp).toISOString();
  await writeUsers(users);
  return true;
}

export async function getAllUsers() {
  const users = await readUsers();
  return users.map(mapUserToPublic);
}

export async function createUser({ email, name, role = 'user', password }) {
  const normalisedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalisedEmail) {
    throw new Error('Email is required');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const users = await readUsers();
  if (users.some(user => user.email?.toLowerCase() === normalisedEmail)) {
    throw new Error('Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: randomUUID(),
    email: normalisedEmail,
    name: typeof name === 'string' && name.trim() ? name.trim() : normalisedEmail,
    role: typeof role === 'string' && role.trim() ? role.trim() : 'user',
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return mapUserToPublic(user);
}

export async function updateUser(id, updates) {
  const users = await readUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('User not found');
  }

  const user = users[index];
  if (updates.email) {
    const normalisedEmail = updates.email.trim().toLowerCase();
    if (!normalisedEmail) {
      throw new Error('Email cannot be empty');
    }
    if (users.some(existing => existing.id !== id && existing.email?.toLowerCase() === normalisedEmail)) {
      throw new Error('Email already exists');
    }
    user.email = normalisedEmail;
  }

  if (typeof updates.name === 'string') {
    user.name = updates.name.trim();
  }

  if (typeof updates.role === 'string' && updates.role.trim()) {
    user.role = updates.role.trim();
  }

  if (typeof updates.password === 'string') {
    if (updates.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    user.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  users[index] = user;
  await writeUsers(users);
  return mapUserToPublic(user);
}

export async function deleteUser(id) {
  const users = await readUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('User not found');
  }

  const [deleted] = users.splice(index, 1);
  await writeUsers(users);
  return mapUserToPublic(deleted);
}
