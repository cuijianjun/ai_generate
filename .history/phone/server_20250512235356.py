from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

# ====== 配置区 ======
SECRET_KEY = '888888'  # 只允许知道此秘钥的人登录
TOKENS = set()         # 简单Token池，生产环境建议用数据库或Redis

# ====== 生成Token ======
def generate_token():
    return str(random.randint(100000, 999999)) + str(random.randint(100000, 999999))

# ====== 登录接口 ======
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if data.get('key') == SECRET_KEY:
        token = generate_token()
        TOKENS.add(token)
        return jsonify({'success': True, 'token': token})
    return jsonify({'success': False, 'msg': '秘钥错误'}), 401

# ====== 生成空号接口 ======
@app.route('/api/generate', methods=['POST'])
def generate():
    token = request.headers.get('Authorization')
    if token not in TOKENS:
        return jsonify({'success': False, 'msg': '未授权'}), 401
    count = int(request.json.get('count', 10))
    # 这里只做简单示例，实际可用您的空号生成算法
    numbers = []
    for _ in range(count):
        numbers.append('147' + ''.join([str(random.randint(0,9)) for _ in range(8)]))
    return jsonify({'success': True, 'numbers': numbers})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 