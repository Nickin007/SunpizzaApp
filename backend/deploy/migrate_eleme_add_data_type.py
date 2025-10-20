#!/usr/bin/env python3
"""
数据库迁移脚本：为 eleme_import_logs 表添加 data_type 字段
使用Flask应用上下文和SQLAlchemy
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """执行迁移"""
    try:
        # 创建Flask应用
        app = create_app()
        
        with app.app_context():
            print("=" * 60)
            print("开始数据库迁移：添加 eleme_import_logs.data_type 字段")
            print("=" * 60)
            
            # 1. 检查字段是否已存在
            print("\n1. 检查字段是否存在...")
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'eleme_import_logs' 
                AND COLUMN_NAME = 'data_type'
            """))
            field_exists = result.scalar() > 0
            
            if field_exists:
                print("   ✅ data_type 字段已存在，跳过添加")
            else:
                # 2. 添加 data_type 字段
                print("\n2. 添加 data_type 字段...")
                db.session.execute(text("""
                    ALTER TABLE eleme_import_logs 
                    ADD COLUMN data_type 
                    ENUM('store', 'order', 'product', 'review', 'growth', 'fans') 
                    NOT NULL DEFAULT 'store' 
                    AFTER file_name
                """))
                db.session.commit()
                print("   ✅ data_type 字段添加成功")
            
            # 3. 检查字段类型
            print("\n3. 检查 data_type 字段类型...")
            result = db.session.execute(text("""
                SELECT DATA_TYPE, COLUMN_TYPE 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'eleme_import_logs' 
                AND COLUMN_NAME = 'data_type'
            """))
            field_info = result.fetchone()
            if field_info:
                print(f"   ✅ data_type 字段类型: {field_info[1]}")
            
            # 4. 更新现有记录的 data_type（如果有NULL值）
            print("\n4. 更新现有记录...")
            result = db.session.execute(text("""
                UPDATE eleme_import_logs 
                SET data_type = 'store' 
                WHERE data_type IS NULL OR data_type = ''
            """))
            updated_rows = result.rowcount
            db.session.commit()
            print(f"   ✅ 更新了 {updated_rows} 条记录")
            
            # 5. 验证迁移结果
            print("\n5. 验证迁移结果...")
            result = db.session.execute(text("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN data_type IS NULL THEN 1 ELSE 0 END) as null_count,
                    SUM(CASE WHEN data_type = 'store' THEN 1 ELSE 0 END) as store_count
                FROM eleme_import_logs
            """))
            stats = result.fetchone()
            print(f"   总记录数: {stats[0]}")
            print(f"   NULL值数: {stats[1]}")
            print(f"   门店数据: {stats[2]}")
            
            print("\n" + "=" * 60)
            print("✅ 数据库迁移成功完成！")
            print("=" * 60)
            
            return True
            
    except Exception as e:
        print(f"\n❌ 迁移失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = migrate()
    sys.exit(0 if success else 1)
