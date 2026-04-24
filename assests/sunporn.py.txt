from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp
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

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.pornhub.com/',
}

REFERERS = {
    'xvideos': 'https://www.xvideos.com/',
    'xhamster': 'https://xhamster.com/',
    'pornhub': 'https://www.pornhub.com/',
    'redtube': 'https://www.redtube.com/',
    'tube8': 'https://www.tube8.com/',
    'youporn': 'https://www.youporn.com/',
    'spankbang': 'https://spankbang.com/',
    'xnxx': 'https://www.xnxx.com/',
    'eporner': 'https://www.eporner.com/',
    'sunporno': 'https://www.sunporno.com/',
    'porntrex': 'https://www.porntrex.com/',
    'tnaflix': 'https://www.tnaflix.com/',
    'pornone': 'https://pornone.com/',
    'pornding': 'https://www.pornding.com/',
}

def get_referer(url):
    url_lower = url.lower()
    for key, referer in REFERERS.items():
        if key in url_lower:
            return referer
    return 'https://www.google.com/'

def get_site_key(url):
    url_lower = url.lower()
    for key in REFERERS:
        if key in url_lower:
            return key
    return 'generic'

def extrair_link(url):
    site_key = get_site_key(url)
    referer = get_referer(url)

    base_headers = {
        **HEADERS,
        'Referer': referer,
    }

    # Opções base — não alterar para sites que já funcionam
    opts = {
        'quiet': True,
        'no_warnings': True,
        'format': 'best',
        'http_headers': base_headers,
        'nocheckcertificate': True,
        'age_limit': 99,
        'retries': 5,
        'fragment_retries': 5,
        'skip_unavailable_fragments': True,
        'socket_timeout': 30,
    }

    # Overrides SOMENTE para sites problemáticos
    if site_key == 'eporner':
        # EPorner usa CDN própria com hash — precisa do extractor nativo
        # e formato específico para evitar URLs com token expirado
        opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        opts['http_headers'] = {
            **base_headers,
            'Origin': 'https://www.eporner.com',
        }

    elif site_key == 'sunporno':
        # SunPorno é um site MyBB/PHP — o player carrega via JS com variáveis
        # O yt-dlp tem extractor nativo; precisa de Origin + cookies mínimos
        opts['format'] = 'best'
        opts['http_headers'] = {
            **base_headers,
            'Origin': 'https://www.sunporno.com',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
        }
        # Forçar extractor SunPorno se yt-dlp falhar com o genérico
        opts['extractor_args'] = {'sunporno': {}}

    elif site_key == 'porntrex':
        # PornTrex usa engine similar ao xVideos (kvs-player)
        # Precisa de Origin e headers de same-site para o embed não bloquear
        opts['format'] = 'best'
        opts['http_headers'] = {
            **base_headers,
            'Origin': 'https://www.porntrex.com',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
        }

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

        if not info:
            raise Exception('Nenhuma informação extraída')

        formats = info.get('formats', [])
        titulo = info.get('title')
        thumbnail = info.get('thumbnail')
        direto = None

        if formats:
            validos = [f for f in formats if f.get('url')]
            mp4s = [f for f in validos if f.get('ext') == 'mp4' or 'mp4' in (f.get('url') or '')]

            if mp4s:
                mp4s.sort(key=lambda f: f.get('height') or 0, reverse=True)
                direto = mp4s[0]['url']
            elif validos:
                validos.sort(key=lambda f: f.get('height') or 0, reverse=True)
                direto = validos[0]['url']
            else:
                direto = formats[-1].get('url')

        if not direto:
            direto = info.get('url')

        if not direto:
            raise Exception('Nenhum link direto encontrado')

        return direto, titulo, thumbnail

@app.route('/')
def index():
    return jsonify({'status': 'online', 'version': '2.1'})

@app.route('/extract')
def extract():
    url = request.args.get('url')
    if not url:
        return jsonify({'erro': 'URL em falta'}), 400

    try:
        future = executor.submit(extrair_link, url)
        direto, titulo, thumbnail = future.result(timeout=60)

        host = request.host_url.rstrip('/')
        referer = get_referer(url)
        proxy = f"{host}/proxy?url={quote(direto, safe='')}&ref={quote(referer, safe='')}"

        contador['total'] += 1
        if contador['total'] % 10 == 0:
            gc.collect()

        return jsonify({
            'link': proxy,
            'titulo': titulo,
            'thumbnail': thumbnail
        })
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# Endpoint de debug — envia o erro real para diagnóstico
@app.route('/debug')
def debug():
    url = request.args.get('url')
    if not url:
        return jsonify({'erro': 'URL em falta'}), 400

    try:
        site_key = get_site_key(url)
        opts = {
            'quiet': False,
            'no_warnings': False,
            'format': 'best',
            'http_headers': {**HEADERS, 'Referer': get_referer(url)},
            'nocheckcertificate': True,
            'age_limit': 99,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formatos = [
            {
                'id': f.get('format_id'),
                'ext': f.get('ext'),
                'height': f.get('height'),
                'has_url': bool(f.get('url')),
                'url_inicio': (f.get('url') or '')[:60],
            }
            for f in info.get('formats', [])
        ]
        return jsonify({
            'site': site_key,
            'titulo': info.get('title'),
            'extractor': info.get('extractor'),
            'total_formatos': len(formatos),
            'formatos': formatos,
        })
    except Exception as e:
        return jsonify({'erro': str(e), 'site': get_site_key(url)}), 500

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    referer = request.args.get('ref', 'https://www.google.com/')

    if not url:
        return jsonify({'erro': 'URL em falta'}), 400

    try:
        headers = {
            **HEADERS,
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
