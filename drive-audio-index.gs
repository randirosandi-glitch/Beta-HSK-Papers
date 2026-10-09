/**
 * HSK Papers — Google Drive Audio Index
 * Scans all subfolders under the configured root folder.
 */
const AUDIO_ROOT_ID = '1AkMW158u30P7Kf8HoncKGx-PFXR_pcsH';

function doGet(e) {
  const callback = String(
    (e && e.parameter && e.parameter.callback) || ''
  );

  const result = {
    files: {},
    generatedAt: new Date().toISOString()
  };

  try {
    const root = DriveApp.getFolderById(AUDIO_ROOT_ID);
    scanFolders(root, result.files);
  } catch (error) {
    result.error = String(error.message || error);
  }

  const json = JSON.stringify(result);

  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(
      callback + '(' + json + ');'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function scanFolders(folder, output) {
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();

    if (file.isTrashed() || !/\.mp3$/i.test(name)) continue;

    const code = name.replace(/\.mp3$/i, '').toUpperCase();

    output[code] = {
      name: name,
      id: file.getId(),
      url: 'https://drive.google.com/uc?export=download&id='
        + encodeURIComponent(file.getId()),
      folder: folder.getName()
    };
  }

  const folders = folder.getFolders();

  while (folders.hasNext()) {
    scanFolders(folders.next(), output);
  }
}
