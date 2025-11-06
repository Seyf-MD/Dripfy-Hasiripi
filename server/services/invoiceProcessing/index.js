import { randomUUID } from 'crypto';
import { readCollection, writeCollection } from '../storageService.js';
import {
  persistInvoiceFile,
  buildInvoicePreviewReference,
  getInvoiceStoragePolicies,
  getInvoiceFileStream,
} from './storage.js';
import { extractInvoiceFields } from './ocr.js';
import { buildInvoiceApprovalPlan } from './approvals.js';
import { triggerInvoicePayment, predictPaymentDelay } from '../paymentService.js';

const COLLECTION = 'invoices';

function normaliseActor(actor = null) {
  if (!actor) {
    return null;
  }
  return {
    id: actor.id || null,
    email: actor.email || null,
    name: actor.name || null,
    role: actor.role || null,
  };
}

function computeUrgencyDays(dueDate) {
  if (!dueDate) {
    return null;
  }
  const target = new Date(dueDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeRiskProfile({ fields, ocrProvider }) {
  let score = 25;
  const factors = [];
  if (!fields.totalAmount || fields.totalAmount <= 0) {
    score += 10;
    factors.push('Tutar okunamadı');
  } else if (fields.totalAmount > 50000) {
    score += 25;
    factors.push('50K üzeri yüksek tutar');
  }
  if (!fields.dueDate) {
    score += 15;
    factors.push('Vade tarihi eksik');
  } else {
    const urgency = computeUrgencyDays(fields.dueDate);
    if (urgency !== null && urgency <= 5) {
      score += 20;
      factors.push('Yaklaşan vade');
    }
  }
  if (ocrProvider === 'fallback') {
    score += 15;
    factors.push('OCR manuel fallback ile işlendi');
  }
  if (!fields.vendorName) {
    score += 10;
    factors.push('Tedarikçi bilgisi eksik');
  }

  score = Math.min(99, score);

  let level = 'low';
  if (score >= 70) {
    level = 'high';
  } else if (score >= 40) {
    level = 'medium';
  }

  return { score, level, factors };
}

async function saveInvoices(list) {
  await writeCollection(COLLECTION, list);
}

async function listStoredInvoices() {
  const invoices = await readCollection(COLLECTION);
  if (!Array.isArray(invoices)) {
    return [];
  }
  return invoices;
}

export async function listInvoices() {
  const invoices = await listStoredInvoices();
  return invoices.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function getInvoiceById(id) {
  const invoices = await listStoredInvoices();
  return invoices.find((item) => item.id === id) || null;
}

async function persistInvoice(invoice) {
  const invoices = await listStoredInvoices();
  const existingIndex = invoices.findIndex((item) => item.id === invoice.id);
  if (existingIndex === -1) {
    invoices.push(invoice);
  } else {
    invoices[existingIndex] = invoice;
  }
  await saveInvoices(invoices);
  return invoice;
}

export async function processInvoiceUpload({ file, actor = null, metadata = {} }) {
  if (!file?.buffer || !file?.originalname || !file?.mimetype) {
    throw new Error('Invalid upload payload');
  }

  const storage = await persistInvoiceFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
  });

  const { provider: ocrProvider, fields } = await extractInvoiceFields({
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  const risk = computeRiskProfile({ fields, ocrProvider });
  const urgencyDays = computeUrgencyDays(fields.dueDate);
  const approvalPlan = buildInvoiceApprovalPlan({
    amount: fields.totalAmount || 0,
    riskLevel: risk.level,
    urgencyDays,
  });

  const approvalSteps = approvalPlan.steps.map((step) => ({
    ...step,
    status: 'waiting',
    decidedAt: null,
    decidedBy: null,
  }));

  const invoice = {
    id: randomUUID(),
    fileName: storage.originalName,
    mimeType: storage.mimeType,
    size: storage.size,
    sha256: storage.sha256,
    uploadedAt: new Date().toISOString(),
    uploadedBy: normaliseActor(actor),
    storage,
    ocr: {
      provider: ocrProvider,
    },
    extractedFields: {
      vendorName: fields.vendorName || null,
      vendorAddress: fields.vendorAddress || null,
      invoiceNumber: fields.invoiceNumber || null,
      purchaseOrder: fields.purchaseOrder || null,
      issueDate: fields.issueDate || null,
      dueDate: fields.dueDate || null,
      totalAmount: fields.totalAmount || null,
      taxAmount: fields.taxAmount || null,
      currency: fields.currency || metadata.currency || 'EUR',
      lineItems: Array.isArray(fields.lineItems) ? fields.lineItems : [],
    },
    approval: {
      route: approvalPlan.route,
      notes: approvalPlan.notes,
      steps: approvalSteps,
      status: 'pending',
      blueprint: approvalPlan.steps,
    },
    metadata: {
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      department: metadata.department || null,
      costCenter: metadata.costCenter || null,
    },
    risk,
    payment: {
      status: 'pending',
      provider: null,
      reference: null,
      predicted: null,
    },
    preview: {
      lastGeneratedAt: null,
      reference: null,
    },
  };

  invoice.payment.predicted = predictPaymentDelay({ invoice });

  await persistInvoice(invoice);
  return invoice;
}

export async function generateInvoicePreview(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  const reference = await buildInvoicePreviewReference(invoice.storage);
  invoice.preview = {
    lastGeneratedAt: new Date().toISOString(),
    reference,
  };
  await persistInvoice(invoice);
  return reference;
}

export async function updateInvoiceAfterFlow(flow) {
  if (!flow?.entityId || flow.type !== 'invoice') {
    return null;
  }
  const invoice = await getInvoiceById(flow.entityId);
  if (!invoice) {
    return null;
  }

  invoice.approval = {
    ...invoice.approval,
    status: flow.status,
    steps: flow.steps,
    currentStepId: flow.currentStepId || null,
  };

  invoice.payment.predicted = predictPaymentDelay({ invoice });

  if (flow.status === 'approved' && (!invoice.payment || invoice.payment.status === 'pending' || invoice.payment.status === 'failed')) {
    const paymentResult = await triggerInvoicePayment({ invoice, actor: invoice.uploadedBy });
    invoice.payment = {
      ...invoice.payment,
      ...paymentResult,
    };
  }

  await persistInvoice(invoice);
  return invoice;
}

export function getInvoiceSecurityPolicies() {
  return getInvoiceStoragePolicies();
}

export async function getInvoiceFileStreamById(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  return getInvoiceFileStream(invoice.storage);
}
