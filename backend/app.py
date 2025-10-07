from app import create_app, db

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

