#!/usr/bin/env python3
"""One-time, idempotent transfer of the public HSK 4/5 Drive MP3 catalog to Releases."""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

INDEX_URL = "https://script.google.com/macros/s/AKfycbwzuV2f58gr1J6-oL2lKsOmYmCQWov8MGTJGhPVRcxBECvpjVaW39dGdBtng0t3f3goWQ/exec"
CALLBACK = "githubAudioMigration"
MAX_FILE_BYTES = 100 * 1024 * 1024
RELEASE_TAGS = {4: "beta-audio-hsk4", 5: "beta-audio-hsk5"}
EXPECTED = {
    4: [
        "H41001", "H41002", "H41003", "H41004", "H41005", "H41006", "H41007", "H41008", "H41009",
        "H41110", "H41111",
        "H41218", "H41219", "H41220", "H41221",
        "H41327", "H41328", "H41329", "H41330", "H41331", "H41332", "H41333",
        "H41553B", "H41553C", "H41553D",
    ],
    5: [
        "H51001", "H51002", "H51003", "H51004", "H51005", "H51006", "H51007", "H51008", "H51009",
        "H51110", "H51111",
        "H51218", "H51219", "H51220", "H51221",
        "H51327", "H51328", "H51329",
        "H51331", "H51332", "H51333",
        "H51553B", "H51553C", "H51553D",
    ],
}
CANARY = {"H41001", "H51001"}


def fail(message):
    raise RuntimeError(message)


def get_catalog():
    url = INDEX_URL + "?callback=" + CALLBACK
    request = urllib.request.Request(url, headers={"User-Agent": "Beta-HSK-audio-migration/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read(2 * 1024 * 1024).decode("utf-8")
    match = re.fullmatch(r"\s*" + CALLBACK + r"\((.*)\);\s*", raw, re.S)
    if not match:
        fail("Drive index did not return the expected JSONP response.")
    catalog = json.loads(match.group(1))
    if catalog.get("error"):
        fail("Drive index reported an error: " + str(catalog["error"]))
    if not isinstance(catalog.get("files"), dict):
        fail("Drive index did not contain a files object.")
    return catalog["files"]


def validate_inventory(files):
    expected_all = set()
    selected = {}
    for level, codes in EXPECTED.items():
        expected_all.update(codes)
        level_folder = "HSK " + str(level)
        found = {
            code for code, item in files.items()
            if isinstance(item, dict) and item.get("folder") == level_folder
            and re.match(r"^H" + str(level) + r"\d{4}[A-Z]?$", code)
        }
        if found != set(codes):
            missing = sorted(set(codes) - found)
            unexpected = sorted(found - set(codes))
            fail(
                level_folder + " inventory changed; missing=" + str(missing)
                + ", unexpected=" + str(unexpected) + ". No assets were uploaded."
            )
        for code in codes:
            item = files.get(code)
            if not isinstance(item, dict):
                fail("Missing Drive index entry for " + code + ".")
            if item.get("name") != code + ".mp3":
                fail("Unexpected Drive filename for " + code + ": " + str(item.get("name")))
            sharing = str(item.get("sharingAccess", "")).upper()
            if sharing not in ("ANYONE_WITH_LINK", "ANYONE"):
                fail(code + " is not publicly readable from Drive (sharingAccess=" + sharing + ").")
            download_url = item.get("url")
            if not isinstance(download_url, str) or not download_url.startswith("https://"):
                fail("Drive index has no HTTPS download URL for " + code + ".")
            selected[code] = item
    if len(expected_all) != 49:
        fail("Internal inventory error: expected 49 unique MP3 files.")
    return selected


def download_mp3(code, item, directory):
    request = urllib.request.Request(
        item["url"],
        headers={"User-Agent": "Beta-HSK-audio-migration/1.0", "Accept": "audio/mpeg,*/*"},
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            data = response.read(MAX_FILE_BYTES + 1)
    except Exception as error:
        fail("Drive download failed for " + code + ": " + str(error))
    if len(data) > MAX_FILE_BYTES:
        fail(code + " exceeded the expected 100 MiB safety limit.")
    prefix = data[:8192]
    has_id3 = prefix.startswith(b"ID3")
    has_mpeg_frame = any(
        prefix[index] == 0xFF and (prefix[index + 1] & 0xE0) == 0xE0
        for index in range(len(prefix) - 1)
    )
    if len(data) < 4096 or not (has_id3 or has_mpeg_frame):
        content_type = response.headers.get("Content-Type", "unknown")
        fail(
            code + " did not download as a valid MP3 (Content-Type="
            + content_type + ", first-bytes=" + data[:16].hex() + ")."
        )
    destination = Path(directory) / (code + ".mp3")
    destination.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    print("Downloaded " + code + ".mp3 (" + str(len(data)) + " bytes, sha256 " + digest + ").")
    return destination, digest, len(data)


def gh(*args, check=True):
    env = dict(os.environ)
    if not env.get("GH_TOKEN"):
        fail("GH_TOKEN is missing; refusing to write Releases.")
    result = subprocess.run(
        ["gh", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )
    if check and result.returncode != 0:
        fail("GitHub CLI failed: gh " + " ".join(args) + "\n" + result.stderr.strip())
    return result


def ensure_release(level, repository):
    tag = RELEASE_TAGS[level]
    viewed = gh(
        "release", "view", tag, "--repo", repository,
        "--json", "assets", "--jq", ".assets[] | [.name, (.size|tostring)] | @tsv",
        check=False,
    )
    if viewed.returncode == 0:
        return tag
    title = "Beta Listening Audio — HSK " + str(level)
    notes = "Public MP3 audio assets for the Beta HSK Papers Listening player. Asset filenames match package codes."
    gh("release", "create", tag, "--repo", repository, "--title", title, "--notes", notes, "--target", "main")
    return tag


def existing_assets(tag, repository):
    output = gh(
        "release", "view", tag, "--repo", repository,
        "--json", "assets", "--jq", ".assets[] | [.name, (.size|tostring)] | @tsv",
    ).stdout
    assets = {}
    for line in output.splitlines():
        fields = line.split("\t")
        if len(fields) == 2:
            assets[fields[0]] = int(fields[1])
    return assets


def verify_existing(tag, code, expected_size, expected_digest, repository, directory):
    existing_directory = Path(directory) / ("existing-" + code)
    existing_directory.mkdir()
    gh(
        "release", "download", tag, "--repo", repository,
        "--pattern", code + ".mp3", "--dir", str(existing_directory), "--clobber",
    )
    downloaded = existing_directory / (code + ".mp3")
    if not downloaded.exists():
        fail("Release download did not produce the existing asset " + code + ".mp3.")
    actual = downloaded.read_bytes()
    actual_digest = hashlib.sha256(actual).hexdigest()
    if len(actual) == expected_size and actual_digest == expected_digest:
        print("Verified existing Release asset " + code + ".mp3.")
        return True
    print("Replacing mismatched existing Release asset " + code + ".mp3.")
    return False


def main():
    if len(sys.argv) != 2:
        fail("Usage: migrate_drive_audio.py .github/audio-migration-mode")
    mode_path = Path(sys.argv[1])
    mode = mode_path.read_text(encoding="utf-8").strip().lower()
    if mode not in ("canary", "full"):
        fail("Migration mode must be exactly 'canary' or 'full'.")
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        fail("Unexpected or missing GITHUB_REPOSITORY.")
    files = validate_inventory(get_catalog())
    codes = sorted(CANARY) if mode == "canary" else EXPECTED[4] + EXPECTED[5]
    print("Mode: " + mode + "; selected " + str(len(codes)) + " of 49 indexed MP3 files.")

    with tempfile.TemporaryDirectory(prefix="beta-audio-") as temporary:
        downloaded = {}
        for code in codes:
            item = files[code]
            path, digest, size = download_mp3(code, item, temporary)
            level = int(code[1])
            downloaded[code] = (path, digest, size, level)
        tags = {level: ensure_release(level, repository) for level in sorted({item[3] for item in downloaded.values()})}
        for code in codes:
            path, digest, size, level = downloaded[code]
            tag = tags[level]
            assets = existing_assets(tag, repository)
            if code + ".mp3" in assets:
                verified = verify_existing(
                    tag, code, size, digest, repository, temporary
                )
                if verified:
                    continue
                gh("release", "upload", tag, str(path), "--repo", repository, "--clobber")
            else:
                gh("release", "upload", tag, str(path), "--repo", repository)
            print("Uploaded " + code + ".mp3 to " + tag + ".")
        for level, tag in tags.items():
            expected_names = {code + ".mp3" for code in codes if int(code[1]) == level}
            actual_names = set(existing_assets(tag, repository))
            if not expected_names.issubset(actual_names):
                fail("Release verification failed for " + tag + ".")
            print("Verified " + str(len(expected_names)) + " requested asset(s) in " + tag + ".")
    print("Migration stage " + mode + " completed successfully.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
