"""
添加门店名称字段到订单数据（饿了么）表
执行命令: python migrate_add_store_name_to_order_eleme.py
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """执行迁移"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🚀 开始添加门店名称字段到订单数据（饿了么）表...")
            
            # 检查字段是否已存在
            check_sql = """
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'eleme_order_eleme_data'
            AND COLUMN_NAME = 'store_name';
            """
            
            result = db.session.execute(text(check_sql)).fetchone()
            
            if result[0] > 0:
                print("⚠️ 字段 store_name 已存在，跳过迁移。")
                return
            
            # 添加新字段（在 data_date 之后）
            alter_sql = """
            ALTER TABLE eleme_order_eleme_data
            ADD COLUMN store_name VARCHAR(200) NULL COMMENT '门店名称'
            AFTER data_date,
            ADD INDEX idx_store_name (store_name);
            """
            
            db.session.execute(text(alter_sql))
            db.session.commit()
            
            print("✅ 成功添加门店名称字段！")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 迁移失败: {e}")
            raise

if __name__ == '__main__':
    migrate()

