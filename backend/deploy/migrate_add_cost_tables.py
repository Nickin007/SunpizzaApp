#!/usr/bin/env python3
"""
添加成本分析相关表
- source_cost_library: 源商品成本库
- product_mapping: 映射商品库
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # 创建源商品成本库表
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS `source_cost_library` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `source_product_name` VARCHAR(200) NOT NULL COMMENT '源商品名称',
                    `source_product_sku` VARCHAR(100) NOT NULL COMMENT '源商品SKU',
                    `category` VARCHAR(100) DEFAULT NULL COMMENT '类别',
                    `cost` DECIMAL(10, 2) NOT NULL COMMENT '成本',
                    `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除',
                    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `uk_source_product_sku` (`source_product_sku`),
                    KEY `idx_source_product_name` (`source_product_name`),
                    KEY `idx_is_deleted` (`is_deleted`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='源商品成本库'
            """))
            
            # 创建映射商品库表
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS `product_mapping` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `parsed_product_name` VARCHAR(200) NOT NULL COMMENT '拆解单品名称',
                    `source_product_name` VARCHAR(200) NOT NULL COMMENT '映射源商品名称',
                    `source_product_sku` VARCHAR(100) NOT NULL COMMENT '映射源商品SKU',
                    `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除',
                    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    PRIMARY KEY (`id`),
                    UNIQUE KEY `uk_parsed_product_name` (`parsed_product_name`),
                    KEY `idx_source_product_sku` (`source_product_sku`),
                    KEY `idx_is_deleted` (`is_deleted`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='映射商品库'
            """))
            
            db.session.commit()
            print("✅ 成本分析表创建成功！")
            print("   - source_cost_library: 源商品成本库")
            print("   - product_mapping: 映射商品库")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 迁移失败: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()

