"""将 users.role 从 ENUM 改为 TEXT，支持多角色（逗号分隔）"""
import sys
sys.path.insert(0, '.')
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(text("ALTER TABLE users MODIFY COLUMN role TEXT NOT NULL"))
        conn.commit()
        print("OK: users.role 已从 ENUM 改为 TEXT")
