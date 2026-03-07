import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        for t in ['sc_product_categories', 'sc_products', 'sc_warehouses', 'sc_stores', 'sc_inventory', 'users']:
            try:
                r = conn.execute(text(f'DESCRIBE {t}'))
                rows = r.fetchall()
                print(f'=== {t} ===')
                for row in rows[:4]:
                    print(f'  {row[0]}: {row[1]}')
            except Exception as e:
                print(f'{t}: {e}')
        print()
        for t in ['sc_product_specs', 'sc_inventory_logs', 'sc_orders', 'sc_order_items']:
            try:
                r = conn.execute(text(f'DESCRIBE {t}'))
                print(f'{t}: EXISTS')
            except:
                print(f'{t}: MISSING')
