#!/usr/bin/env python3
"""
download_menu_images.py

Batch-downloads all `image` URLs under the "menukaart" key in a JSON file.
- No external deps (uses urllib)
- Concurrency with ThreadPoolExecutor
- Retries with backoff
- Derives file extensions from URL or Content-Type
- Safe, de-duplicated filenames: <sku-or-id>-<url-basename>.<ext>
- Skips existing files for resumability
- Writes a CSV manifest with successes/failures

Usage:
  python download_menu_images.py path/to/menu.json -o out_dir
  cat menu.json | python download_menu_images.py -o out_dir
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from urllib.parse import urlsplit, unquote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

CONTENT_TYPE_EXT = {
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/jpg":  ".jpg",
    "image/png":  ".png",
    "image/gif":  ".gif",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

SAFE_CHARS_RE = re.compile(r"[^a-zA-Z0-9._-]+")

def safe_slug(s: str) -> str:
    s = unescape(s or "")
    s = unquote(s)
    s = s.strip().replace(" ", "-")
    s = SAFE_CHARS_RE.sub("-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "file"

def guess_ext_from_url(url_path: str) -> str:
    basename = os.path.basename(url_path)
    _, ext = os.path.splitext(basename)
    return ext if ext else ""

def ext_from_content_type(ct: Optional[str]) -> str:
    if not ct:
        return ""
    ct = ct.split(";")[0].strip().lower()
    return CONTENT_TYPE_EXT.get(ct, "")

def unique_path(base_dir: Path, filename: str) -> Path:
    p = base_dir / filename
    if not p.exists():
        return p
    stem, ext = os.path.splitext(filename)
    i = 2
    while True:
        cand = base_dir / f"{stem}-{i}{ext}"
        if not cand.exists():
            return cand
        i += 1

def fetch(url: str, timeout: int = 20) -> Tuple[bytes, Dict[str, str], int]:
    # HEAD first to get content-type & size (some servers block HEAD; fall back to GET)
    headers = {"User-Agent": "image-batch-downloader/1.0"}
    head_req = Request(url, method="HEAD", headers=headers)
    try:
        with urlopen(head_req, timeout=timeout) as resp:
            meta = {k.lower(): v for k, v in resp.headers.items()}
            status = getattr(resp, "status", 200)
            # not all servers send content on HEAD
            return b"", meta, status
    except Exception:
        # Fallback to GET directly
        pass

    get_req = Request(url, method="GET", headers=headers)
    with urlopen(get_req, timeout=timeout) as resp:
        meta = {k.lower(): v for k, v in resp.headers.items()}
        status = getattr(resp, "status", 200)
        return resp.read(), meta, status

def download_one(item_key: str, rec: Dict[str, Any], out_dir: Path, retries: int = 3, backoff: float = 1.5) -> Dict[str, Any]:
    url = (rec.get("image") or "").strip()
    desc = rec.get("description") or ""
    sku  = rec.get("sku")
    rid  = rec.get("id") if rec.get("id") not in ("", None) else rec.get("sku")

    result = {
        "key": item_key,
        "id": rid,
        "sku": sku,
        "description": desc,
        "url": url,
        "filename": "",
        "status": "failed",
        "http_status": "",
        "error": "",
    }

    if not url:
        result["error"] = "missing image url"
        return result

    url_parts = urlsplit(url)
    url_basename = unquote(os.path.basename(url_parts.path)) or "image"
    url_ext = guess_ext_from_url(url_parts.path).lower()

    id_part = str(sku or rid or item_key)
    name_base = f"{id_part}-{safe_slug(url_basename)}"
    # Remove duplicate extension if basename already contains it later
    if url_ext and not name_base.lower().endswith(url_ext):
        filename = f"{name_base}{url_ext}"
    else:
        filename = name_base

    # Ensure extension will be set (if missing, we’ll patch from content-type)
    if not os.path.splitext(filename)[1]:
        filename = f"{filename}.bin"

    target_path = unique_path(out_dir, filename)

    attempt = 0
    last_http = None
    data = b""
    headers = {}
    while attempt < retries:
        attempt += 1
        try:
            data, headers, status = fetch(url)
            last_http = status
            # If HEAD path returned no data, issue GET now
            if not data:
                req = Request(url, headers={"User-Agent": "image-batch-downloader/1.0"})
                with urlopen(req, timeout=30) as r2:
                    data = r2.read()
                    headers = {k.lower(): v for k, v in r2.headers.items()}
                    last_http = getattr(r2, "status", 200)

            if last_http and int(last_http) >= 400:
                raise HTTPError(url, last_http, f"HTTP {last_http}", headers, None)

            # Determine final extension
            final_ext = url_ext or ext_from_content_type(headers.get("content-type", ""))
            if final_ext:
                if not target_path.suffix.lower() == final_ext.lower():
                    target_path = unique_path(out_dir, f"{target_path.stem}{final_ext}")

            # Write file
            out_dir.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(data)

            result["filename"] = target_path.name
            result["status"] = "ok"
            result["http_status"] = str(last_http or "")
            return result

        except HTTPError as he:
            last_http = getattr(he, "code", None)
            result["error"] = f"HTTPError: {he}"
            if last_http and 400 <= int(last_http) < 500:
                # 4xx: don't retry further (likely permanent)
                break
        except URLError as ue:
            result["error"] = f"URLError: {ue}"
        except Exception as e:
            result["error"] = f"Exception: {e}"

        if attempt < retries:
            time.sleep(backoff ** attempt)

    result["http_status"] = str(last_http or "")
    return result

def load_json(source_path: Optional[str]) -> Dict[str, Any]:
    if source_path:
        with open(source_path, "r", encoding="utf-8") as f:
            return json.load(f)
    # stdin
    data = sys.stdin.read()
    return json.loads(data)

def extract_menukaart(data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    # Accepts direct menukaart dict, or root is the dict itself
    if isinstance(data, dict) and "menukaart" in data and isinstance(data["menukaart"], dict):
        return data["menukaart"]
    # If the pasted snippet was just the menukaart object
    if isinstance(data, dict):
        # sanity check: entries have 'image'
        if all(isinstance(v, dict) and "image" in v for v in data.values()):
            return data  # type: ignore
    raise ValueError("Could not find a 'menukaart' dict with items.")

def main():
    parser = argparse.ArgumentParser(description="Batch download images from menukaart JSON.")
    parser.add_argument("json", nargs="?", help="Path to JSON file. If omitted, reads from STDIN.")
    parser.add_argument("-o", "--out", default="images", help="Output directory (default: images)")
    parser.add_argument("-w", "--workers", type=int, default=10, help="Download concurrency (default: 10)")
    parser.add_argument("--retries", type=int, default=3, help="Retries per file (default: 3)")
    parser.add_argument("--manifest", default="manifest.csv", help="CSV manifest filename (default: manifest.csv)")
    args = parser.parse_args()

    try:
        data = load_json(args.json)
        items = extract_menukaart(data)
    except Exception as e:
        print(f"Error loading JSON: {e}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futures = []
        for k, rec in items.items():
            if not isinstance(rec, dict):
                continue
            futures.append(ex.submit(download_one, str(k), rec, out_dir, args.retries))

        for fut in as_completed(futures):
            res = fut.result()
            results.append(res)
            status = res["status"]
            print(f"[{status:7}] {res['key']:>4}  -> {res.get('filename','')}  ({res.get('url','')})")

    # Write manifest CSV
    manifest_path = Path(args.manifest)
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "key","id","sku","description","url","filename","status","http_status","error"
        ])
        writer.writeheader()
        writer.writerows(results)

    ok = sum(1 for r in results if r["status"] == "ok")
    fail = len(results) - ok
    print(f"\nDone. Success: {ok}, Failed: {fail}")
    print(f"Images: {out_dir.resolve()}")
    print(f"Manifest: {manifest_path.resolve()}")

if __name__ == "__main__":
    main()
