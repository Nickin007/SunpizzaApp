#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 eleme_import_logs 表添加删除标记字段
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_add_deleted_flag():
    app = create_app()
    with app.app_context():
        print("="*60)
        print("  为 eleme_import_logs 添加删除标记")
        print("="*60)
        try:
            # 添加 is_deleted 字段
            print("\n1. 添加 is_deleted 字段...")
            db.session.execute(text("""
                ALTER TABLE eleme_import_logs
                ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 COMMENT '是否已删除数据';
            """))
            print("   ✅ is_deleted 字段添加成功")
            
            # 添加 deleted_at 字段
            print("\n2. 添加 deleted_at 字段...")
            db.session.execute(text("""
                ALTER TABLE eleme_import_logs
                ADD COLUMN deleted_at DATETIME NULL COMMENT '删除时间';
            """))
            print("   ✅ deleted_at 字段添加成功")
            
            db.session.commit()
            
            print("\n" + "="*60)
            print("✅ 迁移完成！")
            print("="*60)
            
        except Exception as e:
            db.session.rollback()
            print("\n❌ 迁移失败:", str(e))
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate_add_deleted_flag()

