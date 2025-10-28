"""
添加单品映射相关表
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def add_product_mapping_tables():
    """添加单品映射相关表"""
    app = create_app()
    
    with app.app_context():
        try:
            print("=" * 70)
            print("添加单品映射相关表")
            print("=" * 70)
            
            # 检查表是否已存在
            check_mapping_table = text("""
                SELECT COUNT(*) as count 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'eleme_product_mapping'
            """)
            
            check_unmatched_table = text("""
                SELECT COUNT(*) as count 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'eleme_product_mapping_unmatched'
            """)
            
            mapping_exists = db.session.execute(check_mapping_table).scalar()
            unmatched_exists = db.session.execute(check_unmatched_table).scalar()
            
            if mapping_exists and unmatched_exists:
                print("表已存在，跳过创建")
                return
            
            # 创建单品映射数据库表
            if not mapping_exists:
                print("\n创建 eleme_product_mapping 表...")
                create_mapping_table = text("""
                    CREATE TABLE IF NOT EXISTS `eleme_product_mapping` (
                        `id` INT AUTO_INCREMENT PRIMARY KEY,
                        `order_date` DATE NOT NULL COMMENT '日期',
                        `order_id` VARCHAR(100) NOT NULL COMMENT '订单号',
                        `store_name` VARCHAR(200) NOT NULL COMMENT '门店名称',
                        `order_time` DATETIME COMMENT '下单时间',
                        `expected_income` DECIMAL(10,2) COMMENT '预计收入（元）',
                        `product_info` TEXT COMMENT '商品信息（原始）',
                        `parsed_products` TEXT COMMENT '解析单品（逗号分隔）',
                        `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除',
                        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                        INDEX `idx_order_date` (`order_date`),
                        INDEX `idx_order_id` (`order_id`),
                        INDEX `idx_store_name` (`store_name`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么单品映射数据库（已映射订单）';
                """)
                db.session.execute(create_mapping_table)
                print("✓ eleme_product_mapping 表创建成功")
            
            # 创建未匹配订单表
            if not unmatched_exists:
                print("\n创建 eleme_product_mapping_unmatched 表...")
                create_unmatched_table = text("""
                    CREATE TABLE IF NOT EXISTS `eleme_product_mapping_unmatched` (
                        `id` INT AUTO_INCREMENT PRIMARY KEY,
                        `order_date` DATE NOT NULL COMMENT '日期',
                        `order_id` VARCHAR(100) NOT NULL COMMENT '订单号',
                        `store_name` VARCHAR(200) NOT NULL COMMENT '门店名称',
                        `order_time` DATETIME COMMENT '下单时间',
                        `expected_income` DECIMAL(10,2) COMMENT '预计收入（元）',
                        `product_info` TEXT COMMENT '商品信息（原始）',
                        `parsed_products` TEXT COMMENT '解析单品（逗号分隔）',
                        `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除',
                        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                        INDEX `idx_order_date` (`order_date`),
                        INDEX `idx_order_id` (`order_id`),
                        INDEX `idx_store_name` (`store_name`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么单品映射未匹配订单';
                """)
                db.session.execute(create_unmatched_table)
                print("✓ eleme_product_mapping_unmatched 表创建成功")
            
            db.session.commit()
            
            print("\n" + "=" * 70)
            print("迁移完成！")
            print("=" * 70)
            
        except Exception as e:
            db.session.rollback()
            print(f"\n错误: {str(e)}")
            raise

if __name__ == '__main__':
    add_product_mapping_tables()

