import { randomUUID } from 'crypto';
import { readCollection, writeCollection } from './storageService.js';

const COLLECTION = 'signupRequests';

export async function listSignupRequests() {
  const requests = await readCollection(COLLECTION);
  if (!Array.isArray(requests)) {
    return [];
  }
  return requests
    .slice()
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
}

export async function addSignupRequest(payload) {
  const requests = await readCollection(COLLECTION);
  if (!Array.isArray(requests)) {
    throw new Error('Signup requests collection is not an array');
  }
  const request = {
    id: payload.id || randomUUID(),
    ...payload,
  };
  requests.push(request);
  await writeCollection(COLLECTION, requests);
  return request;
}

export async function removeSignupRequest(id) {
  const requests = await readCollection(COLLECTION);
  if (!Array.isArray(requests)) {
    throw new Error('Signup requests collection is not an array');
  }
  const index = requests.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  requests.splice(index, 1);
  await writeCollection(COLLECTION, requests);
  return true;
}
