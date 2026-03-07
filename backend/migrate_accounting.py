"""财务系统重构 - 新增 5 张表（MySQL）"""
import sys
sys.path.insert(0, '.')
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        stmts = [
            """CREATE TABLE IF NOT EXISTS account_item_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES account_books(id) ON DELETE CASCADE
            )""",
            "CREATE INDEX IF NOT EXISTS ix_aic_book ON account_item_categories(book_id)",

            """CREATE TABLE IF NOT EXISTS account_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(200) NOT NULL,
                is_enabled TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES account_item_categories(id) ON DELETE CASCADE
            )""",
            "CREATE INDEX IF NOT EXISTS ix_ai_cat ON account_items(category_id)",

            """CREATE TABLE IF NOT EXISTS subject_item_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_id INT NOT NULL,
                category_id INT NOT NULL,
                FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES account_item_categories(id) ON DELETE CASCADE,
                UNIQUE KEY uq_subject_category (subject_id, category_id)
            )""",

            """CREATE TABLE IF NOT EXISTS voucher_entry_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                entry_id INT NOT NULL,
                category_id INT NOT NULL,
                item_id INT NOT NULL,
                FOREIGN KEY (entry_id) REFERENCES voucher_entries(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES account_item_categories(id),
                FOREIGN KEY (item_id) REFERENCES account_items(id)
            )""",
            "CREATE INDEX IF NOT EXISTS ix_vei_entry ON voucher_entry_items(entry_id)",

            """CREATE TABLE IF NOT EXISTS subject_initial_balances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INT NOT NULL,
                subject_id INT NOT NULL,
                item_id INT NULL,
                debit_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
                credit_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
                FOREIGN KEY (book_id) REFERENCES account_books(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES account_subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES account_items(id),
                UNIQUE KEY uq_initial_balance (book_id, subject_id, item_id)
            )""",
            "CREATE INDEX IF NOT EXISTS ix_sib_book ON subject_initial_balances(book_id)",
        ]
        for sql in stmts:
            try:
                conn.execute(text(sql))
            except Exception as e:
                print(f"WARN: {e}")
        conn.commit()
        print("OK: 5 张财务表创建完成")
