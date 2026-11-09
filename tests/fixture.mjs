import { once } from 'node:events';
import { realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const extensionPath = await realpath(fileURLToPath(new URL('../', import.meta.url)));

export async function testPage(t) {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<title>Open Archive test page</title>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));

  const pageUrl = `http://127.0.0.1:${server.address().port}/article?edition=1&language=en`;
  return { pageUrl, archiveUrl: `https://archive.is/newest/${pageUrl}` };
}

export async function waitFor(check, description, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
