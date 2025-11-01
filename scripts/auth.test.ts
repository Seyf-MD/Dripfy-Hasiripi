import { spawn } from 'child_process';

const API_PORT = Number(process.env.API_PORT || 4000);
const BASE_URL = `http://localhost:${API_PORT}`;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServerReady(): Promise<void> {
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await delay(400);
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
  throw new Error('Server did not become ready in time.');
}

async function expectForbidden(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (response.status !== 403) {
    throw new Error(`Expected 403 for ${path}, received ${response.status}. Body: ${JSON.stringify(body)}`);
  }
  if (body?.ok !== false) {
    throw new Error(`Expected ok=false in body for ${path}. Body: ${JSON.stringify(body)}`);
  }
  console.log(`✔️  ${path} returned 403 as expected.`);
}

async function run() {
  const serverProcess = spawn('node', ['server/index.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, API_PORT: String(API_PORT) },
  });

  serverProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });

  serverProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[server-err] ${chunk}`);
  });

  try {
    await waitForServerReady();
    await expectForbidden('/api/signup/requests', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    await expectForbidden('/api/signup/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'test' }),
    });
  } finally {
    serverProcess.kill();
    await new Promise(resolve => {
      serverProcess.once('exit', () => resolve(undefined));
      serverProcess.once('close', () => resolve(undefined));
    });
  }
}

run().catch((error) => {
  console.error('❌ Auth test failed:', error);
  process.exitCode = 1;
});
