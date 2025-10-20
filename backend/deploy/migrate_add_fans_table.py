#!/usr/bin/env python3
"""
数据库迁移脚本：创建粉丝群数据表 (eleme_fans_data)

运行方式：
cd backend
source venv/bin/activate
python deploy/migrate_add_fans_table.py
"""

import sys
import os

# 将项目根目录添加到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def migrate_add_fans_table():
    """创建粉丝群数据表"""
    app = create_app()
    
    with app.app_context():
        try:
            print("=" * 60)
            print("开始创建粉丝群数据表...")
            print("=" * 60)
            
            create_table_sql = """
        CREATE TABLE IF NOT EXISTS eleme_fans_data (
            id INT PRIMARY KEY AUTO_INCREMENT,
            
            -- 基础信息
            data_date DATE NOT NULL,
            store_name VARCHAR(200) NOT NULL,
            store_id VARCHAR(50),
            city VARCHAR(50),
            
            -- 群基础信息
            reach_threshold VARCHAR(50),
            group_type VARCHAR(50),
            group_count INT DEFAULT 0,
            
            -- 粉丝统计
            total_fans INT DEFAULT 0,
            active_fans INT DEFAULT 0,
            fan_active_rate DECIMAL(10,2) DEFAULT 0,
            visit_fans INT DEFAULT 0,
            fan_visit_rate DECIMAL(10,2) DEFAULT 0,
            new_fans INT DEFAULT 0,
            new_fan_ratio DECIMAL(10,2) DEFAULT 0,
            old_visit_fans INT DEFAULT 0,
            old_fan_visit_rate DECIMAL(10,2) DEFAULT 0,
            quit_fans INT DEFAULT 0,
            quit_fan_ratio DECIMAL(10,2) DEFAULT 0,
            
            -- 订单统计
            group_order_count INT DEFAULT 0,
            store_order_count INT DEFAULT 0,
            group_order_ratio DECIMAL(10,2) DEFAULT 0,
            
            -- 入群礼
            welcome_gift_orders INT DEFAULT 0,
            welcome_gift_received INT DEFAULT 0,
            
            -- 群普通红包
            normal_redpack_orders INT DEFAULT 0,
            normal_redpack_receivers INT DEFAULT 0,
            normal_redpack_users INT DEFAULT 0,
            normal_redpack_received INT DEFAULT 0,
            
            -- 群口令红包
            password_redpack_orders INT DEFAULT 0,
            password_redpack_receivers INT DEFAULT 0,
            password_redpack_users INT DEFAULT 0,
            password_redpack_received INT DEFAULT 0,
            
            -- 群活跃度
            active_group_count INT DEFAULT 0,
            merchant_message_group_count INT DEFAULT 0,
            
            -- 群配置
            has_welcome_gift VARCHAR(50),
            send_coupon_times INT DEFAULT 0,
            send_product_times INT DEFAULT 0,
            has_announcement VARCHAR(50),
            
            -- 元数据
            import_batch_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- 索引
            INDEX idx_data_date (data_date),
            INDEX idx_store_name (store_name),
            INDEX idx_store_id (store_id),
            INDEX idx_city (city),
            INDEX idx_batch (import_batch_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 执行SQL
            db.session.execute(text(create_table_sql))
            db.session.commit()
            
            print("\n✅ 粉丝群数据表创建成功！")
            print("   表名: eleme_fans_data")
            print("   字段数: 39 (37个业务字段 + 2个元数据字段)")
            
            # 验证表是否创建成功
            result = db.session.execute(text("SHOW TABLES LIKE 'eleme_fans_data'"))
            table_exists = result.fetchone()
            
            if table_exists:
                print("\n✅ 表验证成功！")
                
                # 显示表结构
                result = db.session.execute(text("DESCRIBE eleme_fans_data"))
                columns = result.fetchall()
                print(f"\n表结构（共{len(columns)}个字段）:")
                for i, col in enumerate(columns):
                    if i < 10:  # 显示前10个字段
                        print(f"  - {col[0]}: {col[1]}")
                if len(columns) > 10:
                    print(f"  ... 还有 {len(columns) - 10} 个字段")
            else:
                print("\n❌ 表验证失败！")
                return False
            
            print("\n" + "=" * 60)
            print("✅ 迁移完成！")
            print("=" * 60)
            return True
            
        except Exception as e:
            print(f"\n❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False

if __name__ == '__main__':
    print("\n饿了么粉丝群数据表迁移脚本\n")
    
    success = migrate_add_fans_table()
    
    if success:
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ 迁移失败！")
        print("=" * 60)
        sys.exit(1)

