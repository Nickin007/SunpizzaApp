"""
Database migration script: Add cost mapping tables
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    app = create_app()
    
    with app.app_context():
        try:
            print("Starting database migration...")
            print("")
            
            # Create eleme_cost_mapping table
            print("1. Creating eleme_cost_mapping table...")
            create_cost_mapping_table = text("""
                CREATE TABLE IF NOT EXISTS eleme_cost_mapping (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_date DATE NOT NULL,
                    order_id VARCHAR(100) NOT NULL,
                    store_name VARCHAR(200) NOT NULL,
                    order_time DATETIME,
                    expected_income DECIMAL(10, 2) COMMENT 'Expected income in yuan',
                    order_cost DECIMAL(10, 2) COMMENT 'Order cost in yuan',
                    product_info TEXT COMMENT 'Original product info',
                    parsed_products TEXT COMMENT 'Parsed products comma separated',
                    is_deleted BOOLEAN DEFAULT FALSE COMMENT 'Whether deleted',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
                    INDEX idx_order_date (order_date),
                    INDEX idx_order_id (order_id),
                    INDEX idx_store_name (store_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Eleme cost mapping database';
            """)
            db.session.execute(create_cost_mapping_table)
            print("   SUCCESS: eleme_cost_mapping table created")
            print("")
            
            # Create eleme_cost_mapping_unmatched table
            print("2. Creating eleme_cost_mapping_unmatched table...")
            create_cost_mapping_unmatched_table = text("""
                CREATE TABLE IF NOT EXISTS eleme_cost_mapping_unmatched (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_date DATE NOT NULL,
                    order_id VARCHAR(100) NOT NULL,
                    store_name VARCHAR(200) NOT NULL,
                    order_time DATETIME,
                    expected_income DECIMAL(10, 2) COMMENT 'Expected income in yuan',
                    product_info TEXT COMMENT 'Original product info',
                    parsed_products TEXT COMMENT 'Parsed products comma separated',
                    is_deleted BOOLEAN DEFAULT FALSE COMMENT 'Whether deleted',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
                    INDEX idx_order_date (order_date),
                    INDEX idx_order_id (order_id),
                    INDEX idx_store_name (store_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Eleme cost mapping unmatched orders';
            """)
            db.session.execute(create_cost_mapping_unmatched_table)
            print("   SUCCESS: eleme_cost_mapping_unmatched table created")
            print("")
            
            db.session.commit()
            print("SUCCESS: Database migration completed!")
            print("")
            
        except Exception as e:
            db.session.rollback()
            print(f"ERROR: Migration failed - {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    run_migration()

