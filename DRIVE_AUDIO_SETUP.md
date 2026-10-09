# HSK Papers Beta — automatic Google Drive audio

## Current status
The Beta app now contains the audio-index client, and `drive-audio-index.gs` is the Google Apps Script endpoint source. The endpoint must be deployed once by the owner of the Google Drive folder; a GitHub commit cannot deploy code into a Google account.

## One-time setup
1. Sign in to the Google account that owns the **HSK Papers Audio** folder.
2. Open https://script.google.com/ and create a new project.
3. Replace the editor contents with this repository's `drive-audio-index.gs`.
4. Click **Deploy → New deployment** and choose **Web app**.
5. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then deploy and approve the requested Drive permission.
6. Copy the Web app URL ending in `/exec`.
7. In `index.html`, set `HSK_LISTENING_DRIVE_INDEX_URL` to that URL and commit the change to the **Beta-HSK-Papers** repository only.

## Upload convention
- `HSK Papers Audio/HSK 4/H41001.mp3`
- `HSK Papers Audio/HSK 5/H51001.mp3`

Use the package code exactly as the filename, with `.mp3` in lowercase. The script scans only the two named subfolders and matches files named `HSK4...` or `HSK5...`. Make each audio file playable by the intended audience (typically **Anyone with the link — Viewer**); do not make the parent folder public unless that is what you intend.

## Test checklist
- Open the deployed `/exec` URL in a signed-out/private browser. It should return JSON with a `files` object.
- Confirm `files.H51001.url` is present when H51001.mp3 is in the HSK 5 folder.
- Open Beta and load H51001 Listening; confirm playback and seeking.
- Upload a second test file named for another package, then reload Beta and verify the matching package discovers it.
- If the endpoint returns an authorization or Drive permission error, do not assume automatic discovery is live yet.

## Notes
The app checks the endpoint when a Listening player is rendered. If a file is not found, the player shows the missing-audio notice. No changes are made to Stable by this setup.
