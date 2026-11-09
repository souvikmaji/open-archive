# Firefox Add-ons submission

Use the `firefox-amo` artifact from a successful run on `main`. Extract the artifact and upload the inner `open_archive-*.zip` to the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/). Choose **On this site** for a listed desktop add-on. The ZIP contains the readable extension source. Keep the Gecko ID in `manifest.json` for future updates.

## Listing draft

- **Name** — Open Archive
- **Suggested slug** — `open-archive-latest-snapshot`
- **Summary** — Open the newest archived snapshot of the current page with one click.
- **Description** — Open a page and click Open Archive in the Firefox toolbar or Extensions menu. The extension opens a new tab with the newest snapshot available from Archive.today. Snapshot availability depends on Archive.today.
- **Privacy policy** — Use the [repository privacy policy](https://github.com/souvikmaji/open-archive/blob/main/privacy_policy.md). The add-on sends the active page URL to Archive.today when the user clicks the toolbar action. The manifest declares this required browsing activity data.

## Reviewer instructions

1. Install the add-on in Firefox Desktop 140 or later.
2. Open a public HTTP or HTTPS page.
3. Choose **Open Archive** from the toolbar or Extensions menu. Verify that a new tab opens at `https://archive.is/newest/` followed by the original page URL.

The shared manifest includes a Chrome service worker and a Firefox background script. Firefox ignores the service worker entry. The linter can also flag the Android data-consent minimum when reading the desktop manifest. Submit the listing for desktop Firefox.
