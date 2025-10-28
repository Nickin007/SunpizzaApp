"""
Migration: Add order integration tables
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app, db

def migrate():
    """Create order integration tables"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            # Create eleme_integrated_orders table
            print("Creating eleme_integrated_orders table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS eleme_integrated_orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_date DATE NOT NULL COMMENT '日期（来自饿了么）',
                    order_id VARCHAR(100) NOT NULL COMMENT '订单号（来自食亨）',
                    store_name VARCHAR(200) NOT NULL COMMENT '门店名称（来自食亨）',
                    order_time DATETIME COMMENT '下单时间（来自食亨）',
                    expected_income DECIMAL(10, 2) COMMENT '预计收入（元）（来自食亨）',
                    product_info TEXT COMMENT '商品信息（来自饿了么）',
                    is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否删除',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    INDEX idx_order_date (order_date),
                    INDEX idx_order_id (order_id),
                    INDEX idx_store_name (store_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么订单整合数据库（已匹配订单）';
            """)
            print("✓ eleme_integrated_orders table created successfully!")
            
            # Create eleme_unmatched_orders table
            print("Creating eleme_unmatched_orders table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS eleme_unmatched_orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source VARCHAR(20) NOT NULL COMMENT '来源：eleme或shiheng',
                    order_id VARCHAR(100) NOT NULL COMMENT '订单号',
                    store_name VARCHAR(200) NOT NULL COMMENT '门店名称',
                    order_date DATE COMMENT '日期（来自饿了么）',
                    order_time DATETIME COMMENT '下单时间（来自食亨）',
                    expected_income DECIMAL(10, 2) COMMENT '预计收入（元）（仅食亨）',
                    product_info TEXT COMMENT '商品信息（仅饿了么）',
                    is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否删除',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    INDEX idx_source (source),
                    INDEX idx_order_id (order_id),
                    INDEX idx_store_name (store_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么未匹配订单';
            """)
            print("✓ eleme_unmatched_orders table created successfully!")
            
            connection.commit()
            print("\n✓ All order integration tables created successfully!")
            
        except Exception as e:
            connection.rollback()
            print(f"\n✗ Migration failed: {str(e)}")
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    migrate()

