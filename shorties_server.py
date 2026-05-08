# shorties_server.py
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import re, urllib.request, threading, time, random, os
from urllib.parse import quote, urljoin
import requests, urllib3
urllib3.disable_warnings()

app = Flask(__name__)
CORS(app)

queue = []
queue_lock = threading.Lock()
seen_keys = set()
MAX_QUEUE = 50

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.pornhub.com/',
    'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; il=1; platform=pc; cookiesAccepted=1; cookieConsent=3; mature_content_age_verified=1',
}

def fetch_viewkeys_page(page):
    print(f'[WORKER] A buscar página {page}...')
    req = urllib.request.Request(f'https://www.pornhub.com/shorties?page={page}', headers=HEADERS)
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    keys = list(dict.fromkeys(re.findall(r'viewkey=([a-zA-Z0-9]{8,})', html)))
    print(f'[WORKER] Encontradas {len(keys)} viewkeys na página {page}')
    return keys

def extrair_rapido(viewkey):
    req = urllib.request.Request(f'https://www.pornhub.com/embed/{viewkey}', headers=HEADERS)
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')

    defs = re.findall(r'\{[^}]*"videoUrl":"(https[^"]+)"[^}]*"quality":"(\d+)"[^}]*\}', html)
    if not defs:
        defs = re.findall(r'"quality":"(\d+)"[^}]*"videoUrl":"(https[^"]+)"', html)
        defs = [(b.replace('\\/', '/'), a) for a, b in defs]
    else:
        defs = [(u.replace('\\/', '/'), q) for u, q in defs]

    direct = None
    if defs:
        defs.sort(key=lambda x: int(x[1]) if x[1].isdigit() else 0, reverse=True)
        direct = defs[0][0]
    else:
        for pattern in [
            r'"videoUrl":"(https[^"]+\.m3u8[^"]*)"',
            r'"videoUrl":"(https[^"]+\.mp4[^"]*)"',
        ]:
            m = re.search(pattern, html)
            if m:
                direct = m.group(1).replace('\\/', '/')
                break

    if not direct:
        return None, None, None, None, None, 0

    exp = 0
    em = re.search(r'validto[=%]+(1\d{9})', direct)
    if em: exp = int(em.group(1))

    title = viewkey
    tm = re.search(r'"video_title":"([^"]+)"', html)
    if tm: title = tm.group(1).replace('\\u0026', '&')

    thumb = ''
    thm = re.search(r'"image_url":"([^"]+)"', html)
    if thm: thumb = thm.group(1).replace('\\/', '/')

    likes = '0'
    lm = re.search(r'"likes_count":(\d+)', html)
    if lm: likes = lm.group(1)

    views = '0'
    vm = re.search(r'"view_count":(\d+)', html)
    if vm: views = vm.group(1)

    return direct, title, thumb, likes, views, exp

def worker_fn():
    page = random.randint(1, 20)
    while True:
        try:
            with queue_lock:
                qsize = len(queue)

            if qsize < MAX_QUEUE:
                keys = fetch_viewkeys_page(page)
                for vk in keys:
                    if vk in seen_keys:
                        continue
                    try:
                        direct, title, thumb, likes, views, exp = extrair_rapido(vk)
                        if direct:
                            now = int(time.time())
                            if exp == 0 or (exp - now) > 600:
                                with queue_lock:
                                    if len(queue) < MAX_QUEUE:
                                        queue.append({
                                            'viewkey': vk,
                                            'title':   title,
                                            'thumb':   thumb,
                                            'likes':   likes,
                                            'views':   views,
                                            '_direct': direct,
                                            '_exp':    exp,
                                        })
                                seen_keys.add(vk)
                                print(f'[+] {vk} q:{len(queue)}')
                        else:
                            print(f'[SKIP] {vk} sem direct link')
                    except Exception as e:
                        print(f'[ERR] {vk}: {e}')
                    time.sleep(0.3)
                page = random.randint(1, 20)
            else:
                time.sleep(5)

        except Exception as e:
            print(f'[WORKER] {e}')
            time.sleep(3)

def renewer():
    while True:
        time.sleep(600)
        now = int(time.time())
        print('[RENEW] A renovar links...')
        with queue_lock:
            queue[:] = [v for v in queue if v['_exp'] == 0 or (v['_exp'] - now) > 300]
        seen_keys.clear()
        print(f'[RENEW] Fila após limpeza: {len(queue)}')

@app.route('/videos')
def get_videos():
    host = request.host_url.rstrip('/')
    with queue_lock:
        out = []
        for v in queue:
            proxy = f"{host}/proxy?url={quote(v['_direct'], safe='')}&ref={quote('https://www.pornhub.com/', safe='')}"
            out.append({'viewkey': v['viewkey'], 'title': v['title'], 'thumb': v['thumb'],
                        'likes': v['likes'], 'views': v['views'], 'link': proxy})
    return jsonify(out)

@app.route('/status')
def status():
    with queue_lock:
        now = int(time.time())
        return jsonify({'total': len(queue), 'expira_min': [
            round((v['_exp'] - now) / 60) for v in queue if v['_exp'] > 0][:5]})

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    referer = request.args.get('ref', 'https://www.pornhub.com/')
    if not url: return jsonify({'erro': 'url em falta'}), 400
    try:
        h = {**HEADERS, 'Referer': referer, 'Range': request.headers.get('Range', 'bytes=0-')}
        r = requests.get(url, headers=h, stream=True, timeout=20, verify=False)
        ct = r.headers.get('Content-Type', 'video/mp4')
        if 'm3u8' in ct or url.split('?')[0].endswith('.m3u8'):
            host = request.host_url.rstrip('/')
            base = url.rsplit('/', 1)[0] + '/'
            lines = []
            for line in r.text.splitlines():
                if line and not line.startswith('#'):
                    seg = line if line.startswith('http') else urljoin(base, line)
                    lines.append(f"{host}/proxy?url={quote(seg, safe='')}&ref={quote(referer, safe='')}")
                else:
                    lines.append(line)
            return Response('\n'.join(lines), content_type='application/vnd.apple.mpegurl',
                            headers={'Access-Control-Allow-Origin': '*'})
        rh = {'Access-Control-Allow-Origin': '*', 'Content-Type': ct}
        for h2 in ('Content-Length', 'Content-Range', 'Accept-Ranges'):
            if h2 in r.headers: rh[h2] = r.headers[h2]
        return Response(r.iter_content(8192), status=r.status_code, headers=rh)
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

if __name__ == '__main__':
    threading.Thread(target=worker_fn, daemon=True).start()
    threading.Thread(target=renewer, daemon=True).start()
    port = int(os.environ.get('PORT', 5000))
    print(f'[SERVER] http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, threaded=True)