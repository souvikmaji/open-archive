import assert from 'node:assert/strict';
import { waitFor } from './fixture.mjs';

export const articleUrl = 'https://www.wsj.com/business/hospitality/brian-niccol-starbucks-ceo-82816ef8';
export const liveArchiveOptions = {
  skip: process.env.LIVE_ARCHIVE !== '1' && 'Set LIVE_ARCHIVE=1 to contact WSJ and Archive.today',
  timeout: 80_000,
};

// This passage appears late in the archived article, beyond the public preview.
const articleBody = /keeping\s+in\s+touch\s+with\s+another\s+key\s+constituent/i;
const archiveChallenge = /captcha|verify (?:that )?you are human|too many requests|checking your browser/i;

export function assertPublisherPreview(url, text) {
  const original = new URL(articleUrl);
  const loaded = new URL(url);
  assert.equal(loaded.origin + loaded.pathname, original.origin + original.pathname,
    'The publisher must leave the browser on the article URL');
  assert.ok(!articleBody.test(text), 'The publisher page exposed the archived passage without a subscription');
}

export function isArchiveUrl(url) {
  return /^https:\/\/archive\.(?:is|ph|today)\//.test(url);
}

export async function waitForArchivedArticle(readArchive) {
  let archiveUrl;
  let challengeShown = false;
  try {
    await waitFor(async () => {
      const archive = await readArchive();
      if (!archive) return false;
      archiveUrl = archive.url;
      challengeShown = archiveChallenge.test(archive.text);
      return isArchiveUrl(archiveUrl) && articleBody.test(archive.text);
    }, 'the WSJ article text to render in the archive tab', 35_000);
  } catch (error) {
    const detail = challengeShown ? ' Archive.today returned a browser challenge or rate limit.' : '';
    throw new Error(`${error.message}. Archive tab: ${archiveUrl ?? 'none found'}.${detail}`, { cause: error });
  }
}
