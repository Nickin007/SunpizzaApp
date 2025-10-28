#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clear all order integration data
清空所有订单整合数据和未匹配订单数据
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import ElemeIntegratedOrder, ElemeUnmatchedOrder

def clear_integration_data():
    """Clear all integration and unmatched order data"""
    print("=" * 70)
    print("Clear Order Integration Data")
    print("=" * 70)
    
    app = create_app()
    
    with app.app_context():
        try:
            # Count records before deletion
            integrated_count = ElemeIntegratedOrder.query.count()
            unmatched_count = ElemeUnmatchedOrder.query.count()
            
            print(f"\nCurrent records:")
            print(f"  - Integrated orders: {integrated_count}")
            print(f"  - Unmatched orders: {unmatched_count}")
            
            if integrated_count == 0 and unmatched_count == 0:
                print("\n✓ No data to clear. Tables are already empty.")
                return
            
            # Delete all records
            print("\nDeleting all records...")
            
            deleted_integrated = ElemeIntegratedOrder.query.delete()
            print(f"  ✓ Deleted {deleted_integrated} integrated orders")
            
            deleted_unmatched = ElemeUnmatchedOrder.query.delete()
            print(f"  ✓ Deleted {deleted_unmatched} unmatched orders")
            
            # Commit changes
            db.session.commit()
            
            # Verify deletion
            remaining_integrated = ElemeIntegratedOrder.query.count()
            remaining_unmatched = ElemeUnmatchedOrder.query.count()
            
            print(f"\nVerification:")
            print(f"  - Remaining integrated orders: {remaining_integrated}")
            print(f"  - Remaining unmatched orders: {remaining_unmatched}")
            
            if remaining_integrated == 0 and remaining_unmatched == 0:
                print("\n" + "=" * 70)
                print("SUCCESS: All integration data cleared successfully!")
                print("=" * 70)
            else:
                print("\n" + "=" * 70)
                print("WARNING: Some records may not have been deleted")
                print("=" * 70)
                
        except Exception as e:
            db.session.rollback()
            print(f"\n✗ ERROR: {str(e)}")
            print("=" * 70)
            raise

if __name__ == '__main__':
    clear_integration_data()

