"""
成本分析API模块
"""
from flask import Blueprint, request
from app import db
from app.models import AnalyzableStore, ProductRecipeCard, IngredientCost, ProductNameMapping
from app.utils.response import success_response, error_response
import pandas as pd
from decimal import Decimal
from io import BytesIO

bp = Blueprint('cost_analysis', __name__, url_prefix='/api/cost-analysis')

# 导入订单解析模块
from app.utils.order_parser_20260205 import parse_order_items
import os
import importlib.util


# ==================== 一站式导入配置 API ====================

@bp.route('/import-config', methods=['POST'])
def import_config():
    """一站式导入配置：上传xlsx文件，一次性导入四项配置数据"""
    try:
        if 'file' not in request.files:
            return error_response('请上传Excel文件')

        file = request.files['file']
        if file.filename == '':
            return error_response('文件名不能为空')

        filename_lower = file.filename.lower() if file.filename else ''
        if not filename_lower.endswith('.xlsx'):
            return error_response('仅支持 .xlsx 格式文件')

        mode = request.form.get('mode', 'upsert')  # upsert 或 replace
        if mode not in ('upsert', 'replace'):
            return error_response('无效的导入模式，请选择 upsert 或 replace')

        # 读取所有sheet
        xls = pd.ExcelFile(file, engine='openpyxl')
        sheet_names = xls.sheet_names

        stats = {
            'stores': {'added': 0, 'skipped': 0, 'updated': 0},
            'mappings': {'added': 0, 'skipped': 0, 'updated': 0},
            'recipes': {'added': 0, 'skipped': 0, 'updated': 0},
            'ingredients': {'added': 0, 'skipped': 0, 'updated': 0},
        }
        processed_sheets = []

        # ---------- replace模式：先清空四张表 ----------
        if mode == 'replace':
            AnalyzableStore.query.delete()
            ProductNameMapping.query.delete()
            ProductRecipeCard.query.delete()
            IngredientCost.query.delete()
            db.session.flush()

        # ---------- Sheet 1: 可分析门店 ----------
        store_sheet = None
        for sn in sheet_names:
            if '门店' in sn:
                store_sheet = sn
                break

        if store_sheet:
            df_stores = pd.read_excel(xls, sheet_name=store_sheet)
            # 找到包含"门店"的列
            store_col = None
            for col in df_stores.columns:
                if '门店' in str(col):
                    store_col = col
                    break
            if store_col is None and len(df_stores.columns) >= 1:
                store_col = df_stores.columns[0]

            if store_col is not None:
                for _, row in df_stores.iterrows():
                    name = str(row[store_col]).strip() if pd.notna(row[store_col]) else ''
                    if not name:
                        continue
                    if mode == 'replace':
                        db.session.add(AnalyzableStore(store_name=name))
                        stats['stores']['added'] += 1
                    else:
                        existing = AnalyzableStore.query.filter_by(store_name=name).first()
                        if existing:
                            stats['stores']['skipped'] += 1
                        else:
                            db.session.add(AnalyzableStore(store_name=name))
                            stats['stores']['added'] += 1
                processed_sheets.append(store_sheet)

        # ---------- Sheet 2: 单品-源商品映射 ----------
        mapping_sheet = None
        for sn in sheet_names:
            if '映射' in sn or '单品' in sn:
                mapping_sheet = sn
                break

        if mapping_sheet:
            df_mappings = pd.read_excel(xls, sheet_name=mapping_sheet)
            # 前两列: 解析单品名称, 映射源商品名称
            if len(df_mappings.columns) >= 2:
                col_parsed = df_mappings.columns[0]
                col_source = df_mappings.columns[1]

                for _, row in df_mappings.iterrows():
                    parsed_name = str(row[col_parsed]).strip() if pd.notna(row[col_parsed]) else ''
                    source_name = str(row[col_source]).strip() if pd.notna(row[col_source]) else ''
                    if not parsed_name or not source_name:
                        continue
                    if mode == 'replace':
                        db.session.add(ProductNameMapping(parsed_name=parsed_name, source_name=source_name))
                        stats['mappings']['added'] += 1
                    else:
                        existing = ProductNameMapping.query.filter_by(parsed_name=parsed_name).first()
                        if existing:
                            existing.source_name = source_name
                            stats['mappings']['updated'] += 1
                        else:
                            db.session.add(ProductNameMapping(parsed_name=parsed_name, source_name=source_name))
                            stats['mappings']['added'] += 1
                processed_sheets.append(mapping_sheet)

        # ---------- Sheet 3: 源商品原料卡 ----------
        recipe_sheet = None
        for sn in sheet_names:
            if '原料卡' in sn:
                recipe_sheet = sn
                break

        if recipe_sheet:
            df_recipes = pd.read_excel(xls, sheet_name=recipe_sheet)
            # 第1列: 映射源商品名称; 后续每3列一组: 原料名称, 用量, 计量单位
            if len(df_recipes.columns) >= 4:
                product_col = df_recipes.columns[0]

                for _, row in df_recipes.iterrows():
                    product_name = str(row[product_col]).strip() if pd.notna(row[product_col]) else ''
                    if not product_name:
                        continue

                    # 每3列一组提取原料
                    col_idx = 1
                    cols = list(df_recipes.columns)
                    while col_idx + 2 < len(cols):
                        ing_name_val = row.iloc[col_idx] if col_idx < len(row) else None
                        ing_qty_val = row.iloc[col_idx + 1] if col_idx + 1 < len(row) else None
                        ing_unit_val = row.iloc[col_idx + 2] if col_idx + 2 < len(row) else None

                        ing_name = str(ing_name_val).strip() if pd.notna(ing_name_val) and str(ing_name_val).strip() else ''
                        ing_unit = str(ing_unit_val).strip() if pd.notna(ing_unit_val) and str(ing_unit_val).strip() else ''

                        if not ing_name or not ing_unit:
                            col_idx += 3
                            continue

                        try:
                            quantity = Decimal(str(ing_qty_val)) if pd.notna(ing_qty_val) else Decimal('0')
                        except Exception:
                            quantity = Decimal('0')

                        if mode == 'replace':
                            db.session.add(ProductRecipeCard(
                                product_name=product_name,
                                ingredient_name=ing_name,
                                ingredient_unit=ing_unit,
                                quantity=quantity
                            ))
                            stats['recipes']['added'] += 1
                        else:
                            existing = ProductRecipeCard.query.filter_by(
                                product_name=product_name,
                                ingredient_name=ing_name
            ).first()
                            if existing:
                                existing.ingredient_unit = ing_unit
                                existing.quantity = quantity
                                stats['recipes']['updated'] += 1
                            else:
                                db.session.add(ProductRecipeCard(
                                    product_name=product_name,
                                    ingredient_name=ing_name,
                                    ingredient_unit=ing_unit,
                                    quantity=quantity
                                ))
                                stats['recipes']['added'] += 1

                        col_idx += 3
                processed_sheets.append(recipe_sheet)

        # ---------- Sheet 4: 原料成本数据库 ----------
        cost_sheet = None
        for sn in sheet_names:
            if '成本' in sn:
                cost_sheet = sn
                break

        if cost_sheet:
            df_costs = pd.read_excel(xls, sheet_name=cost_sheet)
            # 三列: 原料名称, 原料计量单位, 原料单位成本
            if len(df_costs.columns) >= 3:
                col_name = df_costs.columns[0]
                col_unit = df_costs.columns[1]
                col_cost = df_costs.columns[2]

                for _, row in df_costs.iterrows():
                    ing_name = str(row[col_name]).strip() if pd.notna(row[col_name]) else ''
                    unit = str(row[col_unit]).strip() if pd.notna(row[col_unit]) else ''
                    if not ing_name or not unit:
                        continue

                    try:
                        unit_cost = Decimal(str(row[col_cost])) if pd.notna(row[col_cost]) else Decimal('0')
                    except Exception:
                        unit_cost = Decimal('0')

                    if mode == 'replace':
                        db.session.add(IngredientCost(
                            ingredient_name=ing_name,
                            unit=unit,
                            unit_cost=unit_cost
                        ))
                        stats['ingredients']['added'] += 1
                    else:
                        existing = IngredientCost.query.filter_by(ingredient_name=ing_name).first()
                        if existing:
                            existing.unit = unit
                            existing.unit_cost = unit_cost
                            stats['ingredients']['updated'] += 1
                        else:
                            db.session.add(IngredientCost(
                                ingredient_name=ing_name,
                                unit=unit,
                                unit_cost=unit_cost
                            ))
                            stats['ingredients']['added'] += 1
                processed_sheets.append(cost_sheet)

        db.session.commit()

        mode_label = '完全替换' if mode == 'replace' else '智能合并'
        return success_response({
            'mode': mode,
            'mode_label': mode_label,
            'processed_sheets': processed_sheets,
            'all_sheets': sheet_names,
            'stats': stats
        }, message=f'导入成功（{mode_label}模式）')
            
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return error_response(f'导入失败: {str(e)}')


# ==================== 解析算法 API ====================

@bp.route('/parsers', methods=['GET'])
def get_parsers():
    """获取所有可用的解析算法列表"""
    try:
        utils_dir = os.path.dirname(os.path.abspath(__file__)).replace('api', 'utils')
        parsers = []
        
        # 扫描utils目录下的所有.py文件
        for filename in os.listdir(utils_dir):
            if filename.endswith('.py') and not filename.startswith('__'):
                parser_name = filename[:-3]  # 去掉.py后缀
                # 检查文件是否包含parse_order_items函数
                filepath = os.path.join(utils_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # 检查是否有parse_order_items函数定义
                        if 'def parse_order_items' in content:
                            parsers.append({
                                'name': parser_name,
                                'filename': filename,
                                'description': f'{parser_name} 解析算法'
                            })
                except Exception:
                    pass
        
        # 默认排序，order_parser在最前面
        parsers.sort(key=lambda x: (0 if x['name'] == 'order_parser' else 1, x['name']))
        
        return success_response(parsers)
    except Exception as e:
        return error_response(f'获取解析算法列表失败: {str(e)}')


# ==================== 可分析门店 API ====================

@bp.route('/stores', methods=['GET'])
def get_stores():
    """获取可分析门店列表"""
    try:
        stores = AnalyzableStore.query.order_by(AnalyzableStore.created_at.desc()).all()
        return success_response([store.to_dict() for store in stores])
    except Exception as e:
        return error_response(f'获取门店列表失败: {str(e)}')


@bp.route('/stores', methods=['POST'])
def add_store():
    """添加可分析门店"""
    try:
        data = request.get_json()
        store_name = data.get('store_name', '').strip()
        
        if not store_name:
            return error_response('门店名称不能为空')
        
        # 检查是否已存在
        existing = AnalyzableStore.query.filter_by(store_name=store_name).first()
        if existing:
            return error_response('该门店已存在')
        
        store = AnalyzableStore(store_name=store_name)
        db.session.add(store)
        db.session.commit()
        
        return success_response(store.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加门店失败: {str(e)}')


@bp.route('/stores/<int:store_id>', methods=['DELETE'])
def delete_store(store_id):
    """删除可分析门店"""
    try:
        store = AnalyzableStore.query.get(store_id)
        if not store:
            return error_response('门店不存在')
        
        db.session.delete(store)
        db.session.commit()
        
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除门店失败: {str(e)}')


@bp.route('/stores/batch', methods=['POST'])
def batch_add_stores():
    """批量添加门店"""
    try:
        data = request.get_json()
        store_names = data.get('store_names', [])
        
        if not store_names:
            return error_response('门店名称列表不能为空')
        
        added = 0
        skipped = 0
        
        for name in store_names:
            name = name.strip()
            if not name:
                continue
            
            existing = AnalyzableStore.query.filter_by(store_name=name).first()
            if existing:
                skipped += 1
                continue

            store = AnalyzableStore(store_name=name)
            db.session.add(store)
            added += 1
        
        db.session.commit()
        return success_response({'added': added, 'skipped': skipped}, message=f'添加成功: {added}个，跳过已存在: {skipped}个')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量添加失败: {str(e)}')


@bp.route('/stores/batch-delete', methods=['POST'])
def batch_delete_stores():
    """批量删除门店"""
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        
        if not ids:
            return error_response('请选择要删除的门店')
        
        deleted = AnalyzableStore.query.filter(AnalyzableStore.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return success_response({'deleted': deleted}, message=f'成功删除 {deleted} 家门店')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量删除失败: {str(e)}')


# ==================== 单品原料卡 API ====================

@bp.route('/recipes', methods=['GET'])
def get_recipes():
    """获取所有原料卡"""
    try:
        product_name = request.args.get('product_name', '')
        
        query = ProductRecipeCard.query
        if product_name:
            query = query.filter(ProductRecipeCard.product_name == product_name)
        
        recipes = query.order_by(ProductRecipeCard.product_name, ProductRecipeCard.ingredient_name).all()
        return success_response([recipe.to_dict() for recipe in recipes])
    except Exception as e:
        return error_response(f'获取原料卡失败: {str(e)}')


@bp.route('/recipes/products', methods=['GET'])
def get_recipe_products():
    """获取所有已配置原料卡的单品列表"""
    try:
        products = db.session.query(ProductRecipeCard.product_name).distinct().all()
        product_list = [p[0] for p in products]
        return success_response(product_list)
    except Exception as e:
        return error_response(f'获取单品列表失败: {str(e)}')


@bp.route('/recipes', methods=['POST'])
def add_recipe():
    """添加原料卡记录"""
    try:
        data = request.get_json()
        product_name = data.get('product_name', '').strip()
        ingredient_name = data.get('ingredient_name', '').strip()
        ingredient_unit = data.get('ingredient_unit', '').strip()
        quantity = data.get('quantity', 0)
        
        if not product_name or not ingredient_name or not ingredient_unit:
            return error_response('单品名称、原料名称和计量单位不能为空')
        
        # 检查是否已存在同一单品的同一原料
        existing = ProductRecipeCard.query.filter_by(
            product_name=product_name,
            ingredient_name=ingredient_name
        ).first()
        
        if existing:
            # 更新现有记录
            existing.ingredient_unit = ingredient_unit
            existing.quantity = Decimal(str(quantity))
            db.session.commit()
            return success_response(existing.to_dict(), message='更新成功')
        
        recipe = ProductRecipeCard(
            product_name=product_name,
            ingredient_name=ingredient_name,
            ingredient_unit=ingredient_unit,
            quantity=Decimal(str(quantity))
        )
        db.session.add(recipe)
        db.session.commit()
        
        return success_response(recipe.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加原料卡失败: {str(e)}')


@bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    """删除原料卡记录"""
    try:
        recipe = ProductRecipeCard.query.get(recipe_id)
        if not recipe:
            return error_response('原料卡记录不存在')
        
        db.session.delete(recipe)
        db.session.commit()
        
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除原料卡失败: {str(e)}')


@bp.route('/recipes/batch', methods=['POST'])
def batch_add_recipes():
    """批量添加原料卡"""
    try:
        data = request.get_json()
        recipes = data.get('recipes', [])
        
        if not recipes:
            return error_response('原料卡列表不能为空')
        
        added = 0
        updated = 0
        
        for item in recipes:
            product_name = item.get('product_name', '').strip()
            ingredient_name = item.get('ingredient_name', '').strip()
            ingredient_unit = item.get('ingredient_unit', '').strip()
            quantity = item.get('quantity', 0)
            
            if not product_name or not ingredient_name or not ingredient_unit:
                continue
            
            existing = ProductRecipeCard.query.filter_by(
                product_name=product_name,
                ingredient_name=ingredient_name
            ).first()
            
            if existing:
                existing.ingredient_unit = ingredient_unit
                existing.quantity = Decimal(str(quantity))
                updated += 1
            else:
                recipe = ProductRecipeCard(
                    product_name=product_name,
                    ingredient_name=ingredient_name,
                    ingredient_unit=ingredient_unit,
                    quantity=Decimal(str(quantity))
                )
                db.session.add(recipe)
                added += 1
        
        db.session.commit()
        return success_response({'added': added, 'updated': updated}, message=f'添加: {added}个，更新: {updated}个')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量添加失败: {str(e)}')


@bp.route('/recipes/batch-delete', methods=['POST'])
def batch_delete_recipes():
    """批量删除原料卡"""
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        
        if not ids:
            return error_response('请选择要删除的原料卡')
        
        deleted = ProductRecipeCard.query.filter(ProductRecipeCard.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return success_response({'deleted': deleted}, message=f'成功删除 {deleted} 条原料卡记录')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量删除失败: {str(e)}')


# ==================== 原料成本 API ====================

@bp.route('/ingredients', methods=['GET'])
def get_ingredients():
    """获取原料成本列表"""
    try:
        ingredients = IngredientCost.query.order_by(IngredientCost.ingredient_name).all()
        return success_response([ing.to_dict() for ing in ingredients])
    except Exception as e:
        return error_response(f'获取原料成本失败: {str(e)}')


@bp.route('/ingredients', methods=['POST'])
def add_ingredient():
    """添加/更新原料成本"""
    try:
        data = request.get_json()
        ingredient_name = data.get('ingredient_name', '').strip()
        unit = data.get('unit', '').strip()
        unit_cost = data.get('unit_cost', 0)
        
        if not ingredient_name or not unit:
            return error_response('原料名称和计量单位不能为空')
        
        existing = IngredientCost.query.filter_by(ingredient_name=ingredient_name).first()
        
        if existing:
            existing.unit = unit
            existing.unit_cost = Decimal(str(unit_cost))
            db.session.commit()
            return success_response(existing.to_dict(), message='更新成功')
        
        ingredient = IngredientCost(
            ingredient_name=ingredient_name,
            unit=unit,
            unit_cost=Decimal(str(unit_cost))
        )
        db.session.add(ingredient)
        db.session.commit()
        
        return success_response(ingredient.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加原料成本失败: {str(e)}')


@bp.route('/ingredients/<int:ingredient_id>', methods=['DELETE'])
def delete_ingredient(ingredient_id):
    """删除原料成本"""
    try:
        ingredient = IngredientCost.query.get(ingredient_id)
        if not ingredient:
            return error_response('原料不存在')
        
        db.session.delete(ingredient)
        db.session.commit()
        
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除原料成本失败: {str(e)}')


@bp.route('/ingredients/batch', methods=['POST'])
def batch_add_ingredients():
    """批量添加原料成本"""
    try:
        data = request.get_json()
        ingredients = data.get('ingredients', [])
        
        if not ingredients:
            return error_response('原料列表不能为空')
        
        added = 0
        updated = 0
        
        for item in ingredients:
            ingredient_name = item.get('ingredient_name', '').strip()
            unit = item.get('unit', '').strip()
            unit_cost = item.get('unit_cost', 0)
            
            if not ingredient_name or not unit:
                continue
            
            existing = IngredientCost.query.filter_by(ingredient_name=ingredient_name).first()
            
            if existing:
                existing.unit = unit
                existing.unit_cost = Decimal(str(unit_cost))
                updated += 1
            else:
                ingredient = IngredientCost(
                    ingredient_name=ingredient_name,
                    unit=unit,
                    unit_cost=Decimal(str(unit_cost))
                )
                db.session.add(ingredient)
                added += 1
        
        db.session.commit()
        return success_response({'added': added, 'updated': updated}, message=f'添加: {added}个，更新: {updated}个')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量添加失败: {str(e)}')


@bp.route('/ingredients/batch-delete', methods=['POST'])
def batch_delete_ingredients():
    """批量删除原料成本"""
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        
        if not ids:
            return error_response('请选择要删除的原料')
        
        deleted = IngredientCost.query.filter(IngredientCost.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return success_response({'deleted': deleted}, message=f'成功删除 {deleted} 种原料')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量删除失败: {str(e)}')


# ==================== 源商品名称映射 API ====================

@bp.route('/mappings', methods=['GET'])
def get_mappings():
    """获取源商品名称映射列表"""
    try:
        source_name = request.args.get('source_name', '')
        
        query = ProductNameMapping.query
        if source_name:
            query = query.filter(ProductNameMapping.source_name == source_name)
        
        mappings = query.order_by(ProductNameMapping.source_name, ProductNameMapping.parsed_name).all()
        return success_response([m.to_dict() for m in mappings])
    except Exception as e:
        return error_response(f'获取映射列表失败: {str(e)}')


@bp.route('/mappings/sources', methods=['GET'])
def get_source_names():
    """获取所有源商品名称列表"""
    try:
        sources = db.session.query(ProductNameMapping.source_name).distinct().all()
        source_list = sorted([s[0] for s in sources])
        return success_response(source_list)
    except Exception as e:
        return error_response(f'获取源商品列表失败: {str(e)}')


@bp.route('/mappings', methods=['POST'])
def add_mapping():
    """添加源商品名称映射"""
    try:
        data = request.get_json()
        parsed_name = data.get('parsed_name', '').strip()
        source_name = data.get('source_name', '').strip()
        
        if not parsed_name or not source_name:
            return error_response('解析单品名称和源商品名称不能为空')
        
        # 检查是否已存在
        existing = ProductNameMapping.query.filter_by(parsed_name=parsed_name).first()
        
        if existing:
            # 更新现有记录
            existing.source_name = source_name
            db.session.commit()
            return success_response(existing.to_dict(), message='更新成功')
        
        mapping = ProductNameMapping(
            parsed_name=parsed_name,
            source_name=source_name
        )
        db.session.add(mapping)
        db.session.commit()
        
        return success_response(mapping.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加映射失败: {str(e)}')


@bp.route('/mappings/<int:mapping_id>', methods=['DELETE'])
def delete_mapping(mapping_id):
    """删除源商品名称映射"""
    try:
        mapping = ProductNameMapping.query.get(mapping_id)
        if not mapping:
            return error_response('映射记录不存在')
        
        db.session.delete(mapping)
        db.session.commit()
        
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除映射失败: {str(e)}')


@bp.route('/mappings/batch', methods=['POST'])
def batch_add_mappings():
    """批量添加源商品名称映射"""
    try:
        data = request.get_json()
        mappings = data.get('mappings', [])
        
        if not mappings:
            return error_response('映射列表不能为空')
        
        added = 0
        updated = 0
        
        for item in mappings:
            parsed_name = item.get('parsed_name', '').strip()
            source_name = item.get('source_name', '').strip()
            
            if not parsed_name or not source_name:
                continue
            
            existing = ProductNameMapping.query.filter_by(parsed_name=parsed_name).first()
            
            if existing:
                existing.source_name = source_name
                updated += 1
            else:
                mapping = ProductNameMapping(
                    parsed_name=parsed_name,
                    source_name=source_name
                )
                db.session.add(mapping)
                added += 1
        
        db.session.commit()
        return success_response({'added': added, 'updated': updated}, message=f'添加: {added}个，更新: {updated}个')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量添加失败: {str(e)}')


@bp.route('/mappings/batch-delete', methods=['POST'])
def batch_delete_mappings():
    """批量删除源商品映射"""
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        
        if not ids:
            return error_response('请选择要删除的映射')
        
        deleted = ProductNameMapping.query.filter(ProductNameMapping.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return success_response({'deleted': deleted}, message=f'成功删除 {deleted} 条映射')
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量删除失败: {str(e)}')


@bp.route('/mappings/unmapped', methods=['POST'])
def get_unmapped_products():
    """获取未映射的单品列表（从上传的订单中提取）"""
    try:
        if 'file' not in request.files:
            return error_response('请上传Excel文件')
        
        file = request.files['file']
        if file.filename == '':
            return error_response('文件名不能为空')
        
        filename_lower = file.filename.lower() if file.filename else ''
        if not (filename_lower.endswith('.xlsx') or filename_lower.endswith('.csv')):
            return error_response('请上传 .xlsx 或 .csv 格式的文件')
        
        # 读取文件
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file, engine='openpyxl')
        
        # 获取列名
        columns = list(df.columns)
        
        # 查找门店名称和商品信息列
        store_col = None
        product_col = None
        
        for col in columns:
            if '门店名称' in str(col):
                store_col = col
            if '商品信息' in str(col):
                product_col = col
        
        if not store_col:
            return error_response('未找到"门店名称"列')
        if not product_col:
            return error_response('未找到"商品信息"列')
        
        # 获取可分析门店列表
        analyzable_stores = AnalyzableStore.query.all()
        analyzable_store_names = {s.store_name for s in analyzable_stores}
        
        if not analyzable_store_names:
            return error_response('请先配置可分析门店')
        
        # 过滤订单
        df_filtered = df[df[store_col].isin(analyzable_store_names)]
        
        if df_filtered.empty:
            return error_response('没有找到匹配的可分析门店订单')
        
        # 获取已有映射
        existing_mappings = ProductNameMapping.query.all()
        mapped_names = {m.parsed_name for m in existing_mappings}
        
        # ============================================================
        # 第一轮：逐订单解析，收集每个未映射单品的详细来源信息
        # ============================================================
        # 汇总结构: {product_name: {count, stores: set(), details: list()}}
        all_products = {}
        # 每个订单的完整解析记录（用于详情展示，限量存储）
        MAX_DETAILS_PER_PRODUCT = 10  # 每个未映射单品最多保留10条订单详情

        for row_idx, row in df_filtered.iterrows():
            product_info = str(row[product_col]) if pd.notna(row[product_col]) else ''
            current_store = str(row[store_col]) if pd.notna(row[store_col]) else ''
            if not product_info:
                continue

            # 解析整条订单
            raw_items = parse_order_items(product_info)

            # 把 raw_items 拆成 (name, qty) 列表
            parsed_list = []
            for item in raw_items:
                if '_' in item:
                    parts = item.rsplit('_', 1)
                    pname = parts[0]
                    try:
                        pqty = int(parts[1])
                    except ValueError:
                        pqty = 1
                else:
                    pname = item
                    pqty = 1
                parsed_list.append({'name': pname, 'qty': pqty, 'mapped': pname in mapped_names})

            # 记录该订单里哪些是未映射的
            unmapped_names_in_order = [p['name'] for p in parsed_list if not p['mapped']]

            for p in parsed_list:
                pname = p['name']
                pqty = p['qty']

                if pname not in all_products:
                    all_products[pname] = {'count': 0, 'stores': set(), 'details': []}
                all_products[pname]['count'] += pqty
                if current_store:
                    all_products[pname]['stores'].add(current_store)

                # 对未映射的单品，保存订单级详情
                if pname not in mapped_names and len(all_products[pname]['details']) < MAX_DETAILS_PER_PRODUCT:
                    all_products[pname]['details'].append({
                        'store_name': current_store,
                        'order_text': product_info[:300],
                        'total_parsed': len(parsed_list),
                        'all_items': [
                            {'name': pp['name'], 'qty': pp['qty'], 'is_unmapped': not pp['mapped']}
                            for pp in parsed_list
                        ],
                    })

        # 筛选未映射的单品
        unmapped = []
        for name, info in sorted(all_products.items(), key=lambda x: x[1]['count'], reverse=True):
            if name not in mapped_names:
                unmapped.append({
                    'parsed_name': name,
                    'count': info['count'],
                    'stores': sorted(info['stores']),
                    'store_count': len(info['stores']),
                    'details': info['details'],
                })
        
        return success_response({
            'unmapped': unmapped,
            'total_products': len(all_products),
            'mapped_count': len(all_products) - len(unmapped),
            'unmapped_count': len(unmapped),
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'获取未映射单品失败: {str(e)}')


# ==================== 订单分析 API ====================

@bp.route('/preview', methods=['POST'])
def preview_orders():
    """预览上传的Excel文件"""
    try:
        if 'file' not in request.files:
            return error_response('请上传Excel文件')
        
        file = request.files['file']
        if file.filename == '':
            return error_response('文件名不能为空')
        
        filename_lower = file.filename.lower() if file.filename else ''
        if not (filename_lower.endswith('.xlsx') or filename_lower.endswith('.csv')):
            return error_response('请上传 .xlsx 或 .csv 格式的文件')
        
        # 读取文件
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file, engine='openpyxl')
        
        # 获取列名
        columns = list(df.columns)
        
        # 获取前20行数据用于预览
        preview_rows = df.head(20).fillna('').to_dict('records')
        
        # 查找门店名称列
        store_col = None
        product_col = None
        for col in columns:
            if '门店名称' in str(col):
                store_col = col
            if '商品信息' in str(col):
                product_col = col
        
        # 统计门店
        stores_in_file = []
        if store_col:
            stores_in_file = df[store_col].dropna().unique().tolist()
        
        # 获取可分析门店列表
        analyzable_stores = AnalyzableStore.query.all()
        analyzable_store_names = {s.store_name for s in analyzable_stores}
        
        # 匹配门店
        matched_stores = [s for s in stores_in_file if s in analyzable_store_names]
        unmatched_stores = [s for s in stores_in_file if s not in analyzable_store_names]
        
        return success_response({
            'columns': columns,
            'preview_rows': preview_rows,
            'total_rows': len(df),
            'stores_in_file': stores_in_file,
            'matched_stores': matched_stores,
            'unmatched_stores': unmatched_stores,
            'has_store_col': store_col is not None,
            'has_product_col': product_col is not None,
            'store_col_name': store_col,
            'product_col_name': product_col
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'预览失败: {str(e)}')


@bp.route('/analyze', methods=['POST'])
def analyze_orders():
    """上传并分析订单，返回矩阵数据"""
    try:
        if 'file' not in request.files:
            return error_response('请上传Excel文件')
        
        file = request.files['file']
        if file.filename == '':
            return error_response('文件名不能为空')
        
        filename_lower = file.filename.lower() if file.filename else ''
        if not (filename_lower.endswith('.xlsx') or filename_lower.endswith('.csv')):
            return error_response('请上传 .xlsx 或 .csv 格式的文件')
        
        # 读取文件
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file, engine='openpyxl')
        
        # 获取列名
        columns = list(df.columns)
        
        # 查找门店名称和商品信息列
        store_col = None
        product_col = None
        
        for col in columns:
            if '门店名称' in str(col):
                store_col = col
            if '商品信息' in str(col):
                product_col = col
        
        if not store_col:
            return error_response('未找到"门店名称"列')
        if not product_col:
            return error_response('未找到"商品信息"列')
        
        # 获取可分析门店列表
        analyzable_stores = AnalyzableStore.query.all()
        analyzable_store_names = {s.store_name for s in analyzable_stores}
        
        if not analyzable_store_names:
            return error_response('请先配置可分析门店')
        
        # 过滤订单
        df_filtered = df[df[store_col].isin(analyzable_store_names)]
        
        if df_filtered.empty:
            return error_response('没有找到匹配的可分析门店订单')
        
        # 获取源商品名称映射
        mappings = ProductNameMapping.query.all()
        mapping_dict = {m.parsed_name: m.source_name for m in mappings}
        
        # 获取原料卡映射 - 使用源商品名称作为key
        recipes = ProductRecipeCard.query.all()
        recipe_map = {}  # {source_product_name: [{ingredient_name, ingredient_unit, quantity}]}
        for recipe in recipes:
            if recipe.product_name not in recipe_map:
                recipe_map[recipe.product_name] = []
            recipe_map[recipe.product_name].append({
                'ingredient_name': recipe.ingredient_name,
                'ingredient_unit': recipe.ingredient_unit,
                'quantity': float(recipe.quantity)
            })
        
        # 获取原料成本
        ingredient_costs = IngredientCost.query.all()
        cost_map = {ic.ingredient_name: float(ic.unit_cost) for ic in ingredient_costs}
        
        # 收集所有门店名称
        all_store_names = sorted(df_filtered[store_col].unique().tolist())
        
        # 收集所有源商品名称和原料名称（用于矩阵）
        all_source_products = set()
        all_ingredients = set()
        
        # 按门店分析数据
        # 结构：{store_name: {source_product: {quantity, cost}}}
        store_source_product_data = {}
        # 结构：{store_name: {ingredient: {quantity, cost}}}
        store_ingredient_data = {}
        
        # 未映射的单品
        unmapped_products = set()
        # 源商品没有原料卡的
        unmapped_source_products = set()
        
        for store_name in all_store_names:
            store_orders = df_filtered[df_filtered[store_col] == store_name]
            
            store_source_product_data[store_name] = {}
            store_ingredient_data[store_name] = {}
            
            for _, row in store_orders.iterrows():
                product_info = str(row[product_col]) if pd.notna(row[product_col]) else ''
                if not product_info:
                    continue
                
                # 解析商品信息
                items = parse_order_items(product_info)
                
                for item in items:
                    # 格式: 单品名称_数量
                    if '_' in item:
                        parts = item.rsplit('_', 1)
                        product_name = parts[0]
                        try:
                            qty = int(parts[1])
                        except ValueError:
                            qty = 1
                    else:
                        product_name = item
                        qty = 1
                    
                    # 单品映射到源商品
                    source_product = mapping_dict.get(product_name, product_name)
                    if product_name not in mapping_dict:
                        unmapped_products.add(product_name)
                    
                    all_source_products.add(source_product)
                    
                    # 统计源商品数量
                    if source_product not in store_source_product_data[store_name]:
                        store_source_product_data[store_name][source_product] = {'quantity': 0, 'cost': 0}
                    store_source_product_data[store_name][source_product]['quantity'] += qty
                    
                    # 源商品映射到原料
                    if source_product in recipe_map:
                        for recipe in recipe_map[source_product]:
                            ing_name = recipe['ingredient_name']
                            ing_unit = recipe['ingredient_unit']
                            ing_qty = recipe['quantity'] * qty
                            
                            all_ingredients.add(ing_name)
                            
                            if ing_name not in store_ingredient_data[store_name]:
                                store_ingredient_data[store_name][ing_name] = {'unit': ing_unit, 'quantity': 0, 'cost': 0}
                            
                            store_ingredient_data[store_name][ing_name]['quantity'] += ing_qty
                            
                            # 计算原料成本
                            if ing_name in cost_map:
                                ing_cost = ing_qty * cost_map[ing_name]
                                store_ingredient_data[store_name][ing_name]['cost'] += ing_cost
                                # 回填源商品成本
                                store_source_product_data[store_name][source_product]['cost'] += ing_cost
                    else:
                        unmapped_source_products.add(source_product)
        
        # 排序
        all_source_products = sorted(all_source_products)
        all_ingredients = sorted(all_ingredients)
        
        # 构建矩阵数据
        # 源商品销量矩阵
        source_product_quantity_matrix = []
        for sp in all_source_products:
            row_data = {'source_product': sp}
            for store in all_store_names:
                row_data[store] = store_source_product_data[store].get(sp, {}).get('quantity', 0)
            source_product_quantity_matrix.append(row_data)
        
        # 源商品成本矩阵
        source_product_cost_matrix = []
        for sp in all_source_products:
            row_data = {'source_product': sp}
            for store in all_store_names:
                row_data[store] = round(store_source_product_data[store].get(sp, {}).get('cost', 0), 2)
            source_product_cost_matrix.append(row_data)
        
        # 原料消耗量矩阵
        ingredient_quantity_matrix = []
        for ing in all_ingredients:
            row_data = {'ingredient': ing}
            for store in all_store_names:
                row_data[store] = round(store_ingredient_data[store].get(ing, {}).get('quantity', 0), 4)
            ingredient_quantity_matrix.append(row_data)
        
        # 原料成本矩阵
        ingredient_cost_matrix = []
        for ing in all_ingredients:
            row_data = {'ingredient': ing}
            for store in all_store_names:
                row_data[store] = round(store_ingredient_data[store].get(ing, {}).get('cost', 0), 2)
            ingredient_cost_matrix.append(row_data)
        
        # 汇总数据
        result = {
            'summary': {
                'total_orders': len(df_filtered),
                'total_stores': len(all_store_names),
                'total_source_products': len(all_source_products),
                'total_ingredients': len(all_ingredients),
                'unmapped_products': list(unmapped_products),
                'unmapped_source_products': list(unmapped_source_products)
            },
            'stores': all_store_names,
            'source_products': all_source_products,
            'ingredients': all_ingredients,
            'source_product_quantity_matrix': source_product_quantity_matrix,
            'source_product_cost_matrix': source_product_cost_matrix,
            'ingredient_quantity_matrix': ingredient_quantity_matrix,
            'ingredient_cost_matrix': ingredient_cost_matrix
        }
        
        return success_response(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'分析失败: {str(e)}')


@bp.route('/export', methods=['POST'])
def export_analysis():
    """导出分析结果为Excel（旧版，保留兼容）"""
    try:
        data = request.get_json()
        stores_data = data.get('stores', [])
        
        if not stores_data:
            return error_response('没有数据可导出')
        
        # 创建Excel文件
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # 门店汇总表
            summary_data = []
            for store in stores_data:
                summary_data.append({
                    '门店名称': store['store_name'],
                    '订单数': store['order_count'],
                    '总成本': store['total_cost']
                })
            
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, sheet_name='门店汇总', index=False)
            
            # 每个门店的详细数据
            for store in stores_data:
                store_name = store['store_name']
                # Excel sheet名最多31个字符
                sheet_name_sales = f"{store_name[:15]}_单品销量"
                sheet_name_cost = f"{store_name[:15]}_原料消耗"
                
                # 单品销量表
                if store['product_sales']:
                    df_sales = pd.DataFrame(store['product_sales'])
                    df_sales.columns = ['单品名称', '销售数量']
                    df_sales.to_excel(writer, sheet_name=sheet_name_sales, index=False)
                
                # 原料消耗表
                if store['ingredient_usage']:
                    df_usage = pd.DataFrame(store['ingredient_usage'])
                    df_usage.columns = ['原料名称', '计量单位', '消耗数量', '成本']
                    df_usage.to_excel(writer, sheet_name=sheet_name_cost, index=False)
        
        output.seek(0)
        
        from flask import send_file
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='成本分析结果.xlsx'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')


@bp.route('/export-source-product', methods=['POST'])
def export_source_product():
    """导出源商品数据Excel（两个Sheet：销量矩阵和成本矩阵）"""
    try:
        data = request.get_json()
        stores = data.get('stores', [])
        source_products = data.get('source_products', [])
        quantity_matrix = data.get('source_product_quantity_matrix', [])
        cost_matrix = data.get('source_product_cost_matrix', [])
        
        if not stores or not source_products:
            return error_response('没有数据可导出')
        
        # 创建Excel文件
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Sheet1: 源商品销量矩阵
            # 构建DataFrame，第一列是源商品名称，其余列是门店
            quantity_data = {'源商品': source_products}
            for store in stores:
                quantity_data[store] = [0] * len(source_products)
            
            for i, sp in enumerate(source_products):
                for row in quantity_matrix:
                    if row.get('source_product') == sp:
                        for store in stores:
                            quantity_data[store][i] = row.get(store, 0)
                        break
            
            df_quantity = pd.DataFrame(quantity_data)
            df_quantity.to_excel(writer, sheet_name='源商品销量', index=False)
            
            # Sheet2: 源商品成本矩阵
            cost_data = {'源商品': source_products}
            for store in stores:
                cost_data[store] = [0] * len(source_products)
            
            for i, sp in enumerate(source_products):
                for row in cost_matrix:
                    if row.get('source_product') == sp:
                        for store in stores:
                            cost_data[store][i] = row.get(store, 0)
                        break
            
            df_cost = pd.DataFrame(cost_data)
            df_cost.to_excel(writer, sheet_name='源商品成本', index=False)
        
        output.seek(0)
        
        from flask import send_file
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='源商品数据.xlsx'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'导出失败: {str(e)}')


@bp.route('/export-ingredient', methods=['POST'])
def export_ingredient():
    """导出原料数据Excel（两个Sheet：消耗量矩阵和成本矩阵）"""
    try:
        data = request.get_json()
        stores = data.get('stores', [])
        ingredients = data.get('ingredients', [])
        quantity_matrix = data.get('ingredient_quantity_matrix', [])
        cost_matrix = data.get('ingredient_cost_matrix', [])
        
        if not stores or not ingredients:
            return error_response('没有数据可导出')
        
        # 创建Excel文件
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Sheet1: 原料消耗量矩阵
            quantity_data = {'原料': ingredients}
            for store in stores:
                quantity_data[store] = [0] * len(ingredients)
            
            for i, ing in enumerate(ingredients):
                for row in quantity_matrix:
                    if row.get('ingredient') == ing:
                        for store in stores:
                            quantity_data[store][i] = row.get(store, 0)
                        break
            
            df_quantity = pd.DataFrame(quantity_data)
            df_quantity.to_excel(writer, sheet_name='原料消耗量', index=False)
            
            # Sheet2: 原料成本矩阵
            cost_data = {'原料': ingredients}
            for store in stores:
                cost_data[store] = [0] * len(ingredients)
            
            for i, ing in enumerate(ingredients):
                for row in cost_matrix:
                    if row.get('ingredient') == ing:
                        for store in stores:
                            cost_data[store][i] = row.get(store, 0)
                        break
            
            df_cost = pd.DataFrame(cost_data)
            df_cost.to_excel(writer, sheet_name='原料成本', index=False)
        
        output.seek(0)
        
        from flask import send_file
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='原料数据.xlsx'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'导出失败: {str(e)}')
