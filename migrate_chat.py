"""创建 AI Chat + 记忆系统相关的数据库表"""
import sys
import os

# Support running from project root or from backend/
if os.path.exists(os.path.join(os.path.dirname(__file__), 'backend')):
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
else:
    sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import ChatConversation, ChatMessage, MemoryEntry
from sqlalchemy import text

app = create_app()
with app.app_context():
    # 创建新表
    db.create_all()
    
    # 验证
    tables = ['chat_conversations', 'chat_messages', 'memory_entries']
    for t in tables:
        result = db.session.execute(text(f"SHOW TABLES LIKE '{t}'"))
        exists = result.fetchone() is not None
        print(f"  表 {t}: {'已创建' if exists else '不存在'}")
    
    print("\n迁移完成！")
