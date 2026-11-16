"""Bounded public metadata/download requests. No OS credentials are sent."""
from __future__ import annotations
import json
from http.client import HTTPException, IncompleteRead
import re
import time
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from .archive import MAX_ARCHIVE_BYTES


def public_url(url: str) -> str:
    if not isinstance(url, str):
        raise ValueError("Expected a public update URL")
    parts = urlsplit(url)
    if parts.username or parts.password or parts.fragment or not parts.hostname:
        raise ValueError("Expected a public URL without credentials or fragment")
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in {"localhost", "127.0.0.1", "::1"}):
        raise ValueError("Public update URLs must use HTTPS (HTTP is allowed only for local tests)")
    return url


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        public_url(newurl)
        if urlsplit(req.full_url).scheme == "https" and urlsplit(newurl).scheme != "https":
            raise ValueError("Update redirect cannot downgrade HTTPS")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def request(url: str, limit: int, etag: str | None = None) -> tuple[int, bytes, str | None]:
    public_url(url)
    headers = {"Cache-Control": "no-cache", "User-Agent": "Egbe-Catalog-Updater/1"}
    if isinstance(etag, str) and len(etag) < 1024 and "\r" not in etag and "\n" not in etag:
        headers["If-None-Match"] = etag
    for attempt in range(2):
        try:
            with build_opener(SafeRedirect()).open(Request(url, headers=headers), timeout=10) as response:
                public_url(response.url)
                data = response.read(limit + 1)
                if len(data) > limit:
                    raise ValueError("Update response exceeds size limit")
                # Bounded read() can silently return a truncated Content-Length body.
                if response.length:
                    raise IncompleteRead(data, response.length)
                return response.status, data, response.headers.get("ETag")
        except HTTPError as error:
            if error.code == 304:
                return 304, b"", error.headers.get("ETag")
            if error.code not in {408, 429, 500, 502, 503, 504} or attempt:
                raise ValueError(f"Update request failed with HTTP {error.code}") from None
        except (OSError, HTTPException):
            if attempt:
                raise ValueError("Update service unavailable; installed skills were kept") from None
        time.sleep(0.3)
    raise ValueError("Update request failed")


LEGACY_VERSION_URL = "https://egbe-os-skills-version.web.app/version.txt"
LEGACY_VERSIONS_URL = "https://egbe-os-skills-version.web.app/versions.txt"
VERSIONS_URL = "https://egbe-os-skills-version.web.app/canonical/versions.txt"


def valid_digest(value) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None


def versions(url: str, cache: dict) -> tuple[dict, str | None]:
    """One read for independent versions; accept the legacy single-hash document."""
    known = cache.get("versions") if cache.get("url") == url else None
    if (not isinstance(known, dict) or not valid_digest(known.get("skills"))
            or set(known) - {"skills", "playbooks"}
            or (known.get("playbooks") is not None and not valid_digest(known["playbooks"]))):
        known = None
    code, body, etag = request(url, 256, cache.get("etag") if known else None)
    if code == 304:
        if known:
            return known, etag or cache.get("etag")
        code, body, etag = request(url, 256)
    if code == 200:
        if re.fullmatch(rb"[0-9a-f]{64}\n?", body):
            return {"skills": body.decode("ascii").strip()}, etag
        match = re.fullmatch(rb"skills=([0-9a-f]{64})\nplaybooks=([0-9a-f]{64}|none)\n?", body)
        if match:
            playbooks = match[2].decode("ascii")
            return {"skills": match[1].decode("ascii"),
                    "playbooks": None if playbooks == "none" else playbooks}, etag
    raise ValueError("Invalid catalog versions; expected skills/playbooks SHA-256 values or a legacy digest")


def version(url: str, cache: dict) -> tuple[str, str | None]:
    values, etag = versions(url, cache)
    return values["skills"], etag


def manifest(origin: str, version_url: str | None = None) -> dict:
    code, data, _ = request(origin.rstrip("/") + "/skills", 2 * 1024 * 1024)
    if code != 200:
        raise ValueError("Catalog manifest is unavailable")
    envelope = json.loads(data)
    result = envelope.get("data") if isinstance(envelope, dict) else None
    if not isinstance(result, dict) or result.get("update_protocol") != 1:
        raise ValueError("Unsupported or missing catalog update protocol")
    descriptor = result.get("installation")
    if descriptor is not None:
        if not isinstance(descriptor, dict) or descriptor.get("install_layout") != "egbe-skill-names-v1":
            raise ValueError("Unsupported catalog installation layout")
        if version_url is None or version_url == descriptor.get("versions_url"):
            result = {**result, **descriptor}
    digest = result.get("archive_sha256")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest) or result.get("catalog_digest") != digest:
        raise ValueError("Invalid catalog digest")
    if not isinstance(result.get("archive_url"), str) or not result["archive_url"]:
        raise ValueError("Missing catalog archive URL")
    archive_url = urljoin(origin.rstrip("/") + "/", result["archive_url"])
    if urlsplit(archive_url).netloc != urlsplit(origin).netloc or urlsplit(archive_url).scheme != urlsplit(origin).scheme:
        raise ValueError("Catalog archive must remain on the configured OS origin")
    result["archive_url"] = public_url(archive_url)
    return result


def download(origin: str, version_url: str, digest: str) -> tuple[bytes, str]:
    # A release may switch between the CDN probe, manifest and archive reads.
    import hashlib
    for attempt in range(2):
        current = manifest(origin, version_url)
        code, data, _ = request(current["archive_url"], MAX_ARCHIVE_BYTES)
        if code == 200 and current["archive_sha256"] == digest == hashlib.sha256(data).hexdigest():
            return data, digest
        if not attempt:
            digest, _ = version(version_url, {})
    raise ValueError("Version/manifest/archive mismatch during release; installed skills were kept")
