"""
迁移脚本：为 chat_messages 表添加 msg_type 和 metadata 字段
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

app = create_app()

with app.app_context():
    conn = db.engine.connect()

    existing = [col['name'] for col in db.inspect(db.engine).get_columns('chat_messages')]

    if 'msg_type' not in existing:
        conn.execute(db.text(
            "ALTER TABLE chat_messages ADD COLUMN msg_type VARCHAR(20) NOT NULL DEFAULT 'text'"
        ))
        print("Added column: msg_type")
    else:
        print("Column msg_type already exists, skipping")

    if 'metadata' not in existing:
        conn.execute(db.text(
            "ALTER TABLE chat_messages ADD COLUMN metadata TEXT"
        ))
        print("Added column: metadata")
    else:
        print("Column metadata already exists, skipping")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")
