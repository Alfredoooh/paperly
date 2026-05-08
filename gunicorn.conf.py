# gunicorn.conf.py
import threading

def post_fork(server, worker):
    import shorties_server
    threading.Thread(target=shorties_server.worker_fn, daemon=True).start()
    threading.Thread(target=shorties_server.renewer, daemon=True).start()
    print('[SERVER] Threads iniciadas no worker')