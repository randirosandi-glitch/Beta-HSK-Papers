/**
 * HSK Papers — Google Drive audio index for the Beta app.
 *
 * Deploy as a Google Apps Script Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Parent folder must contain subfolders named exactly "HSK 4" and "HSK 5".
 * MP3 files must be named exactly like their package code, e.g. H51001.mp3.
 * Make audio files accessible to anyone with the link so app visitors can play them.
 */
const HSK_PAPERS_AUDIO_ROOT_ID = '1AkMW158u30P7Kf8HoncKGx-PFXR_pcsH';

function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  const data = { files: {}, generatedAt: new Date().toISOString() };
  try {
    const root = DriveApp.getFolderById(HSK_PAPERS_AUDIO_ROOT_ID);
    ['HSK 4', 'HSK 5'].forEach(function(folderName) {
      const folders = root.getFoldersByName(folderName);
      if (!folders.hasNext()) return;
      const folder = folders.next();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const match = file.getName().match(/^(HSK[45]\d{3,})\.mp3$/i);
        if (!match || file.isTrashed()) continue;
        const code = match[1].toUpperCase();
        data.files[code] = {
          name: file.getName(),
          id: file.getId(),
          url: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.getId()),
          folder: folderName
        };
      }
    });
  } catch (err) {
    data.error = String(err && err.message ? err.message : err);
  }
  const json = JSON.stringify(data);
  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
