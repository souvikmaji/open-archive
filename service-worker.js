chrome.action.onClicked.addListener((tab) => {
    const currentUrl = tab.url;
    const archiveUrl = `http://archive.is/newest/${currentUrl}`;
    
    chrome.tabs.create({ url: archiveUrl });
  });