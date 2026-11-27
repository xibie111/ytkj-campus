"""Start a loopback-only preview of the bundled campus viewer."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import webbrowser

parser=argparse.ArgumentParser()
parser.add_argument('--no-open',action='store_true')
args=parser.parse_args()
handler=partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parent/'dist'))
try:
    server=ThreadingHTTPServer(('127.0.0.1',8734),handler)
except OSError:
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
url=f'http://127.0.0.1:{server.server_port}/'
print(url,flush=True)
if not args.no_open:webbrowser.open(url)
server.serve_forever()

