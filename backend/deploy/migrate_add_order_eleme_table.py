"""
数据库迁移脚本：添加饿了么订单数据表
用于存储从饿了么后台直接导出的订单数据（只需3列：日期、订单单号、商品信息）
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """执行数据库迁移"""
    app = create_app()
    
    with app.app_context():
        try:
            # 创建饿了么订单数据表的SQL语句
            create_table_sql = """
CREATE TABLE IF NOT EXISTS eleme_order_eleme_data (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
    
    -- 基础信息（只需3列）
    data_date DATE NOT NULL COMMENT '日期',
    order_id VARCHAR(100) NOT NULL COMMENT '订单单号',
    product_info TEXT COMMENT '商品信息（包含套餐内所有小项目，用于正则拆解）',
    
    -- 元数据
    import_batch_id VARCHAR(50) COMMENT '导入批次ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX idx_data_date (data_date),
    INDEX idx_order_id (order_id),
    INDEX idx_batch_id (import_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='饿了么订单数据表（从饿了么后台导出）';
"""
            
            print("🚀 开始创建饿了么订单数据表...")
            db.session.execute(text(create_table_sql))
            db.session.commit()
            print("✅ 饿了么订单数据表创建成功！")
            
            # 第一步：先扩展枚举，包含所有旧值和新值
            print("\n🔄 步骤1: 扩展枚举值（包含旧值和新值）...")
            temp_enum_sql = """
ALTER TABLE eleme_import_logs 
MODIFY COLUMN data_type 
ENUM('store', 'order', 'order_shiheng', 'order_eleme', 'product', 'review', 'growth', 'fans') 
NOT NULL DEFAULT 'store' 
COMMENT '数据类型';
"""
            db.session.execute(text(temp_enum_sql))
            db.session.commit()
            print("✅ 枚举扩展成功")
            
            # 第二步：将现有的 'order' 值更新为 'order_shiheng'
            print("\n🔄 步骤2: 更新现有订单数据类型...")
            update_old_order_sql = """
UPDATE eleme_import_logs 
SET data_type = 'order_shiheng' 
WHERE data_type = 'order';
"""
            result = db.session.execute(text(update_old_order_sql))
            db.session.commit()
            print(f"✅ 已更新 {result.rowcount} 条记录：'order' -> 'order_shiheng'")
            
            # 第三步：最终只保留新的枚举值（移除旧的 'order'）
            print("\n🔄 步骤3: 设置最终枚举值（移除旧值）...")
            final_enum_sql = """
ALTER TABLE eleme_import_logs 
MODIFY COLUMN data_type 
ENUM('store', 'order_shiheng', 'order_eleme', 'product', 'review', 'growth', 'fans') 
NOT NULL DEFAULT 'store' 
COMMENT '数据类型';
"""
            db.session.execute(text(final_enum_sql))
            db.session.commit()
            print("✅ 导入日志表枚举更新成功！")
            
            print("\n🎉 数据库迁移完成！")
            
        except Exception as e:
            print(f"\n❌ 迁移失败: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    migrate()

