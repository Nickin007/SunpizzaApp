from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config
import os

db = SQLAlchemy()

def create_app(config_class=Config):
    """应用工厂函数"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 配置上传文件夹
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB 最大上传限制
    
    # 初始化扩展
    db.init_app(app)
    
    # 配置 CORS - 允许所有来源访问
    CORS(app, 
         resources={r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": False,
             "max_age": 3600
         }})
    
    # 注册蓝图
    from app.api import users, shops, work_orders, training, routine_tasks, upload, eleme
    app.register_blueprint(users.bp)
    app.register_blueprint(shops.bp)
    app.register_blueprint(work_orders.bp)
    app.register_blueprint(training.bp)
    app.register_blueprint(routine_tasks.bp)
    app.register_blueprint(upload.bp)
    app.register_blueprint(eleme.bp)
    
    # 配置静态文件访问（用于访问上传的视频、图片等）
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        """提供上传文件的访问"""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    return app

