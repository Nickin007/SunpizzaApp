#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
添加外卖运营角色数据库迁移脚本

新增角色：
- users表的role枚举添加 'delivery_operation' (外卖运营)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_add_delivery_role():
    """执行添加外卖运营角色的数据库迁移"""
    app = create_app()
    
    with app.app_context():
        print("="*60)
        print("  添加外卖运营角色数据库迁移")
        print("="*60)
        print()
        
        try:
            # 修改 users 表的 role 枚举，添加 delivery_operation
            print("1. 修改 users 表的 role 枚举类型...")
            db.session.execute(text("""
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('admin', 'regional_manager', 'shop_manager', 'delivery_operation') NOT NULL
            """))
            print("   ✅ 添加 'delivery_operation' 角色成功")
            
            db.session.commit()
            
            print()
            print("="*60)
            print("✅ 数据库迁移完成！")
            print("="*60)
            print()
            print("提示：")
            print("1. users 表的 role 枚举已添加 'delivery_operation' 选项")
            print("2. 现在可以创建外卖运营角色的用户了")
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
    migrate_add_delivery_role()

