#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查在营门店数据"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # 查询总数
    result = db.session.execute(text('SELECT COUNT(*) as count FROM eleme_active_stores')).fetchone()
    print(f'数据库中的门店总数: {result[0]}')
    
    # 查询所有门店
    stores = db.session.execute(text('SELECT id, store_name, is_active FROM eleme_active_stores ORDER BY store_name')).fetchall()
    print('\n所有门店列表:')
    for i, store in enumerate(stores, 1):
        status = '✓ 在营' if store[2] else '✗ 停业'
        print(f'{i}. {store[1]} [{status}]')

