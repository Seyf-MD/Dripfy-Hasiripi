import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import SignupForm from '../SignupForm';
import * as signupService from '../../services/signupService';
import type { SignupFinalizePayload } from '../../services/signupService';

vi.mock('../../i18n/LanguageContext', () => {
  const translations: Record<string, string> = {
    'signup.firstNamePlaceholder': 'First name',
    'signup.lastNamePlaceholder': 'Last name',
    'signup.emailPlaceholder': 'Email address',
    'signup.phonePlaceholder': 'Phone number',
    'signup.companyPlaceholder': 'Company (optional)',
    'signup.countryCodeLabel': 'Country code',
    'signup.signUpButton': 'Sign Up',
    'signup.loginPrompt': 'Back to login',
    'signup.notification.codeSentBody': 'Check your inbox for the verification code.',
    'signup.errors.conflict': 'Account already exists.',
    'signup.errors.server': 'Server error. Please try again later.',
    'signup.errors.generic': 'Something went wrong.',
    'signup.errors.rateLimited': 'Too many attempts.',
    'actions.retry': 'Retry',
    'verify.title': 'Verify your email',
    'verify.subtitle': 'We sent a code to {email}',
    'verify.codePlaceholder': 'Verification Code',
    'verify.button': 'Verify & Sign Up',
    'verify.backButton': 'Back to sign up',
    'verify.invalidCode': 'Invalid code.',
    'signup.prompt': 'Need an account? Sign up',
    'signup.notification.successTitle': 'Signup request received',
    'signup.notification.successBody': 'We will review your request soon.'
  };

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => translations[key] ?? key,
    }),
  };
});

vi.mock('../../services/signupService', async () => {
  const actual = await vi.importActual<typeof import('../../services/signupService')>(
    '../../services/signupService'
  );

  return {
    ...actual,
    requestSignupCode: vi.fn(),
  };
});

type SignupFormProps = ComponentProps<typeof SignupForm>;
const requestSignupCodeMock = signupService.requestSignupCode as unknown as vi.Mock;

const fillSignupForm = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('First name'), 'John');
  await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
  await user.type(screen.getByPlaceholderText('Email address'), 'john@example.com');
  await user.type(screen.getByPlaceholderText('Phone number'), '5551234');
  return user;
};

describe('SignupForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays conflict error message and retries sending the code', async () => {
    const conflictError = new signupService.SignupError('signup.errors.conflict', { status: 409 });
    requestSignupCodeMock.mockRejectedValueOnce(conflictError);
    requestSignupCodeMock.mockResolvedValueOnce(undefined);

    const finalizeMock = vi.fn<
      Parameters<SignupFormProps['onSignupRequest']>,
      ReturnType<SignupFormProps['onSignupRequest']>
    >();
    finalizeMock.mockResolvedValue({} as SignupFinalizePayload);

    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    render(
      <SignupForm onSignupRequest={finalizeMock} onSuccess={onSuccess} onCancel={onCancel} />
    );

    const user = await fillSignupForm();
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Account already exists.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(requestSignupCodeMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByPlaceholderText('Verification Code')).toBeInTheDocument();
  });

  it('shows server error during verification and allows retry', async () => {
    requestSignupCodeMock.mockResolvedValueOnce(undefined);

    const serverError = new signupService.SignupError('signup.errors.server', { status: 500 });
    const finalizeMock = vi.fn<
      Parameters<SignupFormProps['onSignupRequest']>,
      ReturnType<SignupFormProps['onSignupRequest']>
    >();
    finalizeMock.mockRejectedValueOnce(serverError);
    finalizeMock.mockResolvedValueOnce({} as SignupFinalizePayload);

    const onSuccess = vi.fn();

    render(
      <SignupForm onSignupRequest={finalizeMock} onSuccess={onSuccess} onCancel={vi.fn()} />
    );

    const user = await fillSignupForm();
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    const codeInput = await screen.findByPlaceholderText('Verification Code');
    await user.type(codeInput, '123456');

    await user.click(screen.getByRole('button', { name: /verify & sign up/i }));

    expect(await screen.findByText('Server error. Please try again later.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(finalizeMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
