from app import create_app, db
from flask import send_from_directory
import os

app = create_app()

@app.route('/')
def index():
    return {
        'message': '欢迎使用圣比萨智能门店管理平台API',
        'version': '1.0.0',
        'status': 'running'
    }

@app.route('/health')
def health():
    """健康检查接口"""
    return {'status': 'healthy'}, 200

@app.route('/privacy')
def privacy_policy():
    """隐私政策页面"""
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    return send_from_directory(static_dir, 'privacy.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

