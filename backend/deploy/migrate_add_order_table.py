"""
数据库迁移脚本：添加饿了么订单数据表
创建 eleme_order_data 表用于存储订单明细数据（来自食亨收银系统）
"""

import sys
import os

# 添加项目根目录到路径（必须在导入app之前）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

# 创建 Flask 应用上下文
app = create_app()

print("=" * 60)
print("开始数据库迁移：添加订单数据表")
print("=" * 60)

with app.app_context():
    try:
        # 创建 eleme_order_data 表
        print("\n[1/2] 创建 eleme_order_data 表...")
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS `eleme_order_data` (
                `id` INT NOT NULL AUTO_INCREMENT,
                
                -- 基础信息
                `store_name` VARCHAR(200) NOT NULL,
                `store_id` VARCHAR(50),
                
                -- 订单核心信息
                `order_id` VARCHAR(100) NOT NULL UNIQUE,
                `order_status` VARCHAR(50),
                `order_time` DATETIME,
                `order_type` VARCHAR(20),
                
                -- 出餐信息
                `cooking_time` INT,
                `cooking_type` VARCHAR(50),
                
                -- 订单详情
                `guest_count` INT DEFAULT 0,
                `product_info` TEXT,
                `pickup_number` VARCHAR(50),
                `order_note` TEXT,
                `refund_reason` VARCHAR(200),
                
                -- 财务信息
                `estimated_income` DECIMAL(12,2) DEFAULT 0,
                `platform_service_fee` DECIMAL(10,2) DEFAULT 0,
                `other_fee` DECIMAL(10,2) DEFAULT 0,
                `delivery_fee` DECIMAL(10,2) DEFAULT 0,
                `discount_name` VARCHAR(500),
                `package_fee` DECIMAL(10,2) DEFAULT 0,
                
                -- 元数据
                `import_batch_id` VARCHAR(50),
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                PRIMARY KEY (`id`),
                INDEX `idx_store_name` (`store_name`),
                INDEX `idx_store_id` (`store_id`),
                INDEX `idx_order_id` (`order_id`),
                INDEX `idx_order_time` (`order_time`),
                INDEX `idx_import_batch_id` (`import_batch_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='饿了么订单明细数据表（来自食亨收银系统）';
        """))
        db.session.commit()
        print("✅ eleme_order_data 表创建成功！")
        
        # 验证表是否创建成功
        print("\n[2/2] 验证表结构...")
        result = db.session.execute(text("""
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'eleme_order_data'
        """))
        count = result.fetchone()[0]
        
        if count == 1:
            print("✅ 表结构验证成功！")
            
            # 显示表结构
            print("\n📋 eleme_order_data 表结构：")
            columns = db.session.execute(text("""
                SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                AND table_name = 'eleme_order_data'
                ORDER BY ORDINAL_POSITION
            """))
            
            print(f"{'字段名':<25} {'类型':<20} {'可空':<8} {'索引':<8}")
            print("-" * 70)
            for col in columns:
                print(f"{col[0]:<25} {col[1]:<20} {col[2]:<8} {col[3]:<8}")
        else:
            raise Exception("表创建失败")
        
        print("\n" + "=" * 60)
        print("🎉 数据库迁移完成！")
        print("=" * 60)
        print("\n✅ 订单数据表已成功创建")
        print("📊 表名：eleme_order_data")
        print("📦 字段数：19个核心字段")
        print("🔑 主键：order_id（订单号唯一索引）")
        print("\n现在可以上传订单Excel数据了！")
        
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ 数据库迁移失败: {e}")
        print("\n可能的原因：")
        print("  1. 表已经存在（可以忽略此错误）")
        print("  2. 数据库连接失败")
        print("  3. 权限不足")
        sys.exit(1)

