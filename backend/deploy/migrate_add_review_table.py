#!/usr/bin/env python3
"""
数据库迁移脚本：创建 eleme_review_data 表
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
        print("🔄 Starting migration: Create eleme_review_data table...")
        
        # 创建评价数据表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS `eleme_review_data` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
            
            -- 基础信息
            `data_date` DATE NOT NULL COMMENT '日期',
            `store_id` VARCHAR(50) COMMENT '门店ID',
            `store_name` VARCHAR(200) NOT NULL COMMENT '门店名称',
            `city` VARCHAR(50) COMMENT '城市名称',
            
            -- 订单与评价信息
            `order_id` VARCHAR(100) COMMENT '订单ID（允许重复）',
            `review_time` DATETIME COMMENT '评价时间',
            
            -- 评分数据（1-5分制）
            `overall_score` DECIMAL(3, 1) COMMENT '总体评分',
            `taste_score` DECIMAL(3, 1) COMMENT '味道评分',
            `packaging_score` DECIMAL(3, 1) COMMENT '包装评分',
            `delivery_score` DECIMAL(3, 1) COMMENT '配送评分',
            
            -- 评价内容
            `review_content` TEXT COMMENT '评价内容（长文本）',
            `reply_content` TEXT COMMENT '回复内容（长文本）',
            
            -- 商品反馈
            `liked_products` TEXT COMMENT '点赞商品',
            `disliked_products` TEXT COMMENT '点踩商品',
            
            -- 状态字段
            `is_appeal_success` VARCHAR(10) COMMENT '是否申诉成功（是/否）',
            `is_counted_in_score` VARCHAR(10) COMMENT '是否计入总分（是/否）',
            `is_visible_to_customer` VARCHAR(10) COMMENT '顾客是否会看到（是/否）',
            `reply_method` VARCHAR(50) COMMENT '回评方式',
            
            -- 订单详情
            `order_details` TEXT COMMENT '订单详情（长文本）',
            
            -- 元数据
            `import_batch_id` VARCHAR(50) COMMENT '导入批次ID',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            
            -- 索引
            INDEX `idx_data_date` (`data_date`),
            INDEX `idx_store_id` (`store_id`),
            INDEX `idx_store_name` (`store_name`),
            INDEX `idx_city` (`city`),
            INDEX `idx_order_id` (`order_id`),
            INDEX `idx_review_time` (`review_time`),
            INDEX `idx_import_batch_id` (`import_batch_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='饿了么评价数据表';
        """
        
        try:
            db.session.execute(text(create_table_sql))
            db.session.commit()
            print("✅ Table 'eleme_review_data' created successfully!")
            print("📊 Table includes 19 fields:")
            print("   - Basic Info: 4 fields (date, store_id, store_name, city)")
            print("   - Order & Review: 2 fields (order_id, review_time)")
            print("   - Scores: 4 fields (overall, taste, packaging, delivery)")
            print("   - Content: 2 fields (review, reply)")
            print("   - Product Feedback: 2 fields (liked, disliked)")
            print("   - Status: 4 fields (appeal, counted, visible, reply method)")
            print("   - Details: 1 field (order details)")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            return False

if __name__ == '__main__':
    success = migrate()
    sys.exit(0 if success else 1)

