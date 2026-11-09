import assert from 'node:assert/strict';
import { test } from 'node:test';
import puppeteer from 'puppeteer-core';
import { extensionPath, testPage, waitFor } from './fixture.mjs';
import { articleUrl, assertPublisherPreview, isArchiveUrl, liveArchiveOptions, waitForArchivedArticle } from './live-archive.mjs';

async function launchChromium(t, live = false) {
  const onLinuxRunner = process.env.GITHUB_ACTIONS === 'true' && process.platform === 'linux';
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_BIN || 'chromium',
    headless: !onLinuxRunner,
    pipe: true,
    protocolTimeout: 15_000,
    enableExtensions: true,
    dumpio: onLinuxRunner,
    args: [
      // The Ubuntu runner restricts user namespaces for Chrome for Testing.
      ...(!live && onLinuxRunner ? ['--no-sandbox'] : []),
      ...(!live ? ['--no-proxy-server', '--host-resolver-rules=MAP archive.is 127.0.0.1'] : []),
    ],
  });
  t.after(() => browser.close());

  const id = await browser.installExtension(extensionPath);
  const extension = (await browser.extensions()).get(id);
  assert.ok(extension?.enabled);
  return { browser, extension, id };
}

test('Chromium opens archive tabs and restores the toolbar action after the rating prompt', { timeout: 45_000 }, async (t) => {
  const { pageUrl, archiveUrl } = await testPage(t);
  const { browser, extension, id } = await launchChromium(t);
  const page = await browser.newPage();
  await page.goto(pageUrl);
  await page.bringToFront();

  async function findTarget(url, description) {
    return waitFor(() => browser.targets().find((target) => target.url() === url), description)
      .catch((error) => {
        const urls = browser.targets().map((target) => target.url());
        throw new Error(`${error.message}. Open targets: ${urls.join(', ')}`, { cause: error });
      });
  }

  async function openArchive(description) {
    await extension.triggerAction(page);
    const target = await findTarget(archiveUrl, description);
    assert.equal(target.url(), archiveUrl);
    await (await target.page()).close();
    await page.bringToFront();
  }

  await openArchive('first archive tab');
  await extension.triggerAction(page);

  const popupUrl = `chrome-extension://${id}/popup.html`;
  const popupTarget = await findTarget(popupUrl, 'rating popup');
  const popup = await popupTarget.asPage();
  await popup.waitForSelector('#ratingPrompt a', { visible: true });
  assert.match(await popup.$eval('#ratingPrompt a', (link) => link.textContent), /Rate us/);
  await popup.click('#dismiss');
  await waitFor(() => !browser.targets().includes(popupTarget), 'rating popup to close');

  await openArchive('archive tab after dismissing the popup');
});

test('Chromium live archive opens the full WSJ article', liveArchiveOptions, async (t) => {
  const { browser, extension } = await launchChromium(t, true);
  const page = await browser.newPage();
  await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  assertPublisherPreview(page.url(), await page.$eval('body', (body) => body.innerText));
  await page.bringToFront();

  const existingTargets = new Set(browser.targets());
  await extension.triggerAction(page);
  await waitForArchivedArticle(async () => {
    const target = browser.targets().find((tab) => !existingTargets.has(tab) && isArchiveUrl(tab.url()));
    const archive = await target?.page();
    if (!archive) return undefined;
    const text = await archive.evaluate(() => document.body?.innerText ?? '').catch((error) => {
      if (/Execution context was destroyed|Cannot find context/.test(error.message)) return '';
      throw error;
    });
    return { url: archive.url(), text };
  });
});
