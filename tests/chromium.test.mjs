import assert from 'node:assert/strict';
import { test } from 'node:test';
import puppeteer from 'puppeteer-core';
import { extensionPath, testPage, waitFor } from './fixture.mjs';

test('Chromium opens archive tabs and restores the toolbar action after the rating prompt', { timeout: 45_000 }, async (t) => {
  const { pageUrl, archiveUrl } = await testPage(t);
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_BIN || 'chromium',
    pipe: true,
    enableExtensions: true,
    args: [
      '--no-proxy-server',
      '--host-resolver-rules=MAP archive.is 127.0.0.1',
    ],
  });
  t.after(() => browser.close());

  const id = await browser.installExtension(extensionPath);
  const extension = (await browser.extensions()).get(id);
  assert.ok(extension?.enabled);

  const page = await browser.newPage();
  await page.goto(pageUrl);
  await page.bringToFront();

  async function openArchive() {
    await extension.triggerAction(page);
    const target = await browser.waitForTarget((tab) => tab.url() === archiveUrl, { timeout: 10_000 });
    assert.equal(target.url(), archiveUrl);
    await (await target.page()).close();
    await page.bringToFront();
  }

  await openArchive();
  await extension.triggerAction(page);

  const popupUrl = `chrome-extension://${id}/popup.html`;
  const popupTarget = await browser.waitForTarget((target) => target.url() === popupUrl, { timeout: 10_000 });
  const popup = await popupTarget.asPage();
  await popup.waitForSelector('#ratingPrompt a', { visible: true });
  assert.match(await popup.$eval('#ratingPrompt a', (link) => link.textContent), /Rate us/);
  await popup.click('#dismiss');
  await waitFor(() => !browser.targets().includes(popupTarget), 'rating popup to close');

  await openArchive();
});
