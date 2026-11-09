import assert from 'node:assert/strict';
import { waitFor } from './fixture.mjs';

export const articleUrl = 'https://www.wsj.com/real-estate/florida-cape-coal-home-prices-3f64a0df';
export const liveArchiveOptions = {
  skip: process.env.LIVE_ARCHIVE !== '1' && 'Set LIVE_ARCHIVE=1 to contact WSJ and Archive.today',
  timeout: 80_000,
};

// This passage appears late in the archived article, beyond the public preview.
const articleBody = /when the fundamentals stopped adding up/i;

export function assertPublisherPreview(url, text) {
  const original = new URL(articleUrl);
  const loaded = new URL(url);
  assert.equal(loaded.origin + loaded.pathname, original.origin + original.pathname,
    'The publisher must leave the browser on the article URL');
  assert.doesNotMatch(text, articleBody, 'The publisher page exposed the archived passage without a subscription');
}

export function isArchiveUrl(url) {
  return /^https:\/\/archive\.(?:is|ph|today)\//.test(url);
}

export async function waitForArchivedArticle(readArchive) {
  let archiveUrl;
  try {
    await waitFor(async () => {
      const archive = await readArchive();
      if (!archive) return false;
      archiveUrl = archive.url;
      return isArchiveUrl(archiveUrl) && articleBody.test(archive.text);
    }, 'the WSJ article text to render in the archive tab', 35_000);
  } catch (error) {
    throw new Error(`${error.message}. Archive tab: ${archiveUrl ?? 'none found'}`, { cause: error });
  }
}
