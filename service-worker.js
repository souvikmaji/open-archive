const extension = globalThis.browser ?? chrome;
const canShowChromeStorePrompt = extension.runtime.getURL('').startsWith('chrome-extension:') &&
  typeof extension.action.openPopup === 'function';
const ratingInterval = 30 * 24 * 60 * 60 * 1000;

async function showRatingPrompt(tab) {
  const { lastPromptTime, usedOnce } = await extension.storage.local.get(['lastPromptTime', 'usedOnce']);
  if (!usedOnce || (lastPromptTime && Date.now() - lastPromptTime <= ratingInterval)) {
    return false;
  }

  await extension.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
  try {
    await extension.action.openPopup({ windowId: tab.windowId });
  } finally {
    await extension.action.setPopup({ tabId: tab.id, popup: '' }).catch(console.error);
  }

  await extension.storage.local.set({ lastPromptTime: Date.now() }).catch(console.error);
  return true;
}

async function openArchive(tab) {
  if (!tab.url || !/^https?:\/\//i.test(tab.url)) {
    return;
  }

  if (canShowChromeStorePrompt) {
    const promptShown = await showRatingPrompt(tab).catch((error) => {
      console.error(error);
      return false;
    });
    if (promptShown) {
      return;
    }
  }

  await extension.tabs.create({ url: `https://archive.is/newest/${tab.url}` });
  if (canShowChromeStorePrompt) {
    await extension.storage.local.set({ usedOnce: true });
  }
}

extension.action.onClicked.addListener((tab) => {
  openArchive(tab).catch(console.error);
});
