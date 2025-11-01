import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  MAX_SIGNUP_CODE_ATTEMPTS,
  createSignupCodeRecord,
  createSignupCodeStore,
  verifySignupCodeAttempt,
} from '../signupCodesStore.js';

describe('signup verification codes', () => {
  const email = 'user@example.com';
  const code = '123456';
  let store;

  beforeEach(() => {
    store = createSignupCodeStore();
  });

  it('invalidates expired codes', () => {
    const baseTime = Date.now();
    createSignupCodeRecord({
      email,
      code,
      payload: { email },
      ttl: 500,
      now: () => baseTime,
      store,
    });

    const result = verifySignupCodeAttempt({
      email,
      code,
      now: baseTime + 1000,
      store,
    });

    assert.equal(result.status, 'expired');
    assert.equal(store.size, 0);
  });

  it('tracks failed attempts and locks after the maximum threshold', () => {
    const payload = { email };
    const baseTime = Date.now();
    createSignupCodeRecord({
      email,
      code,
      payload,
      now: () => baseTime,
      store,
    });

    for (let attempt = 1; attempt < MAX_SIGNUP_CODE_ATTEMPTS; attempt += 1) {
      const result = verifySignupCodeAttempt({
        email,
        code: '000000',
        now: baseTime + 1,
        store,
      });

      assert.equal(result.status, 'mismatch');
      assert.equal(result.attempts, attempt);
      assert.equal(store.size, 1);
    }

    const finalResult = verifySignupCodeAttempt({
      email,
      code: '111111',
      now: baseTime + 1,
      store,
    });

    assert.equal(finalResult.status, 'locked');
    assert.equal(store.size, 0);
  });

  it('returns payload and clears store when code matches', () => {
    const payload = { email, name: 'Test User' };
    const baseTime = Date.now();
    createSignupCodeRecord({
      email,
      code,
      payload,
      now: () => baseTime,
      store,
    });

    const result = verifySignupCodeAttempt({
      email,
      code,
      now: baseTime + 1,
      store,
    });

    assert.equal(result.status, 'valid');
    assert.deepEqual(result.payload, payload);
    assert.equal(store.size, 0);
  });
});
