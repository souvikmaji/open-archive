import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { extensionPath, testPage, waitFor } from './fixture.mjs';

function connectBiDi(socket) {
  const pending = new Map();
  let nextId = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.type === 'error') {
      request.reject(new Error(`${request.method}: ${message.message}`));
    } else {
      request.resolve(message.result);
    }
  });

  socket.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Firefox disconnected'));
    pending.clear();
  });

  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { method, resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

test('Firefox opens archive tabs through its toolbar action', { timeout: 45_000 }, async (t) => {
  const { pageUrl, archiveUrl } = await testPage(t);
  const profile = await mkdtemp(join(tmpdir(), 'open-archive-firefox-'));
  await writeFile(join(profile, 'user.js'), `
    user_pref("browser.aboutwelcome.enabled", false);
    user_pref("browser.shell.checkDefaultBrowser", false);
    user_pref("network.dns.localDomains", "archive.is");
    user_pref("network.trr.mode", 5);
    user_pref("network.proxy.type", 0);
  `);

  const portProbe = createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const { port } = portProbe.address();
  await new Promise((resolve) => portProbe.close(resolve));

  const firefox = spawn(process.env.FIREFOX_BIN || 'firefox', [
    '--headless', '--no-remote', '--remote-allow-system-access', '--profile', profile, '--remote-debugging-port', String(port),
  ], {
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const stopped = once(firefox, 'exit');
  // The early-exit check below handles spawn errors.
  stopped.catch(() => {});
  t.after(async () => {
    firefox.kill();
    await stopped.catch(() => {});
    await rm(profile, { recursive: true, force: true });
  });

  let startupOutput = '';
  firefox.stderr.setEncoding('utf8').on('data', (chunk) => {
    startupOutput = (startupOutput + chunk).slice(-4000);
  });
  await Promise.race([
    stopped.then(() => { throw new Error(`Firefox exited during startup:\n${startupOutput}`); }),
    waitFor(() => startupOutput.includes('WebDriver BiDi listening'), 'Firefox WebDriver'),
  ]).catch((error) => {
    throw new Error(`${error.message}\n${startupOutput}`, { cause: error });
  });

  const socket = new WebSocket(`ws://127.0.0.1:${port}/session`);
  t.after(() => socket.close());
  await once(socket, 'open');
  const send = connectBiDi(socket);
  await send('session.new', { capabilities: {} });
  const { extension } = await send('webExtension.install', {
    extensionData: { type: 'path', path: extensionPath },
  });
  const { contexts: [page] } = await send('browsingContext.getTree');
  const { contexts: [window] } = await send('browsingContext.getTree', { 'moz:scope': 'chrome' });
  assert.ok(page && window, 'Firefox started with a browser window and an active tab');

  const widgetId = `${extension.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-browser-action`;
  async function clickToolbar() {
    const result = await send('script.evaluate', {
      target: { context: window.context },
      expression: `(() => {
        const { CustomizableUI } = ChromeUtils.importESModule(
          "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs"
        );
        const id = ${JSON.stringify(widgetId)};
        CustomizableUI.addWidgetToArea(id, CustomizableUI.AREA_NAVBAR);
        document.getElementById(id).querySelector(".unified-extensions-item-action-button").click();
      })()`,
      awaitPromise: true,
    });
    assert.equal(result.type, 'success', result.exceptionDetails?.text);
  }

  const tabs = async () => (await send('browsingContext.getTree')).contexts;
  await send('browsingContext.navigate', { context: page.context, url: pageUrl, wait: 'complete' });
  for (let attempt = 0; attempt < 2; attempt++) {
    await send('browsingContext.activate', { context: page.context });
    await clickToolbar();
    const archiveTab = await waitFor(async () => (await tabs()).find((tab) => tab.url === archiveUrl), 'archive tab');
    assert.notEqual(archiveTab.context, page.context);
    await send('browsingContext.close', { context: archiveTab.context });
  }
});
