# Open Archive

[![Available on Chrome Web Store](https://img.shields.io/chrome-web-store/v/kgbhhpbffpfihonajnpmoalggjcnidkg.svg)](https://chromewebstore.google.com/detail/open-archive/kgbhhpbffpfihonajnpmoalggjcnidkg?hl=en)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/souvikmaji)

Ever wondered what a webpage looked like before it changed? Open Archive is your personal time machine for the internet, providing quick and easy access to the most recent archived version of any website. Whether you're a researcher, journalist, or just curious about the evolution of content, this extension is designed to help you explore the web's history with a single click.

## Try it in Firefox

1. In Firefox for desktop 140 or later, open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `manifest.json` from this repository.
3. Open a web page and click **Open Archive** in the Extensions menu or toolbar. The latest archived version opens in a new tab.

Firefox removes temporary add-ons when it restarts.

## Key Features:

<img src="https://github.com/souvikmaji/open-archive/blob/main/icons/open-archive.gif" width="700" height="500" />


- Instant Access: Automatically opens the latest archived version of the current page in a new tab.
- Explore Historical Snapshots: Navigate through different versions of the page to see how content has evolved over time.
- Simple & Fast: No need for complex tools or searches—get the archived version instantly.

## Why Use Open Archive?
- Content Preservation: Perfect for users who want to see how web pages looked at different times, preserving content that might otherwise be lost or changed.
- Research & Reference: Ideal for academic research, content creators, and anyone needing to reference past versions of web pages.
- User-Friendly: With its clean interface and straightforward functionality, accessing the web's history has never been easier.
- Take control of your browsing experience and uncover the hidden stories behind your favorite websites. 


**Install Open Archive today and start exploring the web’s rich history!**

> This is not an official extension from the Internet Archive. It uses the Wayback Machine API to access archived versions of web pages.

## Browser tests and Firefox package

Run `npm ci` with Node.js 22.12 or later. Set `CHROMIUM_BIN` and `FIREFOX_BIN` to your browser executable paths, then run `npm run test:chromium` and `npm run test:firefox`. Use a current Chromium-based browser with DevTools extension automation and current desktop Firefox. The tests load the unpacked extension and check the URL of the archive tab using a local test page.

GitHub Actions runs both tests on pull requests into the default branch and on pushes to it. After both pass, the workflow validates the Firefox package and attaches the unsigned ZIP as the `firefox-amo` artifact. Run `npm run package:firefox` to produce the same package locally.

### Live archive check

Run `LIVE_ARCHIVE=1 npm run test:chromium` and `LIVE_ARCHIVE=1 npm run test:firefox`, or manually run the **Browser compatibility** workflow with **Check the real WSJ article and its Archive.today snapshot** enabled. Each browser uses a fresh profile, opens the [WSJ article about Starbucks CEO Brian Niccol](https://www.wsj.com/business/hospitality/brian-niccol-starbucks-ceo-82816ef8), and clicks the extension. The test checks that a passage absent from the publisher page renders in the new Archive.today tab.

The live check depends on both sites being reachable. A rate limit, challenge page, or unavailable snapshot can fail this check. Push and pull request runs use the local fixture.

See the [Firefox submission notes](FIREFOX_RELEASE.md) for the store listing and reviewer steps.
