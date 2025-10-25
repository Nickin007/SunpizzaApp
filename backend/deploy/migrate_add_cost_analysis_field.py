import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    from app import create_app, db
    from sqlalchemy import text
    
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("Adding cost_analysis_enabled field to eleme_active_stores table")
        print("=" * 70)
        
        # Check if field already exists
        check_column_sql = """
        SELECT COUNT(*) as count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eleme_active_stores'
        AND COLUMN_NAME = 'cost_analysis_enabled';
        """
        result = db.session.execute(text(check_column_sql)).fetchone()
        
        if result[0] == 0:
            add_column_sql = """
            ALTER TABLE `eleme_active_stores`
            ADD COLUMN `cost_analysis_enabled` TINYINT(1) DEFAULT 0 COMMENT 'Whether cost analysis is enabled for this store' AFTER `is_active`;
            """
            print("Adding cost_analysis_enabled field...")
            db.session.execute(text(add_column_sql))
            db.session.commit()
            print("SUCCESS: cost_analysis_enabled field added successfully")
        else:
            print("WARNING: cost_analysis_enabled field already exists, skipping migration")
        
        print("=" * 70)
        print("Migration completed!")
        print("=" * 70)

if __name__ == '__main__':
    migrate()

