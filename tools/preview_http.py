"""Serve the released campus atlas on the server's loopback preview port."""

import argparse
from dataclasses import dataclass, field
from datetime import timezone
from email.utils import parsedate_to_datetime
from functools import lru_cache, partial
import gzip
import hashlib
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import os
from pathlib import Path
from urllib.parse import urlsplit


PREFIX = '/penglai-campus/'
COMPRESSIBLE = {'.css', '.html', '.js', '.json', '.svg', '.ttf', '.txt'}
MIN_COMPRESS_SIZE = 1024


@lru_cache(maxsize=128)
def content_digest(path, mtime_ns, size, inode):
    """Cache the byte identity of an immutable release file."""
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


@dataclass(frozen=True)
class Asset:
    # Paths in different release directories can contain exactly the same file.
    digest: str
    path: Path = field(compare=False)


@lru_cache(maxsize=128)
def gzip_asset(asset):
    return gzip.compress(asset.path.read_bytes(), compresslevel=6, mtime=0)


def encoding_preferences(header):
    preferences = {}
    for entry in header.lower().split(','):
        coding, *parameters = entry.split(';')
        quality = 1.0
        for parameter in parameters:
            key, _, value = parameter.strip().partition('=')
            if key.strip() == 'q':
                try:
                    quality = float(value)
                except ValueError:
                    quality = 0
                if not 0 <= quality <= 1:
                    quality = 0
        if coding.strip():
            preferences[coding.strip()] = quality
    return preferences


class CampusPreview(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    timeout = 20
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.ttf': 'font/ttf', '.webp': 'image/webp'}

    def _asset(self):
        try:
            request_path = urlsplit(self.path).path
        except ValueError:
            return None
        if request_path == PREFIX:
            request_path += 'index.html'
        if not request_path.startswith(PREFIX) or request_path.endswith('/'):
            return None

        directory = Path(self.directory)
        # Resolve current once so even a deployment during the request uses
        # a consistent release. Entries in it may not point outside it.
        release = directory.resolve()
        relative = Path(self.translate_path(request_path[len(PREFIX):])).relative_to(directory)
        asset = (release / relative).resolve()
        return asset if asset.is_relative_to(release) and asset.is_file() else None

    def _not_modified(self, etag, modified):
        match = self.headers.get('If-None-Match')
        if match is not None:
            return any(tag.strip().removeprefix('W/') in {'*', etag} for tag in match.split(','))

        since = self.headers.get('If-Modified-Since')
        if not since:
            return False
        try:
            date = parsedate_to_datetime(since)
        except (TypeError, ValueError, OverflowError):
            return False
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        return int(modified) <= date.timestamp()

    def _asset_headers(self, etag, modified, negotiable):
        self.send_header('ETag', etag)
        self.send_header('Last-Modified', self.date_time_string(modified))
        self.send_header('Cache-Control', 'no-cache')
        if negotiable:
            self.send_header('Vary', 'Accept-Encoding')

    def send_head(self):
        asset = self._asset()
        if asset is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None
        try:
            source = asset.open('rb')
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        stat = os.fstat(source.fileno())
        compressible = (
            asset.suffix.lower() in COMPRESSIBLE or asset.name == 'huangbohai-buildings.glb'
        )
        negotiable = compressible and stat.st_size >= MIN_COMPRESS_SIZE
        preferences = encoding_preferences(','.join(self.headers.get_all('Accept-Encoding', ())))
        gzip_quality = preferences.get('gzip', preferences.get('*', 0))
        identity_quality = preferences.get('identity', 0 if preferences.get('*') == 0 else 1)
        use_gzip = negotiable and gzip_quality > 0 and gzip_quality >= preferences.get('identity', 0)
        if not use_gzip and not identity_quality:
            source.close()
            self.send_error(HTTPStatus.NOT_ACCEPTABLE)
            return None

        try:
            digest = content_digest(asset, stat.st_mtime_ns, stat.st_size, stat.st_ino)
        except OSError:
            source.close()
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        coding = 'gzip' if use_gzip else 'identity'
        etag = f'"{digest}-{coding}"'
        if self._not_modified(etag, stat.st_mtime):
            source.close()
            self.send_response(HTTPStatus.NOT_MODIFIED)
            self._asset_headers(etag, stat.st_mtime, negotiable)
            self.end_headers()
            return None

        length = stat.st_size
        if use_gzip:
            source.close()
            try:
                compressed = gzip_asset(Asset(digest, asset))
            except OSError:
                self.send_error(HTTPStatus.NOT_FOUND)
                return None
            source = BytesIO(compressed)
            length = len(compressed)

        self.send_response(HTTPStatus.OK)
        self._asset_headers(etag, stat.st_mtime, negotiable)
        self.send_header('Content-Type', self.guess_type(str(asset)))
        self.send_header('Content-Length', str(length))
        if use_gzip:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        return source


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path('/srv/ytkj-campus/current'))
    parser.add_argument('--port', type=int, default=8088)
    args = parser.parse_args()
    handler = partial(CampusPreview, directory=str(args.directory.absolute()))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        server.serve_forever()
