import * as React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  requestSignupCode,
  SignupCodePayload,
  SignupError,
  SignupFinalizePayload,
} from '../services/signupService';
import type { SignupAttribution, SignupSource } from '../types';

interface SignupFormProps {
  onSignupRequest: (payload: { email: string; code: string }) => Promise<SignupFinalizePayload>;
  onSuccess: () => void;
  onCancel: () => void;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  country: string;
  phone: string;
  position: string;
  company: string;
}

interface SignupFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  position?: string;
}

type ErrorAction = 'requestCode' | 'verify';

interface ErrorState {
  key: string;
  action: ErrorAction;
}

const companyPositions = [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'Head of Department',
  'Team Lead',
  'Project Manager',
  'Senior Specialist',
  'Junior Specialist',
  'Intern',
];

const phoneCountries = [
  { code: '+90', label: 'Türkiye (+90)', country: 'Türkiye' },
  { code: '+49', label: 'Deutschland (+49)', country: 'Germany' },
  { code: '+44', label: 'United Kingdom (+44)', country: 'United Kingdom' },
  { code: '+971', label: 'United Arab Emirates (+971)', country: 'United Arab Emirates' },
  { code: '+1', label: 'United States (+1)', country: 'United States' },
];

const SUPPORTED_SIGNUP_SOURCES: SignupSource[] = ['organic', 'paid', 'referral', 'partner', 'event', 'content', 'other'];

const normaliseSignupSource = (value?: string | null): SignupSource => {
  if (!value) {
    return 'organic';
  }
  const trimmed = value.trim().toLowerCase();
  if ((SUPPORTED_SIGNUP_SOURCES as readonly string[]).includes(trimmed)) {
    return trimmed as SignupSource;
  }
  if (['ads', 'paid-search', 'paid_social', 'sem', 'ppc'].includes(trimmed)) {
    return 'paid';
  }
  if (['blog', 'seo', 'content-marketing'].includes(trimmed)) {
    return 'content';
  }
  if (['conference', 'meetup', 'webinar'].includes(trimmed)) {
    return 'event';
  }
  if (['affiliate', 'reseller'].includes(trimmed)) {
    return 'partner';
  }
  if (['friend', 'colleague', 'customer'].includes(trimmed)) {
    return 'referral';
  }
  return 'other';
};

const detectInitialAttribution = (): SignupAttribution => {
  if (typeof window === 'undefined') {
    return {
      source: 'organic',
      campaign: null,
      medium: null,
      country: null,
      landingPage: null,
      referrer: null,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('utm_source') ?? params.get('source');
  const campaignParam = params.get('utm_campaign') ?? params.get('campaign');
  const mediumParam = params.get('utm_medium') ?? params.get('medium');
  const countryParam = params.get('utm_country') ?? params.get('country');
  const landingPage = `${window.location.pathname}${window.location.search}` || null;
  const referrer = typeof document !== 'undefined' && document.referrer ? document.referrer : null;

  return {
    source: normaliseSignupSource(sourceParam),
    campaign: campaignParam ? campaignParam.trim() : null,
    medium: mediumParam ? mediumParam.trim() : null,
    country: countryParam ? countryParam.trim() : null,
    landingPage,
    referrer,
  };
};

const buildAttributionTags = (attribution?: SignupAttribution | null): string[] => {
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
};

const initialSignupState: SignupFormData = {
  firstName: '',
  lastName: '',
  email: '',
  countryCode: phoneCountries[0].code,
  country: phoneCountries[0].country,
  phone: '',
  position: companyPositions[0],
  company: '',
};

const SignupForm: React.FC<SignupFormProps> = ({ onSignupRequest, onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const [view, setView] = React.useState<'form' | 'verify'>('form');
  const [signupData, setSignupData] = React.useState<SignupFormData>(initialSignupState);
  const [attribution] = React.useState<SignupAttribution>(() => detectInitialAttribution());
  const [formErrors, setFormErrors] = React.useState<SignupFormErrors>({});
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [infoKey, setInfoKey] = React.useState<string | null>(null);
  const [errorState, setErrorState] = React.useState<ErrorState | null>(null);
  const [lastSignupPayload, setLastSignupPayload] = React.useState<SignupCodePayload | null>(null);
  const [lastVerificationPayload, setLastVerificationPayload] = React.useState<{ email: string; code: string } | null>(null);

  const sanitizePhone = React.useCallback((value: string) => value.replace(/[^0-9]/g, ''), []);

  const getCountryOption = React.useCallback(
    (code: string) => phoneCountries.find(option => option.code === code) || phoneCountries[0],
    []
  );

  const resetForm = React.useCallback(() => {
    setSignupData(initialSignupState);
    setFormErrors({});
    setVerificationCode('');
    setView('form');
    setInfoKey(null);
    setErrorState(null);
    setLastSignupPayload(null);
    setLastVerificationPayload(null);
  }, []);

  const resolveError = React.useCallback((error: unknown): SignupError => {
    if (error instanceof SignupError) {
      return error;
    }
    if (error instanceof Error) {
      return new SignupError('signup.errors.generic', { message: error.message });
    }
    return new SignupError('signup.errors.generic');
  }, []);

  const validateSignupForm = React.useCallback(
    (data: SignupFormData): SignupFormErrors => {
      const errors: SignupFormErrors = {};

      if (!data.firstName.trim() || data.firstName.trim().length < 2) {
        errors.firstName = t('signup.errors.firstName');
      }

      if (!data.lastName.trim() || data.lastName.trim().length < 2) {
        errors.lastName = t('signup.errors.lastName');
      }

      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = t('signup.errors.email');
      }

      const sanitizedPhone = sanitizePhone(data.phone);
      if (!sanitizedPhone || sanitizedPhone.length < 6) {
        errors.phone = t('signup.errors.phone');
      }

      if (!data.countryCode) {
        errors.countryCode = t('signup.errors.countryCode');
      }

      if (!data.position) {
        errors.position = t('signup.errors.position');
      }

      return errors;
    },
    [sanitizePhone, t]
  );

  const submitSignupCode = React.useCallback(
    async (payload: SignupCodePayload) => {
      setIsSendingCode(true);
      try {
        await requestSignupCode(payload);
        setInfoKey('signup.notification.codeSentBody');
        setErrorState(null);
        setView('verify');
      } catch (error) {
        const resolved = resolveError(error);
        setErrorState({ key: resolved.translationKey, action: 'requestCode' });
      } finally {
        setIsSendingCode(false);
      }
    },
    [resolveError]
  );

  const attemptVerification = React.useCallback(
    async (payload: { email: string; code: string }) => {
      setIsVerifying(true);
      try {
        await onSignupRequest(payload);
        setErrorState(null);
        setInfoKey(null);
        setVerificationCode('');
        resetForm();
        onSuccess();
      } catch (error) {
        const resolved = resolveError(error);
        setErrorState({ key: resolved.translationKey, action: 'verify' });
      } finally {
        setIsVerifying(false);
      }
    },
    [onSignupRequest, onSuccess, resolveError, resetForm]
  );

  const handleSignupSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanedData: SignupFormData = { ...signupData, phone: sanitizePhone(signupData.phone) };
      const errors = validateSignupForm(cleanedData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const countryOption = getCountryOption(cleanedData.countryCode);
      const payload: SignupCodePayload = {
        ...cleanedData,
        country: countryOption.country,
        attribution,
        signupSource: attribution.source,
        signupCampaign: attribution.campaign ?? undefined,
        attributionCountry: attribution.country ?? undefined,
        landingPage: attribution.landingPage ?? undefined,
        referrer: attribution.referrer ?? undefined,
        medium: attribution.medium ?? undefined,
        tags: buildAttributionTags(attribution),
      };

      setLastSignupPayload(payload);
      setFormErrors({});
      setErrorState(null);
      setInfoKey(null);
      await submitSignupCode(payload);
    },
    [getCountryOption, sanitizePhone, signupData, submitSignupCode, validateSignupForm]
  );

  const handleVerifySubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedCode = verificationCode.trim();
      if (!trimmedCode) {
        setErrorState({ key: 'verify.invalidCode', action: 'verify' });
        return;
      }

      const payload = {
        email: signupData.email.trim(),
        code: trimmedCode,
      };

      setLastVerificationPayload(payload);
      setErrorState(null);
      await attemptVerification(payload);
    },
    [attemptVerification, signupData.email, verificationCode]
  );

  const handleSignupChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setSignupData(prev => {
        if (name === 'phone') {
          return { ...prev, phone: sanitizePhone(value) } as SignupFormData;
        }
        if (name === 'countryCode') {
          const option = getCountryOption(value);
          return { ...prev, countryCode: value, country: option.country } as SignupFormData;
        }
        return { ...prev, [name]: value } as SignupFormData;
      });

      if (formErrors[name as keyof SignupFormErrors]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
      }
    },
    [formErrors, getCountryOption, sanitizePhone]
  );

  const handleRetry = React.useCallback(() => {
    if (!errorState) {
      return;
    }

    if (errorState.action === 'requestCode' && lastSignupPayload) {
      void submitSignupCode(lastSignupPayload);
    }

    if (errorState.action === 'verify' && lastVerificationPayload) {
      void attemptVerification(lastVerificationPayload);
    }
  }, [attemptVerification, errorState, lastSignupPayload, lastVerificationPayload, submitSignupCode]);

  const handleBackToForm = React.useCallback(() => {
    setView('form');
    setErrorState(null);
  }, []);

  const inputClass =
    'appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[var(--drip-text)] dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:z-10 sm:text-sm';

  return (
    <div className="space-y-6">
      {infoKey && (
        <div className="rounded-2xl px-4 py-3 border border-[var(--drip-primary)] text-sm bg-[color:rgba(75,165,134,0.1)] text-[var(--drip-primary)]">
          {t(infoKey)}
        </div>
      )}

      {errorState && (
        <div className="rounded-2xl px-4 py-3 border border-red-400 text-sm bg-red-500/10 text-red-200 flex items-center justify-between gap-4">
          <span>{t(errorState.key)}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 rounded-md bg-red-500/20 text-xs font-semibold uppercase tracking-wide hover:bg-red-500/30 transition-colors"
          >
            {t('actions.retry')}
          </button>
        </div>
      )}

      {view === 'verify' ? (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('verify.title')}</h3>
            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
              {t('verify.subtitle').replace('{email}', signupData.email)}
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleVerifySubmit}>
            <input
              type="text"
              placeholder={t('verify.codePlaceholder')}
              value={verificationCode}
              onChange={event => setVerificationCode(event.target.value)}
              required
              className={`${inputClass} rounded-md text-center tracking-[0.5em]`}
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--drip-primary)] transition-colors disabled:opacity-70"
            >
              {isVerifying ? `${t('verify.button')}...` : t('verify.button')}
            </button>
          </form>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
            <button
              type="button"
              onClick={handleBackToForm}
              className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]"
            >
              {t('verify.backButton')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]"
            >
              {t('signup.loginPrompt')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <input type="hidden" name="signupSource" value={attribution.source} />
            <input type="hidden" name="signupCampaign" value={attribution.campaign ?? ''} />
            <input type="hidden" name="attributionCountry" value={attribution.country ?? ''} />
            <input type="hidden" name="landingPage" value={attribution.landingPage ?? ''} />
            <input type="hidden" name="referrer" value={attribution.referrer ?? ''} />
            <input type="hidden" name="medium" value={attribution.medium ?? ''} />
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  name="firstName"
                  placeholder={t('signup.firstNamePlaceholder')}
                  required
                  value={signupData.firstName}
                  onChange={handleSignupChange}
                  className={`${inputClass} rounded-md`}
                />
                {formErrors.firstName && <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="lastName"
                  placeholder={t('signup.lastNamePlaceholder')}
                  required
                  value={signupData.lastName}
                  onChange={handleSignupChange}
                  className={`${inputClass} rounded-md`}
                />
                {formErrors.lastName && <p className="mt-1 text-xs text-red-500">{formErrors.lastName}</p>}
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder={t('signup.emailPlaceholder')}
                  required
                  value={signupData.email}
                  onChange={handleSignupChange}
                  className={`${inputClass} rounded-md`}
                />
                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
              </div>
              <div>
                <input
                  type="text"
                  name="company"
                  placeholder={t('signup.companyPlaceholder')}
                  value={signupData.company}
                  onChange={handleSignupChange}
                  className={`${inputClass} rounded-md`}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <select
                    name="countryCode"
                    aria-label={t('signup.countryCodeLabel')}
                    value={signupData.countryCode}
                    onChange={handleSignupChange}
                    className={`${inputClass} rounded-md`}
                  >
                    {phoneCountries.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.countryCode && <p className="mt-1 text-xs text-red-500">{formErrors.countryCode}</p>}
                </div>
                <div className="col-span-2">
                  <input
                    type="tel"
                    name="phone"
                    placeholder={t('signup.phonePlaceholder')}
                    required
                    value={signupData.phone}
                    onChange={handleSignupChange}
                    inputMode="tel"
                    pattern="[0-9]*"
                    className={`${inputClass} rounded-md`}
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                </div>
              </div>
              <div>
                <select
                  name="position"
                  value={signupData.position}
                  onChange={handleSignupChange}
                  className={`${inputClass} rounded-md`}
                >
                  {companyPositions.map(position => (
                    <option key={position} value={position}>
                      {t(`positions.${position.replace(/ /g, '')}`)}
                    </option>
                  ))}
                </select>
                {formErrors.position && <p className="mt-1 text-xs text-red-500">{formErrors.position}</p>}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSendingCode}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--drip-primary)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSendingCode ? `${t('verify.button')}...` : t('signup.signUpButton')}
            </button>
          </form>
          <div className="text-sm text-center">
            <button
              type="button"
              onClick={onCancel}
              className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]"
            >
              {t('signup.loginPrompt')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SignupForm;
