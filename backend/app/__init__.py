from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    """应用工厂函数"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 初始化扩展
    db.init_app(app)
    CORS(app)
    
    # 注册蓝图
    from app.api import users, shops, work_orders, training, routine_tasks
    app.register_blueprint(users.bp)
    app.register_blueprint(shops.bp)
    app.register_blueprint(work_orders.bp)
    app.register_blueprint(training.bp)
    app.register_blueprint(routine_tasks.bp)
    
    return app

