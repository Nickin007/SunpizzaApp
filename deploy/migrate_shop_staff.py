#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
门店管理数据库迁移脚本

新增字段：
- shops表添加 manager_id (店长)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_shop_staff():
    """执行门店管理相关的数据库迁移"""
    app = create_app()
    
    with app.app_context():
        print("="*60)
        print("  门店管理数据库迁移")
        print("="*60)
        print()
        
        try:
            # 添加 manager_id 字段
            print("1. 添加 shops 表的 manager_id 字段...")
            try:
                db.session.execute(text("""
                    ALTER TABLE shops 
                    ADD COLUMN manager_id INT,
                    ADD FOREIGN KEY (manager_id) REFERENCES users(id)
                """))
                print("   ✅ 添加 manager_id 字段成功")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  manager_id 字段已存在，跳过")
                else:
                    raise
            
            db.session.commit()
            
            print()
            print("="*60)
            print("✅ 数据库迁移完成！")
            print("="*60)
            print()
            print("提示：")
            print("1. 新字段已添加到 shops 表")
            print("2. manager_id 用于存储门店店长")
            print("3. 请重启后端服务以应用更改")
            print()
            
        except Exception as e:
            db.session.rollback()
            print()
            print("❌ 迁移失败:", str(e))
            print()
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate_shop_staff()

