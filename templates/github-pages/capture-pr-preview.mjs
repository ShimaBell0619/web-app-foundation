import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const reviewDir = path.resolve(process.env.PAGES_REVIEW_DIR ?? '.pages-review');
const basePath = process.env.PAGES_BASE_PATH ?? '/';
if (!basePath.startsWith('/') || !basePath.endsWith('/')) {
  throw new Error(`PAGES_BASE_PATH must start and end with '/': ${basePath}`);
}

const host = '127.0.0.1';
const port = 4174;
const reviewUrl = `http://${host}:${port}${basePath}`;

await mkdir(reviewDir, { recursive: true });

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(
  npmCommand,
  ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort', '--base', basePath],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  },
);

let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverLog += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`preview server exited before becoming ready:\n${serverLog}`);
    }
    try {
      const response = await fetch(reviewUrl);
      if (response.ok) return;
    } catch {
      // Retry until the development server becomes reachable.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`preview server did not become ready:\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(reviewUrl, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(reviewDir, 'desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(reviewUrl, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(reviewDir, 'mobile.png'),
    fullPage: true,
  });
} finally {
  await browser?.close();
  if (server.exitCode === null) server.kill('SIGTERM');
}
