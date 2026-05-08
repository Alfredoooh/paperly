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
    req = urllib.request.Request(f'https://www.pornhub.com/shorties?page={page}', headers=HEADERS)
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    return list(dict.fromkeys(re.findall(r'viewkey=([a-zA-Z0-9]{8,})', html)))

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

def worker():
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
                    except:
                        pass
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

@app.route('/')
def player():
    html = r'''<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Shorties</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100vw;height:100vh;background:#000;overflow:hidden;font-family:sans-serif}
#feed{position:fixed;inset:0}
.slide{position:absolute;inset:0;transition:transform .35s cubic-bezier(.77,0,.175,1)}
.slide video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;background:#000}
.grad{position:absolute;bottom:0;left:0;right:0;height:45%;background:linear-gradient(to top,rgba(0,0,0,.9),transparent);pointer-events:none;z-index:2}
.info{position:absolute;bottom:28px;left:14px;right:80px;z-index:3;pointer-events:none}
.info-title{color:#fff;font-size:14px;font-weight:700;text-shadow:0 1px 4px #000;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:6px}
.info-meta{color:rgba(255,255,255,.7);font-size:12px}
.side{position:absolute;right:10px;bottom:90px;display:flex;flex-direction:column;gap:20px;align-items:center;z-index:3}
.swrap{display:flex;flex-direction:column;align-items:center;gap:4px}
.sbtn{width:50px;height:50px;background:rgba(0,0,0,.5);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,.2)}
.sbtn svg{width:24px;height:24px;fill:#fff}
.sbtn.liked svg{fill:#ff2d55}
.slabel{color:#fff;font-size:11px;text-shadow:0 1px 3px #000}
.progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.2);z-index:4}
.pfill{height:100%;background:#fff;width:0%;transition:width .1s linear}
#loader{position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center;z-index:99;flex-direction:column;gap:14px}
#loader p{color:#888;font-size:13px;text-align:center;padding:0 32px}
.spin{width:36px;height:36px;border:2px solid #222;border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div id="loader"><div class="spin"></div><p id="msg">A carregar...</p></div>
<div id="feed"></div>
<script>
let videos=[],current=0,busy=false,slides=[],startY=0,isDrag=false;

async function init(){
  try{
    const r=await fetch('/videos');
    if(!r.ok) throw new Error('HTTP '+r.status);
    videos=await r.json();
    if(!videos.length){ document.getElementById('msg').textContent='A processar... aguarda'; setTimeout(init,2000); return; }
    build();
    document.getElementById('loader').style.display='none';
  }catch(e){ document.getElementById('msg').textContent='Erro: '+e.message; setTimeout(init,3000); }
}

function build(){
  const feed=document.getElementById('feed');
  feed.innerHTML=''; slides=[];
  videos.forEach((v,i)=>{ const s=makeSlide(v,i); feed.appendChild(s); slides.push(s); });
  layout(); playSlide(0); bindTouch();
}

function makeSlide(v,i){
  const s=document.createElement('div'); s.className='slide';
  const vid=document.createElement('video');
  vid.src=v.link; vid.loop=true; vid.playsInline=true; vid.setAttribute('playsinline',''); vid.preload='auto';
  const grad=document.createElement('div'); grad.className='grad';
  const info=document.createElement('div'); info.className='info';
  info.innerHTML='<div class="info-title">'+esc(v.title)+'</div><div class="info-meta">\u2764\ufe0f '+fmtNum(v.likes)+' &nbsp; \ud83d\udc41 '+fmtNum(v.views)+'</div>';
  const prog=document.createElement('div'); prog.className='progress';
  const fill=document.createElement('div'); fill.className='pfill'; prog.appendChild(fill);
  vid.addEventListener('timeupdate',()=>{ if(vid.duration) fill.style.width=(vid.currentTime/vid.duration*100)+'%'; });
  const side=document.createElement('div'); side.className='side';
  const lb=mkBtn('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',fmtNum(v.likes));
  lb.btn.onclick=()=>lb.btn.classList.toggle('liked');
  const mb=mkBtn('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z','Som');
  mb.btn.onclick=()=>{
    vid.muted=!vid.muted;
    mb.btn.querySelector('svg path').setAttribute('d',vid.muted
      ?'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
      :'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z');
  };
  const sb=mkBtn('M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z','Partilhar');
  sb.btn.onclick=()=>{
    const url='https://www.pornhub.com/view_video.php?viewkey='+v.viewkey;
    if(navigator.share) navigator.share({title:v.title,url});
    else navigator.clipboard.writeText(url).then(()=>alert('Copiado!'));
  };
  side.appendChild(lb.wrap); side.appendChild(mb.wrap); side.appendChild(sb.wrap);
  s.appendChild(vid); s.appendChild(grad); s.appendChild(info); s.appendChild(side); s.appendChild(prog);
  s._vid=vid; return s;
}

function mkBtn(path,label){
  const wrap=document.createElement('div'); wrap.className='swrap';
  const btn=document.createElement('div'); btn.className='sbtn';
  btn.innerHTML='<svg viewBox="0 0 24 24"><path d="'+path+'"/></svg>';
  const lbl=document.createElement('div'); lbl.className='slabel'; lbl.textContent=label;
  wrap.appendChild(btn); wrap.appendChild(lbl); return {wrap,btn};
}

function fmtNum(n){ const x=parseInt(n)||0; if(x>=1e6) return (x/1e6).toFixed(1)+'M'; if(x>=1e3) return (x/1e3).toFixed(1)+'K'; return x||''; }
function layout(){ slides.forEach((s,i)=>s.style.transform='translateY('+(i-current)*100+'%)'); }
function playSlide(idx){ slides.forEach((s,i)=>{ i===idx?s._vid.play().catch(()=>{}):s._vid.pause(); }); }

function goTo(idx){
  if(idx<0||idx>=slides.length||busy) return;
  busy=true; slides[current]._vid.pause();
  current=idx; layout(); playSlide(current);
  setTimeout(()=>busy=false,380);
  if(current>=slides.length-5) fetchMore();
}

async function fetchMore(){
  try{
    const r=await fetch('/videos');
    const data=await r.json();
    if(data.length>videos.length){
      const feed=document.getElementById('feed');
      data.slice(videos.length).forEach((v,i)=>{
        const s=makeSlide(v,videos.length+i);
        feed.appendChild(s); slides.push(s);
      });
      videos=data; layout();
    }
  }catch(e){}
}

function bindTouch(){
  const feed=document.getElementById('feed');
  feed.addEventListener('touchstart',e=>{ startY=e.touches[0].clientY; isDrag=false; },{passive:true});
  feed.addEventListener('touchmove',()=>isDrag=true,{passive:true});
  feed.addEventListener('touchend',e=>{
    const dy=startY-e.changedTouches[0].clientY;
    if(Math.abs(dy)>60) goTo(dy>0?current+1:current-1);
    else if(!isDrag){ const v=slides[current]._vid; v.paused?v.play():v.pause(); }
  },{passive:true});
  window.addEventListener('keydown',e=>{ if(e.key==='ArrowDown')goTo(current+1); if(e.key==='ArrowUp')goTo(current-1); });
}

function esc(s){ return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
init();
</script>
</body>
</html>'''
    return Response(html, content_type='text/html')

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
            round((v['_exp']-now)/60) for v in queue if v['_exp'] > 0][:5]})

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
    threading.Thread(target=worker, daemon=True).start()
    threading.Thread(target=renewer, daemon=True).start()
    port = int(os.environ.get('PORT', 5000))
    print(f'[SERVER] http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, threaded=True)