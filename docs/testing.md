# Manual Testing Guide – Signup Flow Error Handling

This guide outlines manual checks to verify the new signup error messaging and retry behaviour.

## Prerequisites
- Development server running (`npm run dev`) and backend API accessible.
- Test account email inbox available to receive verification codes.

## Test Scenarios

### 1. HTTP Error Messaging
1. Open the signup form in the application.
2. Trigger API responses with the following HTTP status codes (use mock server tools or temporary backend adjustments):
   - **400**: confirm that a validation-style warning is shown.
   - **401 / 403**: verify that the session warning appears and the user is prompted to sign in.
   - **409**: ensure the “account already exists” message is displayed with the retry button.
   - **422**: check that field-level guidance is shown.
   - **429**: confirm the rate-limit message instructs the user to wait.
   - **500+**: verify the generic server error messaging.
3. For each case, confirm that clicking **Retry** repeats the last request.

### 2. Network Failure Handling
1. Disable network connectivity (e.g., using browser dev tools).
2. Submit the signup form.
3. Confirm that a network-specific message appears and retry becomes available once connectivity is restored.

### 3. Verification Step Errors
1. Complete the signup form and request the verification code.
2. Enter an invalid code to confirm the inline validation message appears.
3. Force a backend error during verification and ensure the error banner and retry button are displayed.
4. Use the retry button to re-send the verification request and confirm success resets the form and returns to the login screen.

### 4. Theme Persistence Fallback
1. With the browser console open, simulate a `localStorage` access failure (e.g., set it to throw in dev tools).
2. Reload the page and confirm the app defaults to the light theme without crashing.
3. Toggle the theme and ensure a warning is logged but the UI still updates.

Record any unexpected behaviour with screenshots and console logs for follow-up.
