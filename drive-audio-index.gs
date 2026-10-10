/**
 * HSK Papers — Google Drive Audio Index + Admin Upload
 *
 * GET:
 *   Returns an index of MP3 files; JSONP is supported for GitHub Pages clients.
 * POST:
 *   Requires Script Property ADMIN_UPLOAD_KEY and supports:
 *   {action:"upload",key,level,code,fileName,mimeType,base64}
 *   {action:"attach",key,level,code,fileId}
 *
 * Only the individual audio file is shared with anyone holding its link.
 * The parent Drive folder is not made public.
 */
const AUDIO_ROOT_ID = '1AkMW158u30P7Kf8HoncKGx-PFXR_pcsH';
const ADMIN_KEY_PROPERTY = 'ADMIN_UPLOAD_KEY';
const MAX_BASE64_CHARS = 17 * 1024 * 1024;

function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  const result = { files: {}, generatedAt: new Date().toISOString() };
  try {
    const root = DriveApp.getFolderById(AUDIO_ROOT_ID);
    scanFolders(root, result.files);
  } catch (error) {
    result.error = String(error.message || error);
  }
  const json = JSON.stringify(result);
  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_KEY_PROPERTY);
    if (!expected || expected.length < 24) {
      return jsonOutput({ ok: false, error: 'ADMIN_UPLOAD_KEY belum dikonfigurasi atau terlalu pendek.' });
    }
    const raw = e && e.postData && e.postData.contents;
    if (!raw) return jsonOutput({ ok: false, error: 'Payload kosong.' });
    if (raw.length > MAX_BASE64_CHARS + 20000) {
      return jsonOutput({ ok: false, error: 'Payload terlalu besar. Batas MP3 sekitar 12 MB.' });
    }
    const payload = JSON.parse(raw);
    if (!payload || payload.key !== expected) {
      return jsonOutput({ ok: false, error: 'Kunci admin tidak cocok.' });
    }

    const level = Number(payload.level);
    const code = String(payload.code || '').toUpperCase();
    const m = code.match(/^H([1-6])\d{4}$/);
    if (!m || Number(m[1]) !== level || level < 1 || level > 6) {
      return jsonOutput({ ok: false, error: 'Kode paket tidak cocok dengan level HSK.' });
    }

    const root = DriveApp.getFolderById(AUDIO_ROOT_ID);
    const folder = getOrCreateFolder(root, 'HSK ' + level);
    const canonicalName = code + '.mp3';
    let file;

    if (payload.action === 'upload') {
      const encoded = String(payload.base64 || '');
      if (!encoded || encoded.length > MAX_BASE64_CHARS) {
        return jsonOutput({ ok: false, error: 'Data MP3 kosong atau melebihi batas ukuran.' });
      }
      if (!/\.mp3$/i.test(String(payload.fileName || ''))) {
        return jsonOutput({ ok: false, error: 'File harus berekstensi .mp3.' });
      }
      const bytes = Utilities.base64Decode(encoded);
      if (!bytes || !bytes.length) return jsonOutput({ ok: false, error: 'Data MP3 tidak terbaca.' });
      const blob = Utilities.newBlob(bytes, 'audio/mpeg', canonicalName);
      file = folder.createFile(blob);
    } else if (payload.action === 'attach') {
      const fileId = String(payload.fileId || '');
      if (!/^[A-Za-z0-9_-]{15,}$/.test(fileId)) {
        return jsonOutput({ ok: false, error: 'ID file Google Drive tidak valid.' });
      }
      file = DriveApp.getFileById(fileId);
      if (file.isTrashed()) return jsonOutput({ ok: false, error: 'File sumber berada di Sampah.' });
      if (!/\.mp3$/i.test(file.getName()) && file.getMimeType() !== 'audio/mpeg') {
        return jsonOutput({ ok: false, error: 'File sumber bukan MP3.' });
      }
      file.setName(canonicalName);
      file.moveTo(folder);
    } else {
      return jsonOutput({ ok: false, error: 'Aksi tidak dikenal.' });
    }

    // Replace any previous canonical audio file with the newly uploaded/attached one.
    const duplicates = folder.getFilesByName(canonicalName);
    while (duplicates.hasNext()) {
      const candidate = duplicates.next();
      if (candidate.getId() !== file.getId()) candidate.setTrashed(true);
    }
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return jsonOutput({
      ok: true, code: code, name: file.getName(), id: file.getId(),
      url: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.getId()),
      folder: folder.getName(), sharingAccess: String(file.getSharingAccess())
    });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error.message || error) });
  }
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function scanFolders(folder, output) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (file.isTrashed() || !/\.mp3$/i.test(name)) continue;
    const code = name.replace(/\.mp3$/i, '').toUpperCase();
    let sharingAccess = '';
    try { sharingAccess = String(file.getSharingAccess()); } catch (ignored) {}
    output[code] = {
      name: name,
      id: file.getId(),
      url: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.getId()),
      folder: folder.getName(),
      sharingAccess: sharingAccess,
      mimeType: file.getMimeType()
    };
  }
  const folders = folder.getFolders();
  while (folders.hasNext()) scanFolders(folders.next(), output);
}
