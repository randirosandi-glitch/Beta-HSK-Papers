# HSK Papers — Google Drive Audio and Admin Upload

## Existing audio index

The Beta app reads the public Apps Script /exec endpoint to discover MP3 files under the **HSK Papers Audio** root folder:

https://drive.google.com/drive/folders/1AkMW158u30P7Kf8HoncKGx-PFXR_pcsH

The index supports JSON and JSONP. The panel checks this index to show real audio availability instead of guessing from hard-coded package names.

## One-time upload setup

The source in **drive-audio-index.gs** now supports authenticated MP3 upload and attaching an existing Drive MP3. The already-deployed Apps Script code will not change just because this repository file changed; the Google Apps Script owner must deploy the updated source once.

1. Open the Google Apps Script project which currently serves the audio index.
2. Replace its script with the full contents of this repository's drive-audio-index.gs.
3. In **Project Settings → Script properties**, set **ADMIN_UPLOAD_KEY** to a private random string at least 32 characters long. Do not store it in GitHub or share it.
4. **Deploy → Manage deployments** → edit the existing web app deployment → select **New version** → Deploy. Keep **Execute as: Me** and **Who has access: Anyone** so the app can continue reading the index.
5. Keep the existing deployment URL. If you instead create a new deployment and the URL changes, update DRIVE_INDEX_URL in the admin panel's index.html.
6. Open the admin panel and enter the same secret into **Kunci upload Drive**.

GET is public so the HSK Papers app can read the index. Every POST change requires the secret configured in Script Properties. Requests with a missing or incorrect key are rejected.

## Upload conventions

- A package such as H51001 is stored as **HSK Papers Audio/HSK 5/H51001.mp3**.
- The endpoint creates the HSK subfolder if it is missing.
- Upload via the admin panel is limited to MP3 files of 12 MB or less each. For larger files, upload them to Drive manually and use the file link in the panel.
- When replacing audio, the old canonical file is moved to Trash, not permanently deleted.
- Only the specific audio file is set to **Anyone with the link — Viewer**. The parent folder is not made public.
- The panel polls the public audio index after a change and reports success only after the package code appears there.

## Test checklist

1. Open the /exec URL in a signed-out/private browser. It should return JSON with a files object.
2. In the panel, refresh the catalog and confirm package audio statuses populate from the index.
3. Upload a small test MP3 to Beta first. Confirm the new code appears in the index and can be played and seeked in the app.
4. Try attaching a valid existing MP3 file link. Confirm it is renamed/moved to the selected HSK folder and appears in the same index.
5. If a request is sent but no audio appears, verify the deployed script version, ADMIN_UPLOAD_KEY, ownership/access to the source file, and Drive sharing restrictions.
