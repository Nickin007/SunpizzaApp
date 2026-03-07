"""Rename metadata column to meta_data in chat_messages table."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app, db

app = create_app()
with app.app_context():
    conn = db.engine.connect()
    cols = [c['name'] for c in db.inspect(db.engine).get_columns('chat_messages')]
    if 'metadata' in cols and 'meta_data' not in cols:
        conn.execute(db.text("ALTER TABLE chat_messages CHANGE COLUMN metadata meta_data TEXT"))
        conn.commit()
        print("Renamed metadata -> meta_data")
    elif 'meta_data' in cols:
        print("Column meta_data already exists")
    else:
        print("No metadata column found, nothing to do")
    conn.close()
    print("Done!")
