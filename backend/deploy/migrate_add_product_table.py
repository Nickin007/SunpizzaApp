#!/usr/bin/env python3
"""
数据库迁移脚本：创建 eleme_product_data 表
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
        print("🔄 Starting migration: Create eleme_product_data table...")
        
        # 创建商品数据表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS `eleme_product_data` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
            
            -- 基础信息
            `data_date` DATE NOT NULL COMMENT '日期',
            `city` VARCHAR(50) COMMENT '城市名称',
            `store_name` VARCHAR(200) NOT NULL COMMENT '门店名称',
            `store_id` VARCHAR(50) COMMENT '门店编号',
            `product_name` VARCHAR(200) NOT NULL COMMENT '商品名称',
            
            -- 商品属性
            `is_new_product` VARCHAR(10) COMMENT '是否新品',
            `is_signature` VARCHAR(10) COMMENT '是否招牌',
            `is_combo` VARCHAR(10) COMMENT '是否套餐',
            `is_ingredient` VARCHAR(10) COMMENT '是否配料',
            `is_sold_out` VARCHAR(10) COMMENT '是否售罄',
            
            -- 销售数据
            `sales_amount` DECIMAL(12, 2) DEFAULT 0 COMMENT '销售额（元）',
            `sales_volume` INT DEFAULT 0 COMMENT '销量',
            `order_user_count` INT DEFAULT 0 COMMENT '下单人数',
            `order_count` INT DEFAULT 0 COMMENT '带来订单数',
            `order_transaction_amount` DECIMAL(12, 2) DEFAULT 0 COMMENT '订单交易额（元）',
            
            -- 复购数据
            `repurchase_30d_users` INT DEFAULT 0 COMMENT '近30日复购人数',
            `repurchase_30d_rate` DECIMAL(5, 2) COMMENT '近30日复购率（%）',
            
            -- 新客数据
            `new_customer_count` INT DEFAULT 0 COMMENT '新客人数',
            `new_customer_ratio` DECIMAL(5, 2) COMMENT '新客占比（%）',
            
            -- 用户行为数据
            `exposure_users` INT DEFAULT 0 COMMENT '曝光人数',
            `click_users` INT DEFAULT 0 COMMENT '点击人数',
            `add_to_cart_users` INT DEFAULT 0 COMMENT '加购人数',
            `add_to_cart_rate` DECIMAL(5, 2) COMMENT '加购率（%）',
            `like_count` INT DEFAULT 0 COMMENT '点赞数',
            
            -- 元数据
            `import_batch_id` VARCHAR(50) COMMENT '导入批次ID',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            
            -- 索引
            INDEX `idx_data_date` (`data_date`),
            INDEX `idx_city` (`city`),
            INDEX `idx_store_name` (`store_name`),
            INDEX `idx_store_id` (`store_id`),
            INDEX `idx_product_name` (`product_name`),
            INDEX `idx_import_batch_id` (`import_batch_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='饿了么商品数据表';
        """
        
        try:
            db.session.execute(text(create_table_sql))
            db.session.commit()
            print("✅ Table 'eleme_product_data' created successfully!")
            print("📊 Table includes 24 fields:")
            print("   - Basic Info: 5 fields (date, city, store, product)")
            print("   - Product Attributes: 5 fields (new, signature, combo, ingredient, sold out)")
            print("   - Sales Data: 5 fields (amount, volume, users, orders, transaction)")
            print("   - Repurchase Data: 2 fields (users, rate)")
            print("   - New Customer Data: 2 fields (count, ratio)")
            print("   - User Behavior: 5 fields (exposure, click, add to cart, rate, like)")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            return False

if __name__ == '__main__':
    success = migrate()
    sys.exit(0 if success else 1)

