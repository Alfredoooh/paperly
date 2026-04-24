from flask import Flask
from flask_cors import CORS
from logic_v1 import register_v1
from logic_v2 import register_v2

app = Flask(__name__)
CORS(app)

register_v1(app)
register_v2(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, threaded=True)
