"""供应链订货系统数据库迁移脚本 (MySQL 版)"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text

app = create_app()

STATEMENTS = [
    # 1. 新增角色到 user_role enum (MySQL)
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','delivery_operation','SupplyChain_operation','Accouting_operation','DouyinANDOffline_operation','model_operation','warehouse_admin','store_manager') NOT NULL",

    # 2. 货品分类表
    """CREATE TABLE IF NOT EXISTS sc_product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        parent_id INT NULL,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES sc_product_categories(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 3. 货品表
    """CREATE TABLE IF NOT EXISTS sc_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NULL,
        name VARCHAR(200) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT '个',
        default_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        image_url VARCHAR(500) NULL,
        description TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES sc_product_categories(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 4. 货品规格表
    """CREATE TABLE IF NOT EXISTS sc_product_specs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        spec_name VARCHAR(50) NOT NULL,
        spec_value VARCHAR(100) NOT NULL,
        price_override DECIMAL(10,2) NULL,
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        INDEX ix_sc_product_specs_product_id (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 5. 仓库表
    """CREATE TABLE IF NOT EXISTS sc_warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(300) NULL,
        contact_name VARCHAR(50) NULL,
        contact_phone VARCHAR(20) NULL,
        admin_user_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 6. 门店表
    """CREATE TABLE IF NOT EXISTS sc_stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(300) NULL,
        contact_name VARCHAR(50) NULL,
        contact_phone VARCHAR(20) NULL,
        warehouse_id INT NULL,
        manager_user_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES sc_warehouses(id),
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 7. 库存表
    """CREATE TABLE IF NOT EXISTS sc_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        warehouse_id INT NOT NULL,
        product_id INT NOT NULL,
        product_spec_id INT NULL,
        quantity DECIMAL(12,2) DEFAULT 0,
        safety_stock DECIMAL(12,2) DEFAULT 0,
        FOREIGN KEY (warehouse_id) REFERENCES sc_warehouses(id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        FOREIGN KEY (product_spec_id) REFERENCES sc_product_specs(id),
        UNIQUE KEY uix_inventory (warehouse_id, product_id, product_spec_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 8. 库存变动日志
    """CREATE TABLE IF NOT EXISTS sc_inventory_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        warehouse_id INT NOT NULL,
        product_id INT NOT NULL,
        product_spec_id INT NULL,
        change_qty DECIMAL(12,2) NOT NULL,
        after_qty DECIMAL(12,2) NOT NULL,
        log_type VARCHAR(20) NOT NULL,
        reason VARCHAR(300) NULL,
        order_id INT NULL,
        operator_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES sc_warehouses(id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        FOREIGN KEY (product_spec_id) REFERENCES sc_product_specs(id),
        FOREIGN KEY (operator_id) REFERENCES users(id),
        INDEX ix_sc_inventory_logs_warehouse_id (warehouse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 9. 订单表
    """CREATE TABLE IF NOT EXISTS sc_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(30) NOT NULL,
        store_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(12,2) DEFAULT 0,
        remark TEXT NULL,
        creator_id INT NOT NULL,
        reviewer_id INT NULL,
        reviewed_at TIMESTAMP NULL,
        reject_reason VARCHAR(500) NULL,
        shipped_at TIMESTAMP NULL,
        shipper_id INT NULL,
        tracking_no VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ix_sc_orders_order_no (order_no),
        INDEX ix_sc_orders_store_id (store_id),
        FOREIGN KEY (store_id) REFERENCES sc_stores(id),
        FOREIGN KEY (warehouse_id) REFERENCES sc_warehouses(id),
        FOREIGN KEY (creator_id) REFERENCES users(id),
        FOREIGN KEY (reviewer_id) REFERENCES users(id),
        FOREIGN KEY (shipper_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 10. 订单明细表
    """CREATE TABLE IF NOT EXISTS sc_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_spec_id INT NULL,
        product_name VARCHAR(200) NOT NULL,
        spec_info VARCHAR(200) NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES sc_orders(id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        FOREIGN KEY (product_spec_id) REFERENCES sc_product_specs(id),
        INDEX ix_sc_order_items_order_id (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
]

if __name__ == '__main__':
    with app.app_context():
        with db.engine.connect() as conn:
            for sql in STATEMENTS:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    label = sql.strip()[:60].replace('\n', ' ')
                    print(f"OK: {label}...")
                except Exception as e:
                    conn.rollback()
                    print(f"WARN: {e}")
    print("\n供应链表迁移完成!")
