"""
Database Migration Script: Remove unnecessary columns
- Remove source_product_sku and category from source_cost_library table
- Remove source_product_sku from product_mapping table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def remove_columns():
    """Remove unnecessary columns"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Starting database migration...")
            
            # 1. Remove columns from source_cost_library table
            print("\n1. Checking source_cost_library table...")
            
            # Check if source_product_sku column exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'source_cost_library' 
                AND COLUMN_NAME = 'source_product_sku'
            """))
            if result.scalar() > 0:
                print("   Dropping source_product_sku column...")
                db.session.execute(text("ALTER TABLE source_cost_library DROP COLUMN source_product_sku"))
                print("   SUCCESS: source_product_sku column dropped")
            else:
                print("   SKIP: source_product_sku column does not exist")
            
            # Check if category column exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'source_cost_library' 
                AND COLUMN_NAME = 'category'
            """))
            if result.scalar() > 0:
                print("   Dropping category column...")
                db.session.execute(text("ALTER TABLE source_cost_library DROP COLUMN category"))
                print("   SUCCESS: category column dropped")
            else:
                print("   SKIP: category column does not exist")
            
            # 2. Remove source_product_sku from product_mapping table
            print("\n2. Checking product_mapping table...")
            
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'product_mapping' 
                AND COLUMN_NAME = 'source_product_sku'
            """))
            if result.scalar() > 0:
                print("   Dropping source_product_sku column...")
                db.session.execute(text("ALTER TABLE product_mapping DROP COLUMN source_product_sku"))
                print("   SUCCESS: source_product_sku column dropped")
            else:
                print("   SKIP: source_product_sku column does not exist")
            
            db.session.commit()
            print("\nSUCCESS: Database migration completed!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\nERROR: Database migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    return True

def add_back_columns():
    """Rollback: Add back deleted columns"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Starting database rollback...")
            
            # 1. Add back columns to source_cost_library table
            print("\n1. Modifying source_cost_library table...")
            
            # Check if source_product_sku column exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'source_cost_library' 
                AND COLUMN_NAME = 'source_product_sku'
            """))
            if result.scalar() == 0:
                print("   Adding back source_product_sku column...")
                db.session.execute(text("""
                    ALTER TABLE source_cost_library 
                    ADD COLUMN source_product_sku VARCHAR(100) AFTER source_product_name
                """))
                print("   SUCCESS: source_product_sku column added")
            else:
                print("   SKIP: source_product_sku column already exists")
            
            # Check if category column exists
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'source_cost_library' 
                AND COLUMN_NAME = 'category'
            """))
            if result.scalar() == 0:
                print("   Adding back category column...")
                db.session.execute(text("""
                    ALTER TABLE source_cost_library 
                    ADD COLUMN category VARCHAR(100) AFTER source_product_sku
                """))
                print("   SUCCESS: category column added")
            else:
                print("   SKIP: category column already exists")
            
            # 2. Add back column to product_mapping table
            print("\n2. Modifying product_mapping table...")
            
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'product_mapping' 
                AND COLUMN_NAME = 'source_product_sku'
            """))
            if result.scalar() == 0:
                print("   Adding back source_product_sku column...")
                db.session.execute(text("""
                    ALTER TABLE product_mapping 
                    ADD COLUMN source_product_sku VARCHAR(100) AFTER source_product_name
                """))
                print("   SUCCESS: source_product_sku column added")
            else:
                print("   SKIP: source_product_sku column already exists")
            
            db.session.commit()
            print("\nSUCCESS: Database rollback completed!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\nERROR: Database rollback failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    return True

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        success = add_back_columns()
    else:
        success = remove_columns()
    
    sys.exit(0 if success else 1)
