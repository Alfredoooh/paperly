from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from logic_v1 import extrair_link as extrair_v1, HEADERS as HEADERS_V1
from logic_v2 import extrair_link as extrair_v2, get_referer, HEADERS as HEADERS_V2
import requests
import gc
from urllib.parse import quote, urljoin
from concurrent.futures import ThreadPoolExecutor
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)

executor = ThreadPoolExecutor(max_workers=10)
contador = {'total': 0}


def extrair_com_fallback(url):
    """Tenta v1 primeiro. Se falhar, tenta v2. Devolve (direto, titulo, thumbnail, versao)."""
    try:
        direto, titulo, thumbnail = extrair_v1(url)
        if direto:
            return direto, titulo, thumbnail, 'v1'
    except Exception:
        pass

    direto, titulo, thumbnail = extrair_v2(url)
    return direto, titulo, thumbnail, 'v2'


@app.route('/')
def index():
    return jsonify({'status': 'online'})


@app.route('/extract')
def extract():
    url = request.args.get('url')
    if not url:
        return jsonify({'erro': 'URL em falta'}), 400

    try:
        future = executor.submit(extrair_com_fallback, url)
        direto, titulo, thumbnail, versao = future.result(timeout=60)

        host = request.host_url.rstrip('/')
        referer = get_referer(url)
        proxy = f"{host}/proxy?url={quote(direto, safe='')}&ref={quote(referer, safe='')}"

        contador['total'] += 1
        if contador['total'] % 10 == 0:
            gc.collect()

        return jsonify({
            'link': proxy,
            'titulo': titulo,
            'thumbnail': thumbnail,
            'extractor': versao,
        })
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    referer = request.args.get('ref', 'https://www.google.com/')

    if not url:
        return jsonify({'erro': 'URL em falta'}), 400

    try:
        headers = {
            **HEADERS_V2,
            'Referer': referer,
            'Range': request.headers.get('Range', 'bytes=0-'),
        }

        r = requests.get(url, headers=headers, stream=True, timeout=20, verify=False)
        ct = r.headers.get('Content-Type', 'video/mp4')
        status = r.status_code

        if 'm3u8' in ct or url.split('?')[0].endswith('.m3u8'):
            content = r.text
            host = request.host_url.rstrip('/')
            base = url.rsplit('/', 1)[0] + '/'
            lines = []
            for line in content.splitlines():
                if line and not line.startswith('#'):
                    seg = line if line.startswith('http') else urljoin(base, line)
                    lines.append(f"{host}/proxy?url={quote(seg, safe='')}&ref={quote(referer, safe='')}")
                else:
                    lines.append(line)
            return Response(
                '\n'.join(lines),
                status=200,
                content_type='application/vnd.apple.mpegurl',
                headers={'Access-Control-Allow-Origin': '*'}
            )

        response_headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': ct,
        }
        if 'Content-Length' in r.headers:
            response_headers['Content-Length'] = r.headers['Content-Length']
        if 'Content-Range' in r.headers:
            response_headers['Content-Range'] = r.headers['Content-Range']
        if 'Accept-Ranges' in r.headers:
            response_headers['Accept-Ranges'] = r.headers['Accept-Ranges']

        return Response(
            r.iter_content(chunk_size=8192),
            status=status,
            headers=response_headers,
        )

    except Exception as e:
        return jsonify({'erro': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, threaded=True)
