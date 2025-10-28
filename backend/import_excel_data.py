"""
Import data from Excel files to database
- Import source cost data from 源商品成本.xlsx to SourceCostLibrary
- Import product mapping data from 去重单品列表.xlsx to ProductMapping
"""
import sys
import os
import pandas as pd
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import SourceCostLibrary, ProductMapping

def import_source_cost():
    """Import source cost data from Excel"""
    excel_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'source_cost.xlsx')
    
    if not os.path.exists(excel_file):
        print(f"ERROR: File not found: {excel_file}")
        return False
    
    try:
        # Read Excel file
        df = pd.read_excel(excel_file)
        print(f"\nReading source cost file: {excel_file}")
        print(f"Found {len(df)} rows")
        print(f"Columns: {list(df.columns)}")
        
        # Show first few rows
        print("\nFirst few rows:")
        print(df.head())
        
        # Import data
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Extract data based on column names
                # Adjust these column names based on actual Excel structure
                source_product_name = None
                cost = None
                
                # Try different possible column names
                for col in df.columns:
                    col_lower = str(col).lower().strip()
                    if '源商品' in col or 'product' in col_lower or '商品名' in col:
                        source_product_name = str(row[col]).strip() if pd.notna(row[col]) else None
                    elif '成本' in col or 'cost' in col_lower or '价格' in col:
                        try:
                            cost = float(row[col]) if pd.notna(row[col]) else None
                        except:
                            pass
                
                # Validate data
                if not source_product_name or cost is None:
                    print(f"  Row {index + 1}: Skipping - missing data (name: {source_product_name}, cost: {cost})")
                    skipped_count += 1
                    continue
                
                # Check if already exists
                existing = SourceCostLibrary.query.filter_by(
                    source_product_name=source_product_name
                ).first()
                
                if existing:
                    # Update existing
                    existing.cost = cost
                    existing.updated_at = datetime.utcnow()
                    print(f"  Row {index + 1}: Updated - {source_product_name} -> {cost}")
                else:
                    # Create new
                    new_item = SourceCostLibrary(
                        source_product_name=source_product_name,
                        cost=cost,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.session.add(new_item)
                    print(f"  Row {index + 1}: Created - {source_product_name} -> {cost}")
                
                imported_count += 1
                
            except Exception as e:
                print(f"  Row {index + 1}: ERROR - {e}")
                error_count += 1
                continue
        
        db.session.commit()
        
        print(f"\nSource Cost Import Summary:")
        print(f"  Total rows: {len(df)}")
        print(f"  Imported: {imported_count}")
        print(f"  Skipped: {skipped_count}")
        print(f"  Errors: {error_count}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR importing source cost: {e}")
        import traceback
        traceback.print_exc()
        return False

def import_product_mapping():
    """Import product mapping data from Excel"""
    excel_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'product_mapping.xlsx')
    
    if not os.path.exists(excel_file):
        print(f"ERROR: File not found: {excel_file}")
        return False
    
    try:
        # Read Excel file
        df = pd.read_excel(excel_file)
        print(f"\nReading product mapping file: {excel_file}")
        print(f"Found {len(df)} rows")
        print(f"Columns: {list(df.columns)}")
        
        # Show first few rows
        print("\nFirst few rows:")
        print(df.head())
        
        # Import data
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Extract data based on column names
                parsed_product_name = None
                source_product_name = None
                
                # Try different possible column names
                for col in df.columns:
                    col_lower = str(col).lower().strip()
                    if '拆解单品' in col or '单品' in col or 'parsed' in col_lower:
                        parsed_product_name = str(row[col]).strip() if pd.notna(row[col]) else None
                    elif '源商品' in col or 'source' in col_lower or '映射' in col:
                        source_product_name = str(row[col]).strip() if pd.notna(row[col]) else None
                
                # Validate data
                if not parsed_product_name or not source_product_name:
                    print(f"  Row {index + 1}: Skipping - missing data (parsed: {parsed_product_name}, source: {source_product_name})")
                    skipped_count += 1
                    continue
                
                # Check if already exists
                existing = ProductMapping.query.filter_by(
                    parsed_product_name=parsed_product_name
                ).first()
                
                if existing:
                    # Update existing
                    existing.source_product_name = source_product_name
                    existing.updated_at = datetime.utcnow()
                    print(f"  Row {index + 1}: Updated - {parsed_product_name} -> {source_product_name}")
                else:
                    # Create new
                    new_item = ProductMapping(
                        parsed_product_name=parsed_product_name,
                        source_product_name=source_product_name,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.session.add(new_item)
                    print(f"  Row {index + 1}: Created - {parsed_product_name} -> {source_product_name}")
                
                imported_count += 1
                
            except Exception as e:
                print(f"  Row {index + 1}: ERROR - {e}")
                error_count += 1
                continue
        
        db.session.commit()
        
        print(f"\nProduct Mapping Import Summary:")
        print(f"  Total rows: {len(df)}")
        print(f"  Imported: {imported_count}")
        print(f"  Skipped: {skipped_count}")
        print(f"  Errors: {error_count}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR importing product mapping: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main import function"""
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("Excel Data Import Script")
        print("=" * 60)
        
        # Import source cost
        print("\n" + "=" * 60)
        print("Step 1: Importing Source Cost Data")
        print("=" * 60)
        success1 = import_source_cost()
        
        # Import product mapping
        print("\n" + "=" * 60)
        print("Step 2: Importing Product Mapping Data")
        print("=" * 60)
        success2 = import_product_mapping()
        
        # Summary
        print("\n" + "=" * 60)
        print("Import Complete")
        print("=" * 60)
        print(f"Source Cost: {'SUCCESS' if success1 else 'FAILED'}")
        print(f"Product Mapping: {'SUCCESS' if success2 else 'FAILED'}")
        
        return success1 and success2

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

