#!/usr/bin/env python3
"""
数据库迁移脚本：创建商家成长数据表 (eleme_growth_data)

运行方式：
cd backend
source venv/bin/activate
python deploy/migrate_add_growth_table.py
"""

import sys
import os

# 将项目根目录添加到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def migrate_add_growth_table():
    """创建商家成长数据表"""
    app = create_app()
    
    with app.app_context():
        print("=" * 50)
        print("开始创建商家成长数据表...")
        print("=" * 50)
        
        # 创建商家成长数据表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS `eleme_growth_data` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            
            -- 基础信息
            `data_date` DATE NOT NULL,
            `store_name` VARCHAR(200) NOT NULL,
            `store_id` VARCHAR(50),
            `province` VARCHAR(50),
            `city` VARCHAR(50),
            `district` VARCHAR(50),
            `chain_name` VARCHAR(200),
            `address` TEXT,
            
            -- 店铺评级
            `l_level` VARCHAR(50),
            `store_score` DECIMAL(10, 2),
            
            -- 近7日高峰营业时长
            `peak_hours_7d_current` DECIMAL(10, 2),
            `peak_hours_7d_target` DECIMAL(10, 2),
            `peak_hours_7d_score` DECIMAL(10, 2),
            `peak_hours_7d_weight` DECIMAL(10, 2),
            
            -- 近7日营业时长
            `business_hours_7d_current` DECIMAL(10, 2),
            `business_hours_7d_target` DECIMAL(10, 2),
            `business_hours_7d_score` DECIMAL(10, 2),
            `business_hours_7d_weight` DECIMAL(10, 2),
            
            -- 昨日店装丰富度
            `store_decoration_current` DECIMAL(10, 2),
            `store_decoration_target` DECIMAL(10, 2),
            `store_decoration_score` DECIMAL(10, 2),
            `store_decoration_weight` DECIMAL(10, 2),
            
            -- 昨日最低起送价
            `min_delivery_price_current` DECIMAL(10, 2),
            `min_delivery_price_target` DECIMAL(10, 2),
            `min_delivery_price_score` DECIMAL(10, 2),
            `min_delivery_price_weight` DECIMAL(10, 2),
            
            -- 昨日服务功能丰富度
            `service_features_current` DECIMAL(10, 2),
            `service_features_target` DECIMAL(10, 2),
            `service_features_score` DECIMAL(10, 2),
            `service_features_weight` DECIMAL(10, 2),
            
            -- 昨日有效活动丰富度
            `promotion_richness_current` DECIMAL(10, 2),
            `promotion_richness_target` DECIMAL(10, 2),
            `promotion_richness_score` DECIMAL(10, 2),
            `promotion_richness_weight` DECIMAL(10, 2),
            
            -- 近7日差评回复率
            `negative_reply_rate_7d_current` DECIMAL(10, 2),
            `negative_reply_rate_7d_target` DECIMAL(10, 2),
            `negative_reply_rate_7d_score` DECIMAL(10, 2),
            `negative_reply_rate_7d_weight` DECIMAL(10, 2),
            
            -- 昨日商家评分
            `merchant_rating_current` DECIMAL(10, 2),
            `merchant_rating_target` DECIMAL(10, 2),
            `merchant_rating_score` DECIMAL(10, 2),
            `merchant_rating_weight` DECIMAL(10, 2),
            
            -- 近7日在线联系回复率
            `online_reply_rate_7d_current` DECIMAL(10, 2),
            `online_reply_rate_7d_target` DECIMAL(10, 2),
            `online_reply_rate_7d_score` DECIMAL(10, 2),
            `online_reply_rate_7d_weight` DECIMAL(10, 2),
            
            -- 昨日优质商品率
            `quality_product_rate_current` DECIMAL(10, 2),
            `quality_product_rate_target` DECIMAL(10, 2),
            `quality_product_rate_score` DECIMAL(10, 2),
            `quality_product_rate_weight` DECIMAL(10, 2),
            
            -- 昨日菜单丰富度
            `menu_richness_current` DECIMAL(10, 2),
            `menu_richness_target` DECIMAL(10, 2),
            `menu_richness_score` DECIMAL(10, 2),
            `menu_richness_weight` DECIMAL(10, 2),
            
            -- 商责取消率
            `merchant_cancel_rate_current` DECIMAL(10, 2),
            `merchant_cancel_rate_target` DECIMAL(10, 2),
            `merchant_cancel_rate_score` DECIMAL(10, 2),
            `merchant_cancel_rate_weight` DECIMAL(10, 2),
            
            -- 近7日出餐完成上报率
            `meal_report_rate_7d_current` DECIMAL(10, 2),
            `meal_report_rate_7d_target` DECIMAL(10, 2),
            `meal_report_rate_7d_score` DECIMAL(10, 2),
            
            -- 元数据
            `import_batch_id` VARCHAR(50),
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            -- 索引
            INDEX `idx_data_date` (`data_date`),
            INDEX `idx_store_id` (`store_id`),
            INDEX `idx_store_name` (`store_name`),
            INDEX `idx_city` (`city`),
            INDEX `idx_province` (`province`),
            INDEX `idx_import_batch_id` (`import_batch_id`),
            INDEX `idx_date_store` (`data_date`, `store_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='饿了么商家成长数据表';
        """
        
        try:
            # 执行创建表语句
            db.session.execute(text(create_table_sql))
            db.session.commit()
            print("✅ 商家成长数据表创建成功!")
            
            # 验证表是否创建
            result = db.session.execute(text("SHOW TABLES LIKE 'eleme_growth_data'"))
            if result.fetchone():
                print("✅ 表 eleme_growth_data 已存在于数据库中")
                
                # 显示表结构
                print("\n📊 表结构预览:")
                result = db.session.execute(text("DESCRIBE eleme_growth_data"))
                columns = result.fetchall()
                print(f"   共有 {len(columns)} 个字段")
                print("\n   前10个字段:")
                for i, col in enumerate(columns[:10], 1):
                    print(f"   {i}. {col[0]:<30} {col[1]:<20}")
                if len(columns) > 10:
                    print(f"   ... 还有 {len(columns) - 10} 个字段")
            else:
                print("❌ 表创建验证失败")
                
        except Exception as e:
            print(f"❌ 创建表失败: {e}")
            db.session.rollback()
            raise
        
        print("=" * 50)
        print("数据库迁移完成!")
        print("=" * 50)

if __name__ == '__main__':
    migrate_add_growth_table()

