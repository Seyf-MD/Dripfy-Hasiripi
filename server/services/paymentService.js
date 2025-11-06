import crypto from 'crypto';

function getProviderConfig() {
  const provider = (process.env.INVOICE_PAYMENT_PROVIDER || '').toLowerCase();
  if (provider === 'stripe' && process.env.STRIPE_API_KEY) {
    return { type: 'stripe', apiKey: process.env.STRIPE_API_KEY }; 
  }
  if (provider === 'bank' && process.env.BANK_API_BASE_URL) {
    return {
      type: 'bank',
      baseUrl: process.env.BANK_API_BASE_URL,
      clientId: process.env.BANK_API_CLIENT_ID || null,
      clientSecret: process.env.BANK_API_CLIENT_SECRET || null,
      token: process.env.BANK_API_TOKEN || null,
    };
  }
  if (process.env.STRIPE_API_KEY) {
    return { type: 'stripe', apiKey: process.env.STRIPE_API_KEY };
  }
  return { type: 'simulation' };
}

function toMinorUnits(amount, currency = 'eur') {
  if (!Number.isFinite(amount)) {
    return null;
  }
  const decimals = ['jpy', 'clp', 'isk', 'vnd'].includes(currency.toLowerCase()) ? 0 : 2;
  return Math.round(amount * (10 ** decimals));
}

async function triggerStripePayment({ invoice, config }) {
  const amount = toMinorUnits(invoice.extractedFields?.totalAmount, invoice.extractedFields?.currency || 'eur');
  if (!amount) {
    throw new Error('Invoice total amount missing for Stripe payment');
  }
  const body = new URLSearchParams({
    amount: amount.toString(),
    currency: (invoice.extractedFields?.currency || 'eur').toLowerCase(),
    confirm: 'false',
    description: `Invoice ${invoice.extractedFields?.invoiceNumber || invoice.id}`,
    metadata: JSON.stringify({ invoiceId: invoice.id, vendor: invoice.extractedFields?.vendorName || 'unknown' }),
  });
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stripe payment intent failed: ${response.status} ${errorBody}`);
  }
  const payload = await response.json();
  return {
    status: payload.status || 'requires_confirmation',
    reference: payload.id,
    clientSecret: payload.client_secret || null,
  };
}

async function triggerBankPayment({ invoice, config }) {
  if (!config.baseUrl) {
    throw new Error('Bank API base URL missing');
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/payments`; 
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.token ? `Bearer ${config.token}` : undefined,
      'X-Client-Id': config.clientId || undefined,
      'X-Client-Secret': config.clientSecret || undefined,
    },
    body: JSON.stringify({
      invoiceId: invoice.id,
      amount: invoice.extractedFields?.totalAmount || null,
      currency: invoice.extractedFields?.currency || 'EUR',
      dueDate: invoice.extractedFields?.dueDate || null,
      vendor: invoice.extractedFields?.vendorName || null,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Bank API payment failed: ${response.status} ${errorBody}`);
  }
  const payload = await response.json();
  return {
    status: payload.status || 'scheduled',
    reference: payload.id || payload.reference || crypto.randomUUID(),
    scheduledFor: payload.scheduledFor || null,
  };
}

export function predictPaymentDelay({ invoice, baselineDays = 2 }) {
  const steps = invoice.approval?.steps || [];
  const rejectedSteps = steps.filter((step) => step.status === 'rejected');
  if (rejectedSteps.length > 0) {
    return { riskScore: 90, level: 'high', expectedDelayDays: null };
  }
  const approvedSteps = steps.filter((step) => step.status === 'approved');
  const pendingSteps = steps.filter((step) => step.status === 'pending' || step.status === 'waiting');
  const hasEscalations = steps.some((step) => step.notifications?.includes('push'));
  const dueDate = invoice.extractedFields?.dueDate ? new Date(invoice.extractedFields.dueDate) : null;
  const now = new Date();

  let score = 20;
  score += pendingSteps.length * 10;
  if (hasEscalations) {
    score += 15;
  }
  if (dueDate && (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) < baselineDays) {
    score += 25;
  }
  if ((invoice.risk?.score || 0) > 70) {
    score += 20;
  }
  score = Math.min(99, score);

  let level = 'low';
  if (score >= 70) {
    level = 'high';
  } else if (score >= 40) {
    level = 'medium';
  }

  return {
    riskScore: score,
    level,
    expectedDelayDays: level === 'high' ? 5 : level === 'medium' ? 2 : 0,
  };
}

export async function triggerInvoicePayment({ invoice, actor }) {
  const config = getProviderConfig();
  if (!invoice || !invoice.id) {
    throw new Error('Invoice payload missing identifier');
  }

  try {
    if (config.type === 'stripe') {
      const result = await triggerStripePayment({ invoice, config });
      return {
        status: result.status,
        provider: 'stripe',
        reference: result.reference,
        meta: {
          clientSecret: result.clientSecret,
        },
        triggeredBy: actor?.email || actor?.id || null,
        triggeredAt: new Date().toISOString(),
      };
    }
    if (config.type === 'bank') {
      const result = await triggerBankPayment({ invoice, config });
      return {
        status: result.status,
        provider: 'bank',
        reference: result.reference,
        scheduledFor: result.scheduledFor || null,
        triggeredBy: actor?.email || actor?.id || null,
        triggeredAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[payment] trigger failed', error);
    return {
      status: 'failed',
      provider: config.type,
      reference: null,
      failureReason: error.message,
      triggeredBy: actor?.email || actor?.id || null,
      triggeredAt: new Date().toISOString(),
    };
  }

  return {
    status: 'simulated',
    provider: 'simulation',
    reference: `sim-${crypto.randomUUID()}`,
    triggeredBy: actor?.email || actor?.id || null,
    triggeredAt: new Date().toISOString(),
  };
}
