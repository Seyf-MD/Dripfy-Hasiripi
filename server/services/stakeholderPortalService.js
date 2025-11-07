import { randomUUID, createHash } from 'crypto';
import {
  readCollection,
  writeCollection,
} from './storageService.js';
import { createUser } from './userService.js';
import { recordAuditLog } from './logService.js';
import { sendEmailNotification } from './notificationService.js';
import { recordUsageEvent } from './usageService.js';

const INVITATION_COLLECTION = 'stakeholderInvitations';
const PROFILE_COLLECTION = 'portalProfiles';
const DOCUMENT_COLLECTION = 'portalDocuments';
const SUPPORT_COLLECTION = 'portalSupportRequests';
const MESSAGE_COLLECTION = 'portalMessages';
const ACTIVITY_COLLECTION = 'portalActivity';

const INVITE_TOKEN_SECRET =
  process.env.PORTAL_INVITE_SECRET || process.env.JWT_SECRET || 'dripfy-portal-secret';
const SECURE_LINK_SECRET =
  process.env.PORTAL_DOCUMENT_SECRET || process.env.JWT_SECRET || 'dripfy-portal-doc-secret';

const DEFAULT_INVITE_EXPIRY_HOURS = Number(process.env.PORTAL_INVITE_TTL_HOURS || 72);
const DEFAULT_LINK_EXPIRY_MINUTES = Number(process.env.PORTAL_LINK_TTL_MINUTES || 30);

function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashToken(token, secret) {
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

async function readCollectionAsArray(collection) {
  const data = await readCollection(collection);
  return Array.isArray(data) ? data : [];
}

async function writeCollectionSafely(collection, data) {
  await writeCollection(collection, Array.isArray(data) ? data : []);
}

function buildDefaultStatuses() {
  const now = new Date();
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return [
    {
      id: 'status-intake',
      title: 'Onboarding Başlangıcı',
      description: 'Paydaş portala eriştiğinde temel bilgileri tamamlar.',
      status: 'in-progress',
      dueDate: new Date(now.getTime() + twoDays).toISOString(),
      acknowledgedAt: null,
      lastUpdatedAt: now.toISOString(),
    },
    {
      id: 'status-compliance',
      title: 'Uyumluluk Belgeleri',
      description: 'Gerekli belgeler yüklenir ve doğrulama için gönderilir.',
      status: 'pending',
      dueDate: new Date(now.getTime() + threeDays).toISOString(),
      acknowledgedAt: null,
      lastUpdatedAt: now.toISOString(),
    },
    {
      id: 'status-training',
      title: 'Operasyon Brifingi',
      description: 'Portal kullanımı ve MIS entegrasyonu için hızlı eğitim.',
      status: 'pending',
      dueDate: null,
      acknowledgedAt: null,
      lastUpdatedAt: now.toISOString(),
    },
  ];
}

async function recordPortalActivity({
  profileId,
  type,
  actor,
  summary,
  metadata,
}) {
  const activities = await readCollectionAsArray(ACTIVITY_COLLECTION);
  const entry = {
    id: randomUUID(),
    profileId,
    type,
    actor,
    summary,
    metadata: metadata || null,
    timestamp: new Date().toISOString(),
  };
  activities.push(entry);
  await writeCollectionSafely(ACTIVITY_COLLECTION, activities);
  return entry;
}

function resolveNotificationRecipient() {
  if (process.env.PORTAL_NOTIFICATIONS_EMAIL) {
    return process.env.PORTAL_NOTIFICATIONS_EMAIL;
  }
  if (process.env.SMTP_FROM) {
    return process.env.SMTP_FROM;
  }
  return process.env.SMTP_USER || null;
}

async function ensureUsageEvent({ action, metadata }) {
  try {
    await recordUsageEvent({
      status: 'success',
      model: 'portal-action',
      inputTokens: 0,
      outputTokens: 0,
      promptPreview: action,
      templateId: null,
      language: null,
      sources: ['portal', action],
      errorCode: null,
      totalTokens: 0,
    });
  } catch (error) {
    console.warn('[portal] Failed to record usage event', { action, metadata, error });
  }
}

export async function createPortalInvitation({
  email,
  name,
  company,
  invitedBy,
  scopes = [],
  expiresInHours = DEFAULT_INVITE_EXPIRY_HOURS,
  message,
}) {
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail) {
    throw new Error('E-posta gerekli');
  }

  const invitations = await readCollectionAsArray(INVITATION_COLLECTION);
  if (invitations.some((entry) => entry.email === normalisedEmail && entry.status === 'pending')) {
    throw new Error('Bu e-posta için zaten bekleyen bir davetiye var');
  }

  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  const invitation = {
    id: randomUUID(),
    email: normalisedEmail,
    name: typeof name === 'string' && name.trim() ? name.trim() : normalisedEmail,
    company: typeof company === 'string' && company.trim() ? company.trim() : null,
    invitedBy: invitedBy?.id || null,
    invitedByName: invitedBy?.name || null,
    tokenHash: hashToken(token, INVITE_TOKEN_SECRET),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'pending',
    scopes,
    message: message || null,
  };

  invitations.push(invitation);
  await writeCollectionSafely(INVITATION_COLLECTION, invitations);

  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);
  const profile = {
    id: randomUUID(),
    invitationId: invitation.id,
    email: normalisedEmail,
    contactName: invitation.name,
    company: invitation.company,
    stakeholderUserId: null,
    statuses: buildDefaultStatuses(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastSyncedAt: null,
  };
  profiles.push(profile);
  await writeCollectionSafely(PROFILE_COLLECTION, profiles);

  await recordAuditLog({
    user: invitedBy?.email || 'system',
    action: 'portal.invitation.created',
    targetType: 'portal-invitation',
    targetId: invitation.id,
    details: {
      email: normalisedEmail,
      company: invitation.company,
      scopes,
    },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'low',
  });

  await recordPortalActivity({
    profileId: profile.id,
    type: 'invitation.created',
    actor: {
      id: invitedBy?.id || 'system',
      name: invitedBy?.name || 'Sistem',
      email: invitedBy?.email || null,
    },
    summary: 'Harici paydaş davet edildi',
    metadata: {
      email: normalisedEmail,
      scopes,
    },
  });

  await ensureUsageEvent({ action: 'invitation.created', metadata: { email: normalisedEmail } });

  const recipient = resolveNotificationRecipient();
  if (recipient) {
    await sendEmailNotification({
      to: recipient,
      subject: 'Yeni portal davetiyesi oluşturuldu',
      text: `${normalisedEmail} adresine davetiye gönderildi. Davet eden: ${invitedBy?.name || 'Sistem'}.`,
    });
  }

  return { invitation, token, profile };
}

function resolveProfileByInvitation(profiles, invitationId) {
  return profiles.find((entry) => entry.invitationId === invitationId) || null;
}

export async function acceptPortalInvitation({ token, password, name }) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token gerekli');
  }
  if (!password || password.length < 8) {
    throw new Error('Parola en az 8 karakter olmalı');
  }

  const invitations = await readCollectionAsArray(INVITATION_COLLECTION);
  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);

  const tokenHash = hashToken(token, INVITE_TOKEN_SECRET);
  const invitation = invitations.find((entry) => entry.tokenHash === tokenHash);
  if (!invitation) {
    throw new Error('Davet bulunamadı veya geçersiz');
  }
  if (invitation.status !== 'pending') {
    throw new Error('Davet zaten kullanılmış');
  }
  const expiry = new Date(invitation.expiresAt);
  if (Number.isFinite(expiry.getTime()) && expiry.getTime() < Date.now()) {
    throw new Error('Davetin süresi dolmuş');
  }

  const profile = resolveProfileByInvitation(profiles, invitation.id);

  const createdUser = await createUser({
    email: invitation.email,
    name: name && name.trim() ? name.trim() : invitation.name,
    password,
    role: 'external-stakeholder',
  });

  invitation.status = 'accepted';
  invitation.acceptedAt = new Date().toISOString();
  invitation.acceptedBy = createdUser.id;
  invitation.acceptedName = createdUser.name;

  await writeCollectionSafely(INVITATION_COLLECTION, invitations);

  if (profile) {
    profile.stakeholderUserId = createdUser.id;
    profile.contactName = createdUser.name;
    profile.updatedAt = new Date().toISOString();
    await writeCollectionSafely(PROFILE_COLLECTION, profiles);
  }

  await recordAuditLog({
    user: createdUser.email,
    action: 'portal.invitation.accepted',
    targetType: 'portal-invitation',
    targetId: invitation.id,
    details: { email: invitation.email, name: createdUser.name },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'medium',
  });

  if (profile) {
    await recordPortalActivity({
      profileId: profile.id,
      type: 'invitation.accepted',
      actor: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      },
      summary: 'Davetiye kabul edildi ve kullanıcı oluşturuldu',
      metadata: null,
    });
  }

  await ensureUsageEvent({ action: 'invitation.accepted', metadata: { email: invitation.email } });

  return { user: createdUser, profile };
}

async function resolveProfileByUserId(userId) {
  if (!userId) {
    return null;
  }
  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);
  return profiles.find((entry) => entry.stakeholderUserId === userId) || null;
}

async function listDocumentsByProfile(profileId) {
  const docs = await readCollectionAsArray(DOCUMENT_COLLECTION);
  return docs.filter((doc) => doc.profileId === profileId);
}

async function listSupportRequestsByProfile(profileId) {
  const requests = await readCollectionAsArray(SUPPORT_COLLECTION);
  return requests.filter((entry) => entry.profileId === profileId);
}

async function listMessagesByProfile(profileId) {
  const messages = await readCollectionAsArray(MESSAGE_COLLECTION);
  return messages
    .filter((entry) => entry.profileId === profileId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

async function listActivitiesByProfile(profileId) {
  const activities = await readCollectionAsArray(ACTIVITY_COLLECTION);
  return activities.filter((entry) => entry.profileId === profileId);
}

function buildUsageSummary(activities) {
  const total = activities.length;
  const lastActivity = activities
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const grouped = activities.reduce(
    (acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    },
    {},
  );
  return {
    totalEvents: total,
    lastActivityAt: lastActivity ? lastActivity.timestamp : null,
    breakdown: grouped,
  };
}

export async function getPortalOverviewForUser(userId) {
  const profile = await resolveProfileByUserId(userId);
  if (!profile) {
    return null;
  }

  const [documents, supportRequests, messages, activities] = await Promise.all([
    listDocumentsByProfile(profile.id),
    listSupportRequestsByProfile(profile.id),
    listMessagesByProfile(profile.id),
    listActivitiesByProfile(profile.id),
  ]);

  return {
    profile,
    documents,
    supportRequests,
    messages,
    activities,
    usage: buildUsageSummary(activities),
  };
}

export async function acknowledgePortalStatus({ profileId, statusId, actor }) {
  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);
  const profileIndex = profiles.findIndex((entry) => entry.id === profileId);
  if (profileIndex === -1) {
    throw new Error('Profil bulunamadı');
  }

  const profile = profiles[profileIndex];
  const status = profile.statuses.find((entry) => entry.id === statusId);
  if (!status) {
    throw new Error('Durum kaydı bulunamadı');
  }

  status.acknowledgedAt = new Date().toISOString();
  status.status = status.status === 'completed' ? status.status : 'in-progress';
  status.lastUpdatedAt = new Date().toISOString();
  profile.updatedAt = new Date().toISOString();

  profiles.splice(profileIndex, 1, profile);
  await writeCollectionSafely(PROFILE_COLLECTION, profiles);

  await recordPortalActivity({
    profileId,
    type: 'status.acknowledged',
    actor,
    summary: `${status.title} adımı onaylandı`,
    metadata: { statusId },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.status.acknowledged',
    targetType: 'portal-status',
    targetId: statusId,
    details: { profileId },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'low',
  });

  await ensureUsageEvent({ action: 'status.acknowledged', metadata: { profileId, statusId } });

  return status;
}

export async function createSupportRequest({ profileId, payload, actor }) {
  const requests = await readCollectionAsArray(SUPPORT_COLLECTION);
  const request = {
    id: randomUUID(),
    profileId,
    subject: payload.subject,
    message: payload.message,
    category: payload.category || 'general',
    status: 'open',
    priority: payload.priority || 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actor,
  };
  requests.push(request);
  await writeCollectionSafely(SUPPORT_COLLECTION, requests);

  await recordPortalActivity({
    profileId,
    type: 'support.requested',
    actor,
    summary: `Destek talebi: ${request.subject}`,
    metadata: { category: request.category },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.support.created',
    targetType: 'portal-support-request',
    targetId: request.id,
    details: { subject: request.subject },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'medium',
  });

  const recipient = resolveNotificationRecipient();
  if (recipient) {
    await sendEmailNotification({
      to: recipient,
      subject: 'Portal destek talebi oluşturuldu',
      text: `${actor?.name || 'Paydaş'} yeni bir destek talebi oluşturdu: ${request.subject}`,
    });
  }

  await ensureUsageEvent({ action: 'support.created', metadata: { profileId } });

  return request;
}

export async function postPortalMessage({ profileId, payload, actor }) {
  const messages = await readCollectionAsArray(MESSAGE_COLLECTION);
  const message = {
    id: randomUUID(),
    profileId,
    body: payload.body,
    attachments: payload.attachments || [],
    author: actor,
    direction: payload.direction || 'outbound',
    timestamp: new Date().toISOString(),
  };
  messages.push(message);
  await writeCollectionSafely(MESSAGE_COLLECTION, messages);

  await recordPortalActivity({
    profileId,
    type: 'message.sent',
    actor,
    summary: 'Portal mesajı gönderildi',
    metadata: { direction: message.direction },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.message.sent',
    targetType: 'portal-message',
    targetId: message.id,
    details: { profileId },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'low',
  });

  await ensureUsageEvent({ action: 'message.sent', metadata: { profileId } });

  return message;
}

export async function registerPortalDocument({ profileId, payload, actor }) {
  const documents = await readCollectionAsArray(DOCUMENT_COLLECTION);
  const doc = {
    id: randomUUID(),
    profileId,
    title: payload.title,
    description: payload.description || null,
    category: payload.category || 'general',
    versions: [],
    approval: {
      status: 'pending',
      decidedAt: null,
      decidedBy: null,
      notes: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actor,
  };
  documents.push(doc);
  await writeCollectionSafely(DOCUMENT_COLLECTION, documents);

  await recordPortalActivity({
    profileId,
    type: 'document.created',
    actor,
    summary: `${doc.title} dokümanı kaydedildi`,
    metadata: { category: doc.category },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.document.created',
    targetType: 'portal-document',
    targetId: doc.id,
    details: { title: doc.title },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'medium',
  });

  await ensureUsageEvent({ action: 'document.created', metadata: { profileId } });

  return doc;
}

export async function appendDocumentVersion({ profileId, documentId, payload, actor }) {
  const documents = await readCollectionAsArray(DOCUMENT_COLLECTION);
  const index = documents.findIndex((doc) => doc.id === documentId && doc.profileId === profileId);
  if (index === -1) {
    throw new Error('Belge bulunamadı');
  }

  const document = documents[index];
  const versionNumber = document.versions.length + 1;
  const version = {
    id: randomUUID(),
    version: versionNumber,
    fileName: payload.fileName,
    uploadedAt: new Date().toISOString(),
    uploadedBy: actor,
    notes: payload.notes || null,
    secureLinks: [],
  };
  document.versions.push(version);
  document.updatedAt = new Date().toISOString();
  documents.splice(index, 1, document);
  await writeCollectionSafely(DOCUMENT_COLLECTION, documents);

  await recordPortalActivity({
    profileId,
    type: 'document.version',
    actor,
    summary: `${document.title} için ${versionNumber}. sürüm yüklendi`,
    metadata: { version: versionNumber },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.document.version_added',
    targetType: 'portal-document',
    targetId: documentId,
    details: { version: versionNumber },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'medium',
  });

  await ensureUsageEvent({ action: 'document.version_added', metadata: { profileId, documentId } });

  return version;
}

export async function generateSecureDocumentLink({
  profileId,
  documentId,
  versionId,
  actor,
  expiresInMinutes = DEFAULT_LINK_EXPIRY_MINUTES,
}) {
  const documents = await readCollectionAsArray(DOCUMENT_COLLECTION);
  const document = documents.find((doc) => doc.id === documentId && doc.profileId === profileId);
  if (!document) {
    throw new Error('Belge bulunamadı');
  }
  const version = document.versions.find((entry) => entry.id === versionId);
  if (!version) {
    throw new Error('Belge sürümü bulunamadı');
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const linkRecord = {
    id: randomUUID(),
    hash: hashToken(token, SECURE_LINK_SECRET),
    createdAt: new Date().toISOString(),
    createdBy: actor,
    expiresAt,
  };
  version.secureLinks.push(linkRecord);
  document.updatedAt = new Date().toISOString();
  await writeCollectionSafely(DOCUMENT_COLLECTION, documents);

  await recordPortalActivity({
    profileId,
    type: 'document.link.generated',
    actor,
    summary: `${document.title} için güvenli bağlantı oluşturuldu`,
    metadata: { versionId },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.document.link_generated',
    targetType: 'portal-document-version',
    targetId: versionId,
    details: { expiresAt },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'low',
  });

  await ensureUsageEvent({ action: 'document.link_generated', metadata: { profileId, documentId } });

  const downloadBase = process.env.PORTAL_DOWNLOAD_BASE || process.env.APP_BASE_URL || '';
  const url = `${downloadBase.replace(/\/$/, '')}/portal/documents/${documentId}/download?token=${token}`;

  return {
    url,
    expiresAt,
  };
}

export async function updateDocumentApproval({ profileId, documentId, payload, actor }) {
  const documents = await readCollectionAsArray(DOCUMENT_COLLECTION);
  const index = documents.findIndex((doc) => doc.id === documentId && doc.profileId === profileId);
  if (index === -1) {
    throw new Error('Belge bulunamadı');
  }

  const document = documents[index];
  document.approval = {
    status: payload.status,
    decidedAt: new Date().toISOString(),
    decidedBy: actor,
    notes: payload.notes || null,
  };
  document.updatedAt = new Date().toISOString();
  documents.splice(index, 1, document);
  await writeCollectionSafely(DOCUMENT_COLLECTION, documents);

  await recordPortalActivity({
    profileId,
    type: 'document.approval',
    actor,
    summary: `${document.title} belgesi ${payload.status} durumuna çekildi`,
    metadata: { status: payload.status },
  });

  await recordAuditLog({
    user: actor?.email || 'unknown',
    action: 'portal.document.approval_updated',
    targetType: 'portal-document',
    targetId: documentId,
    details: { status: payload.status },
    label: 'stakeholder',
    sourceModule: 'stakeholder-portal',
    criticality: 'high',
  });

  await ensureUsageEvent({ action: 'document.approval_updated', metadata: { profileId, documentId } });

  return document.approval;
}

export async function listPortalInvitations() {
  const invitations = await readCollectionAsArray(INVITATION_COLLECTION);
  return invitations;
}

export async function listPortalProfiles() {
  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);
  return profiles;
}

export function sanitizePortalOverview(overview) {
  if (!overview) {
    return null;
  }
  return {
    profile: overview.profile,
    documents: overview.documents,
    supportRequests: overview.supportRequests,
    messages: overview.messages,
    usage: overview.usage,
  };
}

export async function getPortalOverviewForAdmin(profileId) {
  const profiles = await readCollectionAsArray(PROFILE_COLLECTION);
  const profile = profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    throw new Error('Profil bulunamadı');
  }
  const overview = await getPortalOverviewForUser(profile.stakeholderUserId);
  if (!overview) {
    return {
      profile,
      documents: await listDocumentsByProfile(profile.id),
      supportRequests: await listSupportRequestsByProfile(profile.id),
      messages: await listMessagesByProfile(profile.id),
      activities: await listActivitiesByProfile(profile.id),
      usage: buildUsageSummary(await listActivitiesByProfile(profile.id)),
    };
  }
  return overview;
}

