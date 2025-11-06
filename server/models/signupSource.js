const SUPPORTED_SIGNUP_SOURCES = new Set([
  'organic',
  'paid',
  'referral',
  'partner',
  'event',
  'content',
  'other',
]);

function safeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value == null) {
    return fallback;
  }
  return String(value).trim();
}

export function normaliseSignupSource(value) {
  const normalised = safeString(value).toLowerCase();
  if (SUPPORTED_SIGNUP_SOURCES.has(normalised)) {
    return normalised;
  }
  switch (normalised) {
    case 'ads':
    case 'paid-search':
    case 'paid_social':
    case 'sem':
    case 'ppc':
      return 'paid';
    case 'blog':
    case 'seo':
    case 'content-marketing':
      return 'content';
    case 'conference':
    case 'meetup':
    case 'webinar':
      return 'event';
    case 'affiliate':
    case 'reseller':
      return 'partner';
    default:
      return 'other';
  }
}

export function normaliseSignupAttribution(input = {}) {
  const params = typeof input === 'object' && input !== null ? input : {};
  const attribution = params.attribution && typeof params.attribution === 'object' ? params.attribution : {};
  const sourceCandidate =
    safeString(params.source) ||
    safeString(params.signupSource) ||
    safeString(params.utm_source) ||
    safeString(attribution.source) ||
    safeString(params.marketingSource);
  const campaign =
    safeString(params.campaign) ||
    safeString(params.signupCampaign) ||
    safeString(params.utm_campaign) ||
    safeString(attribution.campaign);
  const medium =
    safeString(params.medium) ||
    safeString(params.utm_medium) ||
    safeString(attribution.medium);
  const country =
    safeString(params.attributionCountry) ||
    safeString(params.utm_country) ||
    safeString(attribution.country) ||
    safeString(params.country);
  const landingPage = safeString(params.landingPage) || safeString(attribution.landingPage);
  const referrer = safeString(params.referrer) || safeString(attribution.referrer);

  return {
    source: normaliseSignupSource(sourceCandidate || 'organic'),
    campaign: campaign || null,
    medium: medium || null,
    country: country || null,
    landingPage: landingPage || null,
    referrer: referrer || null,
  };
}

export function buildSignupAttributionTags(attribution) {
  if (!attribution) {
    return [];
  }
  const tags = [`source:${attribution.source}`];
  if (attribution.campaign) {
    tags.push(`campaign:${attribution.campaign}`);
  }
  if (attribution.country) {
    tags.push(`country:${attribution.country}`);
  }
  return tags;
}

export const SIGNUP_SOURCES = Array.from(SUPPORTED_SIGNUP_SOURCES);
