import express from 'express';
import { randomUUID } from 'crypto';
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
} from '../services/userService.js';
import {
  createBackup,
  listBackups,
  restoreBackup,
} from '../services/backupService.js';
import {
  isValidCollection,
  readCollection,
  writeCollection,
  COLLECTION_NAMES,
  getCollectionSnapshot,
} from '../services/storageService.js';
import { authenticate } from '../auth/middleware.js';
import { sendInviteEmail } from '../services/emailService.js';

const router = express.Router();
const PRIMARY_ADMIN_EMAIL = 'dripfy@hasiripi.com';

router.use(authenticate({ requiredRole: 'admin' }));

function requirePrimaryAdmin(req, res, next) {
  const email = req.user?.email?.toLowerCase();
  if (email !== PRIMARY_ADMIN_EMAIL) {
    return res.status(403).json({ ok: false, error: 'Only the primary admin can perform this action' });
  }
  return next();
}

router.get('/users', async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ ok: true, users });
  } catch (error) {
    console.error('[admin] Failed to list users:', error);
    res.status(500).json({ ok: false, error: 'Failed to list users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = await createUser({
      email: req.body?.email,
      name: req.body?.name,
      role: req.body?.role || 'user',
      password: req.body?.password,
    });
    res.status(201).json({ ok: true, user });
  } catch (error) {
    console.error('[admin] Failed to create user:', error);
    res.status(400).json({ ok: false, error: error.message || 'Failed to create user' });
  }
});

router.post('/users/invite', async (req, res) => {
  const { firstName, lastName, email, phone, position, country, language } = req.body;

  if (!email || !firstName || !lastName || !position) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  try {
    // 1. Create User
    const name = `${firstName} ${lastName}`.trim();
    // Generate a secure random password if not provided
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

    // Determine role/permissions based on position (logic can be enhanced)
    const isAdmin = position.toLowerCase().includes('admin') || position.toLowerCase().includes('yönetici');
    const role = isAdmin ? 'admin' : 'user';

    const user = await createUser({
      email,
      name,
      role,
      password,
    });

    // 2. Add to Contacts (People)
    const people = await readCollection('people');
    const newPerson = {
      id: randomUUID(),
      firstName,
      lastName,
      email,
      phone,
      role: position,
      country,
      type: 'Individual', // Default type
    };
    people.push(newPerson);
    await writeCollection('people', people);

    // 3. Send Email
    await sendInviteEmail({
      email,
      name,
      password,
      position,
      lang: language || 'tr'
    });

    res.json({ ok: true, user, person: newPerson });
  } catch (error) {
    console.error('[admin] Failed to invite user:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to invite user' });
  }
});


router.patch('/users/:id', async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body || {});
    res.json({ ok: true, user });
  } catch (error) {
    console.error('[admin] Failed to update user:', error);
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({ ok: false, error: error.message || 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await deleteUser(req.params.id);
    res.json({ ok: true, user });
  } catch (error) {
    console.error('[admin] Failed to delete user:', error);
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({ ok: false, error: error.message || 'Failed to delete user' });
  }
});

router.get('/collections', requirePrimaryAdmin, async (_req, res) => {
  try {
    const snapshot = await getCollectionSnapshot();
    res.json({ ok: true, collections: COLLECTION_NAMES, snapshot });
  } catch (error) {
    console.error('[admin] Failed to get collection snapshot:', error);
    res.status(500).json({ ok: false, error: 'Failed to load collections' });
  }
});

router.get('/collections/:name/export', requirePrimaryAdmin, async (req, res) => {
  const { name } = req.params;
  if (!isValidCollection(name)) {
    return res.status(404).json({ ok: false, error: 'Collection not found' });
  }
  try {
    const data = await readCollection(name);
    res.json({ ok: true, data });
  } catch (error) {
    console.error(`[admin] Failed to export ${name}:`, error);
    res.status(500).json({ ok: false, error: 'Failed to export collection' });
  }
});

router.post('/collections/:name/import', requirePrimaryAdmin, async (req, res) => {
  const { name } = req.params;
  if (!isValidCollection(name)) {
    return res.status(404).json({ ok: false, error: 'Collection not found' });
  }
  if (!Array.isArray(req.body?.data)) {
    return res.status(400).json({ ok: false, error: 'data must be an array' });
  }
  try {
    await writeCollection(name, req.body.data);
    res.json({ ok: true });
  } catch (error) {
    console.error(`[admin] Failed to import ${name}:`, error);
    res.status(500).json({ ok: false, error: 'Failed to import collection' });
  }
});

router.get('/backups', requirePrimaryAdmin, async (_req, res) => {
  try {
    const backups = await listBackups();
    res.json({ ok: true, backups });
  } catch (error) {
    console.error('[admin] Failed to list backups:', error);
    res.status(500).json({ ok: false, error: 'Failed to list backups' });
  }
});

router.post('/backups', requirePrimaryAdmin, async (req, res) => {
  try {
    const backup = await createBackup({ reason: req.body?.reason || 'manual' });
    res.status(201).json({ ok: true, backup });
  } catch (error) {
    console.error('[admin] Failed to create backup:', error);
    res.status(500).json({ ok: false, error: 'Failed to create backup' });
  }
});

router.post('/backups/:id/restore', requirePrimaryAdmin, async (req, res) => {
  try {
    await restoreBackup(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('[admin] Failed to restore backup:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    res.status(status).json({ ok: false, error: error.message || 'Failed to restore backup' });
  }
});

export default router;
