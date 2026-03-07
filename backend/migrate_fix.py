"""修复供应链表: 创建缺失的4个表, 修复列类型不匹配问题"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app import create_app, db
from sqlalchemy import text

app = create_app()

STATEMENTS = [
    # 先修复已有表的外键列类型: parent_id/category_id/warehouse_id 等应为 BIGINT UNSIGNED 以匹配 id
    "ALTER TABLE sc_product_categories MODIFY parent_id BIGINT UNSIGNED NULL",
    "ALTER TABLE sc_products MODIFY category_id BIGINT UNSIGNED NULL",
    "ALTER TABLE sc_stores MODIFY warehouse_id BIGINT UNSIGNED NULL",
    "ALTER TABLE sc_inventory MODIFY warehouse_id BIGINT UNSIGNED NOT NULL",
    "ALTER TABLE sc_inventory MODIFY product_id BIGINT UNSIGNED NOT NULL",
    "ALTER TABLE sc_inventory MODIFY product_spec_id BIGINT UNSIGNED NULL",

    # 创建 sc_product_specs
    """CREATE TABLE IF NOT EXISTS sc_product_specs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id BIGINT UNSIGNED NOT NULL,
        spec_name VARCHAR(50) NOT NULL,
        spec_value VARCHAR(100) NOT NULL,
        price_override DECIMAL(10,2) NULL,
        INDEX ix_sc_product_specs_product_id (product_id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 创建 sc_inventory_logs
    """CREATE TABLE IF NOT EXISTS sc_inventory_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        warehouse_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        product_spec_id BIGINT UNSIGNED NULL,
        change_qty DECIMAL(12,2) NOT NULL,
        after_qty DECIMAL(12,2) NOT NULL,
        log_type VARCHAR(20) NOT NULL,
        reason VARCHAR(300) NULL,
        order_id INT NULL,
        operator_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX ix_sc_inv_logs_wh (warehouse_id),
        FOREIGN KEY (warehouse_id) REFERENCES sc_warehouses(id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        FOREIGN KEY (product_spec_id) REFERENCES sc_product_specs(id),
        FOREIGN KEY (operator_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 创建 sc_orders
    """CREATE TABLE IF NOT EXISTS sc_orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(30) NOT NULL,
        store_id BIGINT UNSIGNED NOT NULL,
        warehouse_id BIGINT UNSIGNED NOT NULL,
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

    # 创建 sc_order_items
    """CREATE TABLE IF NOT EXISTS sc_order_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        product_spec_id BIGINT UNSIGNED NULL,
        product_name VARCHAR(200) NOT NULL,
        spec_info VARCHAR(200) NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        INDEX ix_sc_order_items_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES sc_orders(id),
        FOREIGN KEY (product_id) REFERENCES sc_products(id),
        FOREIGN KEY (product_spec_id) REFERENCES sc_product_specs(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",

    # 修复 sc_inventory 的 product_spec_id 外键 (已有表引用新创建的 sc_product_specs)
    # 先 drop 旧的约束如果存在
]

if __name__ == '__main__':
    with app.app_context():
        with db.engine.connect() as conn:
            for sql in STATEMENTS:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    label = sql.strip()[:70].replace('\n', ' ')
                    print(f"OK: {label}...")
                except Exception as e:
                    conn.rollback()
                    err = str(e)[:120]
                    print(f"WARN: {err}")
    print("\n修复完成!")
