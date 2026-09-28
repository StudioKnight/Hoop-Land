import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminPassword = 'integration-test-password-7391';
let temporaryDirectory;
let baseUrl;
let child;
let sessionCookie;

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited early with status ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('API did not become ready.');
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers);
  if (options.mutate) {
    headers.set('Origin', baseUrl);
    if (sessionCookie) headers.set('Cookie', sessionCookie);
  }
  return fetch(`${baseUrl}${pathname}`, { ...options, headers });
}

function recordForm(record, image) {
  const form = new FormData();
  form.append('record', JSON.stringify(record));
  if (image) form.append('image', new Blob([image.bytes], { type: image.type }), image.name);
  return form;
}

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'hoop-land-api-'));
  const port = await unusedPort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ADMIN_PASSWORD: adminPassword,
      API_HOST: '127.0.0.1',
      API_PORT: String(port),
      ARCHIVE_DATA_DIR: path.join(temporaryDirectory, 'data'),
      ARCHIVE_IMAGES_DIR: path.join(temporaryDirectory, 'uploads'),
    },
    stdio: 'ignore',
  });
  await waitForApi();
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('API protects writes, persists metadata, and preserves original upload bytes', async () => {
  const initialResponse = await request('/api/images');
  assert.equal(initialResponse.status, 200);
  const initialRecords = await initialResponse.json();
  assert.equal(initialRecords.length, 8);

  const unauthenticatedWrite = await request('/api/images', {
    method: 'POST',
    mutate: true,
    body: recordForm({ team: 'Test', season: '2025-26', conference: 'Eastern Conference' }),
  });
  assert.equal(unauthenticatedWrite.status, 401);

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    mutate: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword }),
  });
  assert.equal(loginResponse.status, 200);
  sessionCookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv9sAAAAASUVORK5CYII=', 'base64');
  const originalHash = createHash('sha256').update(imageBytes).digest('hex');
  const newRecord = {
    id: 'test-upload-001',
    image: '',
    team: 'Test Basketball Club',
    season: '2025-26',
    conference: 'Eastern Conference',
    group: 'Test Collection',
  };
  const createdResponse = await request('/api/images', {
    method: 'POST',
    mutate: true,
    body: recordForm(newRecord, { bytes: imageBytes, type: 'image/png', name: 'original.png' }),
  });
  assert.equal(createdResponse.status, 201, await createdResponse.clone().text());
  const created = await createdResponse.json();
  assert.match(created.image, /^\/images\/[0-9a-f-]{36}\/original\.png$/i);

  const servedImage = await request(created.image);
  assert.equal(servedImage.status, 200);
  const servedBytes = Buffer.from(await servedImage.arrayBuffer());
  assert.equal(createHash('sha256').update(servedBytes).digest('hex'), originalHash);

  const metadataEdit = { ...created, team: 'Updated Basketball Club' };
  const updatedResponse = await request(`/api/images/${created.id}`, {
    method: 'PUT',
    mutate: true,
    body: recordForm(metadataEdit),
  });
  assert.equal(updatedResponse.status, 200);
  const updated = await updatedResponse.json();
  assert.equal(updated.team, 'Updated Basketball Club');
  assert.equal(updated.image, created.image);

  const duplicateResponse = await request('/api/images', {
    method: 'POST',
    mutate: true,
    body: recordForm({ ...newRecord, image: created.image }),
  });
  assert.equal(duplicateResponse.status, 409);

  const deleteResponse = await request(`/api/images/${created.id}`, { method: 'DELETE', mutate: true });
  assert.equal(deleteResponse.status, 204);
  assert.equal((await request(created.image)).status, 404);

  const persistedRecords = JSON.parse(await readFile(path.join(temporaryDirectory, 'data', 'images.json'), 'utf8'));
  assert.equal(persistedRecords.some((record) => record.id === created.id), false);
  assert.equal(persistedRecords.length, initialRecords.length);
});
