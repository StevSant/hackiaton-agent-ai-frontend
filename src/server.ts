import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
app.use(express.json());

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */
// Minimal STT endpoint: accepts audio and returns a transcript string
// Simple endpoint; relies on frontend to use fetch with FormData. Here we do not parse the file,
// just acknowledge and return an empty transcript placeholder to keep the flow working without extra deps.
app.post('/api/stt', async (req, res) => {
  try {
    // NOTE: For real STT, integrate a provider and parse multipart/form-data here.
    // Placeholder: integrate a real STT provider here (Azure, Deepgram, Whisper, etc.)
    // For now, just return an empty transcript to avoid breaking the UI.
    res.json({ transcript: '' });
  } catch (e: any) {
    res.status(500).send(e?.message || 'stt failed');
  }
});

// Simple in-memory auth stub for dev/demo (DO NOT use in production)
app.post('/auth/login', (req, res) => {
  const { email, username } = req.body || {};
  // Issue a dummy token; in real life, verify credentials
  res.json({ token: 'dev-token-' + (email || username || 'user') });
});

app.post('/auth/register', (req, res) => {
  const { email, username } = req.body || {};
  // Pretend user is created and return token
  res.json({ token: 'dev-token-' + (email || username || 'user') });
});

app.get('/auth/me', (req, res) => {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = auth.substring('Bearer '.length);
  // Derive a fake profile from token suffix
  const suffix = token.replace(/^dev-token-/, '') || 'user';
  res.json({ id: '1', username: suffix, email: `${suffix}@example.com` });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
