from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp
import requests
import gc
from urllib.parse import quote, urljoin
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app)

executor = ThreadPoolExecutor(max_workers=10)
contador = {'total': 0}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.pornhub.com/',
}

def extrair_link(url):
    opts = {
        'quiet': True,
        'no_warnings': True,
        'format': 'best',
        'http_headers': HEADERS
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        formats = info.get('formats', [])
        direto = info.get('url') or (formats[-1]['url'] if formats else None)
        return direto, info.get('title'), info.get('thumbnail')

@app.route('/')
def index():
    return jsonify({'status': 'online'})

@app.route('/extract')
def extract():
    url = request.args.get('url')
    if not url:
        return jsonify({'erro': 'URL em falta'}), 400
    try:
        future = executor.submit(extrair_link, url)
        direto, titulo, thumbnail = future.result(timeout=30)
        host = request.host_url.rstrip('/')
        proxy = f"{host}/proxy?url={quote(direto, safe='')}"

        contador['total'] += 1
        if contador['total'] % 10 == 0:
            gc.collect()

        return jsonify({'link': proxy, 'titulo': titulo, 'thumbnail': thumbnail})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=15)
        ct = r.headers.get('Content-Type', '')

        if 'm3u8' in ct or url.split('?')[0].endswith('.m3u8'):
            content = r.text
            host = request.host_url.rstrip('/')
            base = url.rsplit('/', 1)[0] + '/'
            lines = []
            for line in content.splitlines():
                if line and not line.startswith('#'):
                    seg = line if line.startswith('http') else urljoin(base, line)
                    lines.append(f"{host}/proxy?url={quote(seg, safe='')}")
                else:
                    lines.append(line)
            return Response('\n'.join(lines),
                content_type='application/vnd.apple.mpegurl',
                headers={'Access-Control-Allow-Origin': '*'})

        return Response(r.iter_content(chunk_size=4096),
            content_type=ct,
            headers={'Access-Control-Allow-Origin': '*'})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, threaded=True)