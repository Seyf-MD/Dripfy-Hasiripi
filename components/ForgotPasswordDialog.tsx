import * as React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthError, requestPasswordReset, resetPassword } from '../services/authService';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  defaultEmail?: string;
  onClose: () => void;
  onCompleted: (message: { title: string; detail?: string }) => void;
}

type Stage = 'email' | 'verify';

const initialState = {
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
};

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  isOpen,
  defaultEmail,
  onClose,
  onCompleted,
}) => {
  const { t } = useLanguage();
  const [stage, setStage] = React.useState<Stage>('email');
  const [form, setForm] = React.useState(initialState);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'info' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStage('email');
      setForm({
        email: defaultEmail ?? '',
        code: '',
        password: '',
        confirmPassword: '',
      });
      setIsSubmitting(false);
      setMessage(null);
    }
  }, [isOpen, defaultEmail]);

  const updateFormValue = React.useCallback(
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email) {
      setMessage({ type: 'error', text: t('passwordReset.errors.emailRequired') });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await requestPasswordReset(form.email.trim());
      setStage('verify');
      setMessage({
        type: 'info',
        text: t('passwordReset.messages.codeSent').replace('{email}', form.email.trim()),
      });
    } catch (error) {
      const authError = error as AuthError;
      const translationKey = authError.translationKey ?? 'passwordReset.errors.requestFailed';
      setMessage({ type: 'error', text: t(translationKey) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.code || !form.password) {
      setMessage({ type: 'error', text: t('passwordReset.errors.codeAndPasswordRequired') });
      return;
    }
    if (form.password.length < 8) {
      setMessage({ type: 'error', text: t('passwordReset.errors.passwordLength') });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: t('passwordReset.errors.passwordMismatch') });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await resetPassword({
        email: form.email.trim(),
        code: form.code.trim(),
        password: form.password,
      });
      onClose();
      onCompleted({
        title: t('passwordReset.successTitle'),
        detail: t('passwordReset.successBody'),
      });
    } catch (error) {
      const authError = error as AuthError;
      const translationKey = authError.translationKey ?? 'passwordReset.errors.resetFailed';
      setMessage({ type: 'error', text: t(translationKey) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const subtitleText =
    stage === 'email'
      ? t('passwordReset.subtitleEmail')
      : t('passwordReset.subtitleVerify').replace('{email}', form.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-slate-200 dark:border-neutral-700 p-6 space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-semibold text-[var(--drip-text)] dark:text-white">
            {t('passwordReset.title')}
          </h2>
          <p className="mt-1 text-sm text-[var(--drip-muted)] dark:text-neutral-400">
            {subtitleText}
          </p>
        </div>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              message.type === 'info'
                ? 'bg-blue-500/10 text-blue-700 border border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
                : 'bg-red-500/10 text-red-600 border border-red-500/30 dark:bg-red-500/15 dark:text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {stage === 'email' ? (
          <form className="space-y-4" onSubmit={handleRequest}>
            <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white">
              {t('passwordReset.emailLabel')}
              <input
                type="email"
                value={form.email}
                onChange={updateFormValue('email')}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </label>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--drip-primary)] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[var(--drip-primary-dark)] transition disabled:opacity-70"
              >
                {isSubmitting ? t('passwordReset.sending') : t('passwordReset.sendCode')}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white">
              {t('passwordReset.codeLabel')}
              <input
                type="text"
                inputMode="numeric"
                value={form.code}
                onChange={updateFormValue('code')}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white tracking-[0.3em]"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white">
              {t('passwordReset.passwordLabel')}
              <input
                type="password"
                value={form.password}
                onChange={updateFormValue('password')}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white">
              {t('passwordReset.confirmPasswordLabel')}
              <input
                type="password"
                value={form.confirmPassword}
                onChange={updateFormValue('confirmPassword')}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStage('email');
                  setMessage(null);
                  setIsSubmitting(false);
                }}
                className="text-sm font-medium text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {t('passwordReset.back')}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--drip-primary)] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[var(--drip-primary-dark)] transition disabled:opacity-70"
                >
                  {isSubmitting ? t('passwordReset.submitting') : t('passwordReset.resetPassword')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordDialog;
