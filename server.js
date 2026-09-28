import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import helmet from 'helmet';
import multer from 'multer';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const archiveDirectory = path.resolve(process.env.ARCHIVE_DATA_DIR || path.join(projectRoot, 'data'));
const imageDirectory = path.resolve(process.env.ARCHIVE_IMAGES_DIR || path.join(projectRoot, 'uploads'));
const recordsPath = path.join(archiveDirectory, 'images.json');
const samplePath = path.join(projectRoot, 'src', 'data', 'images.json');
const port = Number(process.env.API_PORT || 4174);
const host = process.env.API_HOST || '127.0.0.1';
const maxImageBytes = 25 * 1024 * 1024;
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const sessions = new Map();
const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/tiff']);
const configuredPassword = process.env.ADMIN_PASSWORD;
const passwordConfigured = Boolean(configuredPassword && configuredPassword.length >= 16);
const passwordSalt = randomBytes(16);
const passwordHash = passwordConfigured ? scryptSync(configuredPassword, passwordSalt, 64) : null;

let writeQueue = Promise.resolve();

function withWriteLock(action) {
  const result = writeQueue.then(action);
  writeQueue = result.catch(() => {});
  return result;
}

async function readRecords() {
  const data = JSON.parse(await readFile(recordsPath, 'utf8'));
  if (!Array.isArray(data)) throw new Error('The archive JSON must contain an array.');
  return data;
}

async function writeRecords(records) {
  const temporaryPath = `${recordsPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, { flag: 'wx' });
  await rename(temporaryPath, recordsPath);
}

async function initializeStorage() {
  await Promise.all([mkdir(archiveDirectory, { recursive: true }), mkdir(imageDirectory, { recursive: true })]);
  try {
    await readFile(recordsPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(recordsPath, await readFile(samplePath), { flag: 'wx' }).catch((writeError) => {
      if (writeError.code !== 'EEXIST') throw writeError;
    });
  }
  const records = await readRecords();
  const ids = records.map((record) => record.id);
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
    throw new Error('The archive contains missing or duplicate record IDs.');
  }
}

function sendError(response, status, error) {
  response.status(status).json({ error });
}

function readCookie(request, name) {
  const cookieHeader = request.get('cookie') || '';
  const item = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}

function adminSession(request) {
  const token = readCookie(request, 'hoop_land_admin');
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return token;
}

function requireAdmin(request, response, next) {
  if (!adminSession(request)) return sendError(response, 401, 'Admin sign-in required.');
  next();
}

function requireSameOrigin(request, response, next) {
  const origin = request.get('origin');
  const hostHeader = request.get('host');
  if (!origin || !hostHeader) return sendError(response, 403, 'A same-origin request is required.');
  try {
    if (new URL(origin).host !== hostHeader) return sendError(response, 403, 'Cross-origin changes are not allowed.');
  } catch {
    return sendError(response, 403, 'Invalid request origin.');
  }
  next();
}

function parseRecord(value) {
  let parsed;
  try {
    parsed = JSON.parse(value || '');
  } catch {
    const error = new Error('The record field must contain valid JSON.');
    error.status = 400;
    throw error;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const error = new Error('A record object is required.');
    error.status = 400;
    throw error;
  }
  for (const field of ['team', 'season', 'conference']) {
    if (typeof parsed[field] !== 'string' || !parsed[field].trim() || parsed[field].length > 200) {
      const error = new Error(`${field} is required and must be 200 characters or fewer.`);
      error.status = 400;
      throw error;
    }
  }
  if (parsed.id !== undefined && (typeof parsed.id !== 'string' || parsed.id.length > 160)) {
    const error = new Error('ID must be a string no longer than 160 characters.');
    error.status = 400;
    throw error;
  }
  return {
    ...parsed,
    id: parsed.id?.trim() || `nba-${randomUUID()}`,
    team: parsed.team.trim(),
    season: parsed.season.trim(),
    conference: parsed.conference.trim(),
    group: typeof parsed.group === 'string' ? parsed.group.trim() : '',
  };
}

function safeOriginalFilename(originalName) {
  const baseName = path.basename(String(originalName).replaceAll('\\', '/'));
  const cleaned = baseName
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^\p{L}\p{N}._() -]/gu, '-')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 180);
  return cleaned || 'original-image';
}

async function storeOriginal(file) {
  if (!file) return null;
  const detectedType = await fileTypeFromBuffer(file.buffer);
  if (!detectedType || !supportedImageTypes.has(detectedType.mime)) {
    const error = new Error('Upload a supported raster image (JPEG, PNG, WebP, GIF, AVIF, BMP, or TIFF).');
    error.status = 415;
    throw error;
  }
  const directoryName = randomUUID();
  const originalName = safeOriginalFilename(file.originalname);
  const directoryPath = path.join(imageDirectory, directoryName);
  const filePath = path.join(directoryPath, originalName);
  await mkdir(directoryPath, { recursive: false });
  try {
    await writeFile(filePath, file.buffer, { flag: 'wx' });
  } catch (error) {
    await rm(directoryPath, { recursive: true, force: true });
    throw error;
  }
  return { image: `/images/${directoryName}/${encodeURIComponent(originalName)}`, filePath };
}

async function removeIfUnreferenced(imagePath, records) {
  if (typeof imagePath !== 'string' || records.some((record) => record.image === imagePath)) return;
  const match = /^\/images\/([0-9a-f-]{36})\/([^/]+)$/i.exec(imagePath);
  if (!match) return;
  const fileName = decodeURIComponent(match[2]);
  const directoryPath = path.resolve(imageDirectory, match[1]);
  const filePath = path.resolve(directoryPath, fileName);
  if (!filePath.startsWith(`${directoryPath}${path.sep}`)) return;
  await rm(filePath, { force: true });
  await rmdir(directoryPath).catch((error) => {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageBytes, files: 1, fields: 8, fieldSize: 32 * 1024 },
});

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use('/images', express.static(imageDirectory, { dotfiles: 'deny', index: false, maxAge: '1h' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

app.get('/api/health', (_request, response) => response.json({ ok: true }));

app.get('/api/auth/status', (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json({ configured: passwordConfigured, authenticated: Boolean(adminSession(request)) });
});

app.post('/api/auth/login', loginLimiter, requireSameOrigin, (request, response) => {
  if (!passwordConfigured) return sendError(response, 503, 'Set ADMIN_PASSWORD to a value of at least 16 characters and restart the API.');
  const submittedPassword = typeof request.body?.password === 'string' ? request.body.password : '';
  if (submittedPassword.length > 1024) return sendError(response, 401, 'Incorrect admin password.');
  const submittedHash = scryptSync(submittedPassword, passwordSalt, 64);
  if (!timingSafeEqual(passwordHash, submittedHash)) return sendError(response, 401, 'Incorrect admin password.');

  const token = randomBytes(32).toString('base64url');
  sessions.set(token, Date.now() + sessionLifetimeMs);
  response.cookie('hoop_land_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: sessionLifetimeMs,
  });
  response.json({ configured: true, authenticated: true });
});

app.post('/api/auth/logout', requireSameOrigin, (request, response) => {
  const token = readCookie(request, 'hoop_land_admin');
  if (token) sessions.delete(token);
  response.clearCookie('hoop_land_admin', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  response.json({ authenticated: false });
});

app.get('/api/images', async (_request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store');
    response.json(await readRecords());
  } catch (error) {
    next(error);
  }
});

app.get('/api/images/:id', async (request, response, next) => {
  try {
    const record = (await readRecords()).find((item) => item.id === request.params.id);
    if (!record) return sendError(response, 404, 'Image record not found.');
    response.json(record);
  } catch (error) {
    next(error);
  }
});

app.post('/api/images', requireAdmin, requireSameOrigin, upload.single('image'), async (request, response, next) => {
  let storedUpload;
  try {
    const record = parseRecord(request.body.record);
    storedUpload = await storeOriginal(request.file);
    const created = await withWriteLock(async () => {
      const records = await readRecords();
      if (records.some((item) => item.id === record.id)) {
        const error = new Error(`ID "${record.id}" is already in use.`);
        error.status = 409;
        throw error;
      }
      if (!storedUpload && !record.image) {
        const error = new Error('An original image file is required for new records.');
        error.status = 400;
        throw error;
      }
      const savedRecord = { ...record, image: storedUpload?.image || record.image };
      await writeRecords([savedRecord, ...records]);
      return savedRecord;
    });
    response.status(201).json(created);
  } catch (error) {
    if (storedUpload) await rm(path.dirname(storedUpload.filePath), { recursive: true, force: true }).catch(() => {});
    next(error);
  }
});

app.put('/api/images/:id', requireAdmin, requireSameOrigin, upload.single('image'), async (request, response, next) => {
  let storedUpload;
  try {
    const record = parseRecord(request.body.record);
    storedUpload = await storeOriginal(request.file);
    const result = await withWriteLock(async () => {
      const records = await readRecords();
      const index = records.findIndex((item) => item.id === request.params.id);
      if (index < 0) {
        const error = new Error('Image record not found.');
        error.status = 404;
        throw error;
      }
      if (records.some((item) => item.id === record.id && item.id !== request.params.id)) {
        const error = new Error(`ID "${record.id}" is already in use.`);
        error.status = 409;
        throw error;
      }
      const previous = records[index];
      const updated = { ...previous, ...record, image: storedUpload?.image || previous.image };
      const nextRecords = records.slice();
      nextRecords[index] = updated;
      await writeRecords(nextRecords);
      if (storedUpload) await removeIfUnreferenced(previous.image, nextRecords);
      return updated;
    });
    response.json(result);
  } catch (error) {
    if (storedUpload) await rm(path.dirname(storedUpload.filePath), { recursive: true, force: true }).catch(() => {});
    next(error);
  }
});

app.delete('/api/images/:id', requireAdmin, requireSameOrigin, async (request, response, next) => {
  try {
    const removed = await withWriteLock(async () => {
      const records = await readRecords();
      const record = records.find((item) => item.id === request.params.id);
      if (!record) return null;
      const nextRecords = records.filter((item) => item.id !== request.params.id);
      await writeRecords(nextRecords);
      await removeIfUnreferenced(record.image, nextRecords);
      return record;
    });
    if (!removed) return sendError(response, 404, 'Image record not found.');
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (response.headersSent) return;
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error(error);
  sendError(response, status, status >= 500 ? 'The archive API could not complete the request.' : error.message);
});

await initializeStorage();
if (!passwordConfigured) console.warn('Admin writes are locked: set ADMIN_PASSWORD to at least 16 characters before signing in.');
app.listen(port, host, () => console.log(`Hoop Land archive API listening on http://${host}:${port}`));