"""
AI Chat + 热温冷分层记忆系统 API + 工具调用（选址工具）
全部采用流式输出（SSE），包括工具调用场景
"""
from flask import Blueprint, request, Response, current_app
from app import db
from app.models import ChatConversation, ChatMessage, MemoryEntry, POIStore
from app.utils.response import success_response, error_response
from app.utils.auth import token_required, admin_required
from datetime import datetime, timedelta
import requests as http_requests
import json
import traceback
import time
import math

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

DEEPSEEK_API_KEY = 'sk-995f2510dd174dc5abc2d36d4fc30c03'
DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
DEEPSEEK_MODEL = 'deepseek-chat'

SYSTEM_PROMPT = """你是圣比萨数字化平台的AI助手。你负责帮助管理员处理与公司运营相关的问题，包括：
- 财务核算（账套、科目、凭证）
- 外卖运营数据分析（淘宝闪购、美团外卖、京东外卖）
- 成本分析（订单解析、原料成本、源商品映射）
- 门店管理与选址
- 数据分析与报表

你拥有以下工具能力，可以直接操作选址系统：

【数据搜索】
- poi_search: 搜索任意城市的品牌门店或特定POI类型（通过高德地图API实时搜索），支持设置max_pages控制搜索深度
- poi_batch_search: 批量搜索多个品牌在某城市的门店，适合竞品对比分析
- poi_get_city_list: 获取所有支持的城市列表（含省份分组和区县信息）

【数据查询】
- poi_get_brands: 查看数据库中已有的品牌列表和门店数量统计
- poi_get_stores: 按城市/品牌/类别查询已存储的门店详细数据（含经纬度，最多返回200条）
- poi_get_poi_types: 获取可搜索的POI类型列表（学校、医院、购物中心等）
- poi_get_other_pois: 查看数据库中非品牌类POI的统计信息
- poi_export: 获取门店数据的详细统计概要（按品牌、按区域分布）

【空间分析】
- poi_analyze_radius: 以指定经纬度为圆心，在给定半径内分析周边门店分布，用于评估竞品密度和周边设施

【数据管理】
- poi_delete_brand: 从数据库中删除指定品牌的门店数据（支持限定城市范围）

支持的城市：浙江省11市（杭州、宁波、温州、嘉兴、湖州、绍兴、金华、衢州、舟山、台州、丽水）、上海市、江苏省13市（南京、无锡、徐州、常州、苏州、南通、连云港、淮安、盐城、扬州、镇江、泰州、宿迁）。
如不确定城市名称，可使用 poi_get_city_list 获取完整列表。

当用户提到选址、门店分析、品牌竞争、某个城市的门店情况等话题时，主动使用工具获取数据来回答。
在分析数据时：
1. 先用 poi_get_brands 或 poi_get_stores 查看数据库已有数据
2. 如果数据库没有目标城市/品牌的数据，使用 poi_search 从高德地图搜索并保存（save_to_db=true）
3. 获取数据后，从地理分布、区域密度、竞品对比等维度进行分析
4. 如需评估某个具体位置，使用 poi_analyze_radius 分析周边半径内的门店分布
5. 给出具体的选址建议（推荐区域、理由、注意事项）
6. 当分析需要多个维度数据时（如同时需要竞品和周边设施），可以分步使用不同工具

你应该专业、准确、简洁地回答问题。回答时使用Markdown格式，善用表格、列表等结构化展示数据。
如果你不确定某个信息，请如实告知。回答时请使用中文。"""

# Token budget constants (approximate)
TOTAL_TOKEN_BUDGET = 16000
WARM_TOKEN_BUDGET = 2000
COLD_TOKEN_BUDGET = 1000
HISTORY_TOKEN_BUDGET = 10000

# ==================== 工具定义（OpenAI Function Calling 格式） ====================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "poi_search",
            "description": "通过高德地图API搜索指定城市的品牌门店或POI。可以搜索品牌（如肯德基、必胜客）或其他POI类型（如学校、医院）。搜索结果可选择保存到数据库。注意：搜索可能需要较长时间（30秒-2分钟），因为需要按区县逐一查询高德API。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "搜索关键词，如品牌名'肯德基'、'必胜客'，或POI类型关键词'小学'、'医院'"
                    },
                    "city": {
                        "type": "string",
                        "description": "目标城市，必须带'市'字，如'杭州市'、'温州市'、'上海市'、'南京市'"
                    },
                    "save_to_db": {
                        "type": "boolean",
                        "description": "是否将搜索结果保存到数据库，默认false。建议在需要后续分析时设为true",
                        "default": False
                    },
                    "poi_category": {
                        "type": "string",
                        "description": "POI类型：'brand'表示品牌门店搜索（默认），其他值如'小学'、'医院'表示特定POI类型搜索",
                        "default": "brand"
                    },
                    "max_pages": {
                        "type": "integer",
                        "description": "每个区县最大查询页数，默认50。增大可获取更完整数据但耗时更长。范围1-120",
                        "default": 50
                    }
                },
                "required": ["keyword", "city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_batch_search",
            "description": "批量搜索多个品牌在某个城市的门店，适合做竞品对比分析。每个品牌独立搜索，返回每个品牌的门店数量。",
            "parameters": {
                "type": "object",
                "properties": {
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "品牌关键词数组，如['肯德基', '麦当劳', '必胜客']"
                    },
                    "city": {
                        "type": "string",
                        "description": "目标城市，如'杭州市'"
                    },
                    "save_to_db": {
                        "type": "boolean",
                        "description": "是否保存到数据库",
                        "default": False
                    }
                },
                "required": ["keywords", "city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_get_brands",
            "description": "查看数据库中已有的品牌列表，包括每个品牌的门店数量、所在城市、最后更新时间等统计信息。用于了解数据库现有数据情况。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "按城市筛选，如'杭州市'。不传则返回所有城市的品牌数据"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_get_stores",
            "description": "查询数据库中已存储的门店详细数据，包括门店名称、地址、区域、经纬度等。支持按城市、品牌、类别筛选。返回区域分布统计和最多200条门店样本数据，可用于地理分布分析。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市筛选，如'温州市'"
                    },
                    "brand_name": {
                        "type": "string",
                        "description": "品牌筛选，支持逗号分隔多品牌，如'必胜客,达美乐'"
                    },
                    "category": {
                        "type": "string",
                        "description": "类别筛选，如'披萨类'、'炸鸡/汉堡'、'奶茶/咖啡'"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_get_poi_types",
            "description": "获取系统支持搜索的其他POI类型列表（非品牌），如幼儿园、小学、中学、大学、医院、诊所、购物中心、住宅区、地铁站、写字楼等。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_get_other_pois",
            "description": "查看数据库中已存储的非品牌POI（学校、医院、购物中心等）的统计信息，包括每种类型的数量。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "按城市筛选"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_export",
            "description": "获取门店数据的详细统计概要，包含按品牌、按区域的门店数量分布。可选按城市和品牌筛选。实际Excel文件下载需在前端操作。",
            "parameters": {
                "type": "object",
                "properties": {
                    "brands": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "要统计的品牌列表，不传则统计全部"
                    },
                    "city": {
                        "type": "string",
                        "description": "按城市筛选统计范围"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_get_city_list",
            "description": "获取系统支持的所有城市列表，按省份分组，每个城市包含其下辖区县信息。用于确认哪些城市可以进行搜索。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_delete_brand",
            "description": "从数据库中删除指定品牌的门店数据。可选限定城市范围。危险操作，删除后不可恢复。",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand_name": {
                        "type": "string",
                        "description": "要删除的品牌名称，如'肯德基'"
                    },
                    "city": {
                        "type": "string",
                        "description": "限定删除范围到某个城市。不传则删除该品牌在所有城市的数据"
                    }
                },
                "required": ["brand_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "poi_analyze_radius",
            "description": "以指定坐标为圆心，在指定半径范围内分析周边门店分布。可用于评估某个选址位置的竞品密度和周边设施情况。返回半径内各品牌/POI类型的数量和详细列表。",
            "parameters": {
                "type": "object",
                "properties": {
                    "longitude": {
                        "type": "number",
                        "description": "圆心经度，如120.153576"
                    },
                    "latitude": {
                        "type": "number",
                        "description": "圆心纬度，如30.287459"
                    },
                    "radius_meters": {
                        "type": "integer",
                        "description": "搜索半径（米），如1000表示1公里范围",
                        "default": 1000
                    },
                    "city": {
                        "type": "string",
                        "description": "限定搜索范围到某个城市（提高查询效率）"
                    },
                    "brand_filter": {
                        "type": "string",
                        "description": "只查看特定品牌，逗号分隔多品牌，如'必胜客,达美乐'。不传则返回所有品牌和POI"
                    }
                },
                "required": ["longitude", "latitude"]
            }
        }
    }
]

# 工具名称中文映射
TOOL_NAME_MAP = {
    'poi_search': '搜索门店',
    'poi_batch_search': '批量搜索品牌',
    'poi_get_brands': '查询品牌列表',
    'poi_get_stores': '查询门店数据',
    'poi_get_poi_types': '获取POI类型',
    'poi_get_other_pois': '查询其他POI统计',
    'poi_export': '门店数据统计',
    'poi_get_city_list': '获取支持城市列表',
    'poi_delete_brand': '删除品牌数据',
    'poi_analyze_radius': '周边半径分析',
}


# ==================== 工具执行函数 ====================

def execute_tool(tool_name, arguments):
    """执行工具调用，分发到对应的 POI 逻辑。"""
    try:
        args = json.loads(arguments) if isinstance(arguments, str) else arguments
        if tool_name == 'poi_search':
            return _tool_poi_search(args)
        elif tool_name == 'poi_batch_search':
            return _tool_poi_batch_search(args)
        elif tool_name == 'poi_get_brands':
            return _tool_poi_get_brands(args)
        elif tool_name == 'poi_get_stores':
            return _tool_poi_get_stores(args)
        elif tool_name == 'poi_get_poi_types':
            return _tool_poi_get_poi_types(args)
        elif tool_name == 'poi_get_other_pois':
            return _tool_poi_get_other_pois(args)
        elif tool_name == 'poi_export':
            return _tool_poi_export(args)
        elif tool_name == 'poi_get_city_list':
            return _tool_poi_get_city_list(args)
        elif tool_name == 'poi_delete_brand':
            return _tool_poi_delete_brand(args)
        elif tool_name == 'poi_analyze_radius':
            return _tool_poi_analyze_radius(args)
        else:
            return {"error": f"未知工具: {tool_name}"}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"工具执行失败: {str(e)}"}


def _tool_poi_search(args):
    from app.api.poi import (fetch_stores_from_amap_by_districts, fetch_stores_from_amap,
                              remove_duplicates, match_brand_from_store_name, get_brand_category,
                              CITY_DISTRICTS)
    keyword = args.get('keyword', '')
    city = args.get('city', '')
    save_to_db = args.get('save_to_db', False)
    poi_category = args.get('poi_category', 'brand')
    max_pages = min(max(int(args.get('max_pages', 50)), 1), 120)  # 限制在1-120之间
    if not city:
        return {"error": "请提供城市"}
    if not keyword:
        return {"error": "请提供搜索关键词"}
    if city in CITY_DISTRICTS:
        stores, total = fetch_stores_from_amap_by_districts(keyword=keyword, city=city, max_pages=max_pages)
    else:
        stores, total = fetch_stores_from_amap(keyword=keyword, city=city, max_pages=max_pages)
    unique_stores = remove_duplicates(stores)
    saved_count = 0
    if save_to_db and unique_stores:
        for store in unique_stores:
            try:
                existing = POIStore.query.filter_by(poi_id=store['poi_id']).first()
                if poi_category == 'brand':
                    matched = match_brand_from_store_name(store['store_name'])
                    if not matched:
                        keyword_matched = match_brand_from_store_name(keyword)
                        store_name_lower = store['store_name'].lower() if store['store_name'] else ''
                        if keyword.lower() in store_name_lower and keyword_matched:
                            matched = keyword_matched
                    if not matched:
                        continue
                    brand_name = matched
                    category = get_brand_category(brand_name)
                else:
                    brand_name = poi_category
                    category = poi_category
                if existing:
                    for key, value in store.items():
                        setattr(existing, key, value)
                    existing.brand_name = brand_name
                    existing.category = category
                else:
                    poi_store = POIStore(
                        poi_id=store['poi_id'], brand_name=brand_name,
                        store_name=store['store_name'], city=store['city'],
                        province=store['province'], district=store['district'],
                        address=store['address'], full_address=store['full_address'],
                        phone=store['phone'], longitude=store['longitude'],
                        latitude=store['latitude'], poi_type=store['poi_type'],
                        category=category)
                    db.session.add(poi_store)
                saved_count += 1
            except Exception:
                continue
        db.session.commit()
    store_summary = []
    for s in unique_stores[:30]:
        store_summary.append({
            'store_name': s.get('store_name', ''),
            'district': s.get('district', ''),
            'address': s.get('address', ''),
        })
    result = {"total_found": len(unique_stores), "api_total": total,
              "saved_to_db": saved_count if save_to_db else "未保存", "sample_stores": store_summary}
    if len(unique_stores) > 30:
        result["note"] = f"仅展示前30条，共{len(unique_stores)}条"
    return result


def _tool_poi_batch_search(args):
    from app.api.poi import fetch_stores_from_amap, remove_duplicates, match_brand_from_store_name, get_brand_category
    keywords = args.get('keywords', [])
    city = args.get('city', '')
    save_to_db = args.get('save_to_db', False)
    if not keywords or not city:
        return {"error": "请提供关键词列表和城市"}
    results = {}
    for kw in keywords:
        stores, total = fetch_stores_from_amap(kw, city, max_pages=10)
        unique = remove_duplicates(stores)
        if save_to_db:
            for store in unique:
                try:
                    matched = match_brand_from_store_name(store['store_name'])
                    if not matched:
                        kw_matched = match_brand_from_store_name(kw)
                        if kw.lower() in (store['store_name'] or '').lower() and kw_matched:
                            matched = kw_matched
                    if not matched:
                        continue
                    existing = POIStore.query.filter_by(poi_id=store['poi_id']).first()
                    if not existing:
                        poi_store = POIStore(
                            poi_id=store['poi_id'], brand_name=matched,
                            store_name=store['store_name'], city=store['city'],
                            province=store['province'], district=store['district'],
                            address=store['address'], full_address=store['full_address'],
                            phone=store['phone'], longitude=store['longitude'],
                            latitude=store['latitude'], poi_type=store['poi_type'],
                            category=get_brand_category(matched))
                        db.session.add(poi_store)
                except Exception:
                    continue
        results[kw] = {"count": len(unique)}
        time.sleep(0.5)
    if save_to_db:
        db.session.commit()
    return {"city": city, "brands": results, "saved_to_db": save_to_db}


def _tool_poi_get_brands(args):
    city = args.get('city')
    query = db.session.query(
        POIStore.brand_name, POIStore.category,
        db.func.count(POIStore.id).label('store_count'),
        db.func.max(POIStore.updated_at).label('last_updated')
    ).group_by(POIStore.brand_name, POIStore.category)
    if city:
        query = query.filter(POIStore.city == city)
    results = query.all()
    brands = []
    for row in results:
        cities_q = db.session.query(POIStore.city).filter(
            POIStore.brand_name == row.brand_name).distinct()
        if city:
            cities_q = cities_q.filter(POIStore.city == city)
        cities = [c[0] for c in cities_q.all()]
        brands.append({
            'brand_name': row.brand_name, 'category': row.category,
            'store_count': row.store_count, 'cities': cities,
            'last_updated': row.last_updated.isoformat() if row.last_updated else None})
    brands.sort(key=lambda x: x['store_count'], reverse=True)
    return {"brands": brands, "total": len(brands)}


def _tool_poi_get_stores(args):
    city = args.get('city')
    brand_name = args.get('brand_name')
    category = args.get('category')
    query = POIStore.query
    if city:
        query = query.filter(POIStore.city == city)
    if brand_name:
        brands = [b.strip() for b in brand_name.split(',')]
        query = query.filter(POIStore.brand_name.in_(brands))
    if category:
        query = query.filter(POIStore.category == category)
    stores = query.all()
    district_stats = {}
    for s in stores:
        d = s.district or '未知'
        district_stats[d] = district_stats.get(d, 0) + 1
    store_list = []
    for s in stores[:200]:
        store_list.append({
            'brand_name': s.brand_name, 'store_name': s.store_name,
            'district': s.district, 'address': s.address,
            'longitude': float(s.longitude) if s.longitude else None,
            'latitude': float(s.latitude) if s.latitude else None})
    result = {"total": len(stores), "district_distribution": district_stats, "sample_stores": store_list}
    if len(stores) > 200:
        result["note"] = f"仅展示前200条，共{len(stores)}条"
    return result


def _tool_poi_get_poi_types(args):
    from app.api.poi import OTHER_POI_TYPES
    types_list = []
    for type_name, config in OTHER_POI_TYPES.items():
        info = {'type': type_name, 'icon': config['icon']}
        if 'types' in config:
            info['amap_codes'] = config['types']
        else:
            info['keywords'] = config.get('keywords', [])
        types_list.append(info)
    return {"poi_types": types_list}


def _tool_poi_get_other_pois(args):
    from app.api.poi import OTHER_POI_TYPES
    city = args.get('city')
    other_types = list(OTHER_POI_TYPES.keys())
    query = db.session.query(
        POIStore.category,
        db.func.count(POIStore.id).label('store_count')
    ).filter(POIStore.category.in_(other_types)).group_by(POIStore.category)
    if city:
        query = query.filter(POIStore.city == city)
    results = query.all()
    poi_types = [{'type': row.category, 'count': row.store_count} for row in results]
    poi_types.sort(key=lambda x: x['count'], reverse=True)
    return {"poi_types": poi_types, "total": len(poi_types)}


def _tool_poi_export(args):
    brands = args.get('brands', [])
    city = args.get('city')
    query = POIStore.query
    if brands:
        query = query.filter(POIStore.brand_name.in_(brands))
    if city:
        query = query.filter(POIStore.city == city)
    total_count = query.count()

    # 按品牌统计
    brand_stats = db.session.query(
        POIStore.brand_name, POIStore.category,
        db.func.count(POIStore.id).label('count')
    )
    if brands:
        brand_stats = brand_stats.filter(POIStore.brand_name.in_(brands))
    if city:
        brand_stats = brand_stats.filter(POIStore.city == city)
    brand_stats = brand_stats.group_by(POIStore.brand_name, POIStore.category).all()

    # 按区域统计
    district_stats = db.session.query(
        POIStore.city, POIStore.district,
        db.func.count(POIStore.id).label('count')
    )
    if brands:
        district_stats = district_stats.filter(POIStore.brand_name.in_(brands))
    if city:
        district_stats = district_stats.filter(POIStore.city == city)
    district_stats = district_stats.group_by(POIStore.city, POIStore.district).all()

    brand_summary = [{'brand': r.brand_name, 'category': r.category, 'count': r.count} for r in brand_stats]
    brand_summary.sort(key=lambda x: x['count'], reverse=True)

    district_summary = {}
    for r in district_stats:
        c = r.city or '未知'
        if c not in district_summary:
            district_summary[c] = {}
        district_summary[c][r.district or '未知'] = r.count

    return {
        "total_count": total_count,
        "filters": {"brands": brands if brands else "全部", "city": city or "全部"},
        "brand_breakdown": brand_summary,
        "district_breakdown": district_summary,
        "note": "如需下载Excel文件，请前往外卖运营后台 > 选址工具页面操作"
    }


def _tool_poi_get_city_list(args):
    """获取支持的城市列表，按省份分组"""
    from app.api.poi import CITY_DISTRICTS
    provinces = {
        '浙江省': [],
        '上海市': [],
        '江苏省': [],
    }
    for city_name, districts in CITY_DISTRICTS.items():
        district_names = [d[0] for d in districts]
        city_info = {'city': city_name, 'districts': district_names, 'district_count': len(districts)}
        if city_name == '上海市':
            provinces['上海市'].append(city_info)
        elif city_name.startswith(('杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水')):
            provinces['浙江省'].append(city_info)
        else:
            provinces['江苏省'].append(city_info)
    return {"provinces": provinces, "total_cities": len(CITY_DISTRICTS)}


def _tool_poi_delete_brand(args):
    """删除指定品牌的门店数据"""
    brand_name = args.get('brand_name', '').strip()
    city = args.get('city')
    if not brand_name:
        return {"error": "请提供品牌名称"}

    query = POIStore.query.filter(POIStore.brand_name == brand_name)
    if city:
        query = query.filter(POIStore.city == city)

    count = query.count()
    if count == 0:
        return {"message": f"数据库中没有找到品牌 '{brand_name}'" + (f" 在 {city}" if city else "") + " 的数据",
                "deleted_count": 0}

    query.delete(synchronize_session='fetch')
    db.session.commit()
    return {
        "message": f"已成功删除品牌 '{brand_name}'" + (f" 在 {city}" if city else "") + f" 的 {count} 条门店数据",
        "deleted_count": count,
        "brand": brand_name,
        "city": city or "全部城市"
    }


def _haversine_distance(lon1, lat1, lon2, lat2):
    """计算两个经纬度坐标之间的距离（米），使用Haversine公式"""
    R = 6371000  # 地球半径，单位：米
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _tool_poi_analyze_radius(args):
    """以指定坐标为圆心，分析半径范围内的门店分布"""
    center_lon = args.get('longitude')
    center_lat = args.get('latitude')
    radius = args.get('radius_meters', 1000)
    city = args.get('city')
    brand_filter = args.get('brand_filter')

    if center_lon is None or center_lat is None:
        return {"error": "请提供经纬度坐标"}

    # 粗筛：先按经纬度范围缩小查询范围（约1度≈111公里）
    delta = radius / 111000.0 * 1.5  # 留1.5倍余量
    query = POIStore.query.filter(
        POIStore.longitude.between(center_lon - delta, center_lon + delta),
        POIStore.latitude.between(center_lat - delta, center_lat + delta)
    )
    if city:
        query = query.filter(POIStore.city == city)
    if brand_filter:
        brands = [b.strip() for b in brand_filter.split(',')]
        query = query.filter(POIStore.brand_name.in_(brands))

    candidates = query.all()

    # 精筛：用Haversine公式计算精确距离
    nearby = []
    for s in candidates:
        if s.longitude and s.latitude:
            dist = _haversine_distance(center_lon, center_lat, float(s.longitude), float(s.latitude))
            if dist <= radius:
                nearby.append({
                    'brand_name': s.brand_name,
                    'store_name': s.store_name,
                    'category': s.category,
                    'district': s.district,
                    'address': s.address,
                    'distance_meters': round(dist),
                    'longitude': float(s.longitude),
                    'latitude': float(s.latitude),
                })

    nearby.sort(key=lambda x: x['distance_meters'])

    # 按品牌/类别统计
    brand_count = {}
    category_count = {}
    for s in nearby:
        bn = s['brand_name'] or '未知'
        brand_count[bn] = brand_count.get(bn, 0) + 1
        cat = s['category'] or '未知'
        category_count[cat] = category_count.get(cat, 0) + 1

    return {
        "center": {"longitude": center_lon, "latitude": center_lat},
        "radius_meters": radius,
        "total_found": len(nearby),
        "brand_distribution": brand_count,
        "category_distribution": category_count,
        "stores": nearby[:100],  # 最多返回100条
        "note": f"以({center_lon}, {center_lat})为圆心，{radius}米半径内共找到{len(nearby)}个门店/POI" + (f"（仅展示前100条）" if len(nearby) > 100 else "")
    }


# ==================== 通用函数 ====================

def estimate_tokens(text):
    if not text:
        return 0
    cn_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    en_chars = len(text) - cn_chars
    return int(cn_chars * 1.5 + en_chars * 0.25)


def truncate_to_budget(entries, budget):
    result = []
    used = 0
    for entry in reversed(entries):
        tokens = estimate_tokens(entry.get('content', ''))
        if used + tokens > budget:
            break
        result.insert(0, entry)
        used += tokens
    return result


def assemble_context(user_id, conversation_id, user_message):
    messages = []
    system_parts = [SYSTEM_PROMPT]
    now = datetime.utcnow()

    warm_entries = MemoryEntry.query.filter(
        MemoryEntry.user_id == user_id, MemoryEntry.tier == 'warm',
        db.or_(MemoryEntry.expires_at.is_(None), MemoryEntry.expires_at > now)
    ).order_by(MemoryEntry.relevance_score.desc(), MemoryEntry.updated_at.desc()).all()

    expired_warm = MemoryEntry.query.filter(
        MemoryEntry.user_id == user_id, MemoryEntry.tier == 'warm',
        MemoryEntry.expires_at.isnot(None), MemoryEntry.expires_at <= now
    ).all()
    for entry in expired_warm:
        entry.tier = 'cold'
    if expired_warm:
        db.session.commit()

    if warm_entries:
        warm_text_parts = []
        warm_tokens = 0
        for entry in warm_entries:
            t = estimate_tokens(entry.content)
            if warm_tokens + t > WARM_TOKEN_BUDGET:
                break
            warm_text_parts.append(f"[{entry.category}] {entry.content}")
            warm_tokens += t
        if warm_text_parts:
            system_parts.append("\n\n--- 你记住的信息（近期）---\n" + "\n".join(warm_text_parts))

    if user_message:
        keywords = set()
        msg = user_message.replace('？', ' ').replace('。', ' ').replace('，', ' ').replace('！', ' ')
        for word in msg.split():
            if len(word) >= 2:
                keywords.add(word)
        cold_query = MemoryEntry.query.filter(MemoryEntry.user_id == user_id, MemoryEntry.tier == 'cold')
        cold_entries = []
        if keywords:
            for kw in list(keywords)[:5]:
                matches = cold_query.filter(MemoryEntry.content.like(f'%{kw}%')).all()
                for m in matches:
                    if m not in cold_entries:
                        cold_entries.append(m)
        if cold_entries:
            cold_text_parts = []
            cold_tokens = 0
            for entry in cold_entries:
                t = estimate_tokens(entry.content)
                if cold_tokens + t > COLD_TOKEN_BUDGET:
                    break
                cold_text_parts.append(f"[{entry.category}] {entry.content}")
                cold_tokens += t
            if cold_text_parts:
                system_parts.append("\n\n--- 你记住的信息（历史）---\n" + "\n".join(cold_text_parts))

    messages.append({'role': 'system', 'content': '\n'.join(system_parts)})

    if conversation_id:
        history = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at).all()
        history_dicts = [{'role': m.role, 'content': m.content} for m in history]
        history_dicts = truncate_to_budget(history_dicts, HISTORY_TOKEN_BUDGET)
        messages.extend(history_dicts)

    messages.append({'role': 'user', 'content': user_message})
    return messages


def call_deepseek_stream(messages, tools=None):
    """调用 DeepSeek API（流式），返回原始 response 对象用于 iter_lines"""
    payload = {
        'model': DEEPSEEK_MODEL,
        'messages': messages,
        'stream': True,
        'temperature': 0.7,
        'max_tokens': 4096,
    }
    if tools:
        payload['tools'] = tools

    resp = http_requests.post(
        DEEPSEEK_API_URL,
        headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=120,
        stream=True,
    )
    resp.raise_for_status()
    return resp


def call_deepseek_non_stream(messages, tools=None):
    """调用 DeepSeek API（非流式），返回解析后的结果"""
    payload = {
        'model': DEEPSEEK_MODEL,
        'messages': messages,
        'stream': False,
        'temperature': 0.7,
        'max_tokens': 4096,
    }
    if tools:
        payload['tools'] = tools

    resp = http_requests.post(
        DEEPSEEK_API_URL,
        headers={
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']


def _make_sse_response(generator_func):
    """创建 SSE 流式响应"""
    return Response(generator_func(), mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no',
                        'Access-Control-Allow-Origin': '*',
                    })


def _parse_stream_with_tools(resp):
    """
    解析 DeepSeek 流式响应，同时处理 content 和 tool_calls。
    Yields: ('content', text) 或在结束后返回 (full_content, tool_calls_list)
    这是一个生成器，yield content 片段，最终返回聚合结果。
    """
    full_content = ''
    tool_calls_accum = []

    for line in resp.iter_lines():
        if not line:
            continue
        line_str = line.decode('utf-8')
        if not line_str.startswith('data: '):
            continue
        json_str = line_str[6:]
        if json_str.strip() == '[DONE]':
            break
        try:
            chunk = json.loads(json_str)
            delta = chunk['choices'][0].get('delta', {})

            # Content chunk
            content = delta.get('content', '')
            if content:
                full_content += content
                yield ('content', content)

            # Tool calls (accumulate incrementally)
            if delta.get('tool_calls'):
                for tc in delta['tool_calls']:
                    idx = tc.get('index', 0)
                    while len(tool_calls_accum) <= idx:
                        tool_calls_accum.append({
                            'id': '', 'type': 'function',
                            'function': {'name': '', 'arguments': ''}
                        })
                    if tc.get('id'):
                        tool_calls_accum[idx]['id'] = tc['id']
                    if tc.get('function', {}).get('name'):
                        tool_calls_accum[idx]['function']['name'] += tc['function']['name']
                    if tc.get('function', {}).get('arguments'):
                        tool_calls_accum[idx]['function']['arguments'] += tc['function']['arguments']
        except json.JSONDecodeError:
            continue

    # 在生成器结束时，通过一个特殊的 yield 传回聚合结果
    yield ('_done', {'full_content': full_content, 'tool_calls': tool_calls_accum})


def _tool_calls_to_pending(tool_calls_accum):
    """将累积的 tool_calls 转换为前端可用的 pending 格式"""
    pending = []
    for tc in tool_calls_accum:
        name = tc['function']['name']
        try:
            args = json.loads(tc['function']['arguments'])
        except (json.JSONDecodeError, KeyError):
            args = {}
        pending.append({
            'id': tc['id'],
            'name': name,
            'name_cn': TOOL_NAME_MAP.get(name, name),
            'arguments': args,
        })
    return pending


# ==================== 会话 API ====================

@bp.route('/conversations', methods=['GET'])
@admin_required
def list_conversations(current_user):
    convs = ChatConversation.query.filter_by(
        user_id=current_user['user_id']
    ).order_by(ChatConversation.updated_at.desc()).all()
    return success_response([c.to_dict() for c in convs])


@bp.route('/conversations', methods=['POST'])
@admin_required
def create_conversation(current_user):
    try:
        data = request.get_json() or {}
        title = data.get('title', '新对话')
        conv = ChatConversation(user_id=current_user['user_id'], title=title)
        db.session.add(conv)
        db.session.commit()
        return success_response(conv.to_dict(), message='创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
@admin_required
def delete_conversation(current_user, conv_id):
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')
        db.session.delete(conv)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>/messages', methods=['GET'])
@admin_required
def get_messages(current_user, conv_id):
    conv = ChatConversation.query.get(conv_id)
    if not conv or conv.user_id != current_user['user_id']:
        return error_response('会话不存在')
    msgs = ChatMessage.query.filter_by(conversation_id=conv_id).order_by(ChatMessage.created_at).all()
    return success_response([m.to_dict() for m in msgs])


@bp.route('/conversations/<int:conv_id>/messages', methods=['POST'])
@admin_required
def send_message(current_user, conv_id):
    """发送消息 - 全部采用流式 SSE 返回（支持工具调用检测）"""
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')

        data = request.get_json()
        user_message = data.get('content', '').strip()
        if not user_message:
            return error_response('消息不能为空')

        # 保存用户消息
        user_msg = ChatMessage(conversation_id=conv_id, role='user', content=user_message)
        db.session.add(user_msg)
        db.session.commit()

        # 组装上下文
        assembled = assemble_context(current_user['user_id'], conv_id, user_message)
        app = current_app._get_current_object()

        def generate():
            with app.app_context():
                full_content = ''
                tool_calls_accum = []

                try:
                    resp = call_deepseek_stream(assembled, tools=TOOLS)

                    for event_type, event_data in _parse_stream_with_tools(resp):
                        if event_type == 'content':
                            yield f"data: {json.dumps({'content': event_data})}\n\n"
                        elif event_type == '_done':
                            full_content = event_data['full_content']
                            tool_calls_accum = event_data['tool_calls']
                except Exception as e:
                    traceback.print_exc()
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                # 流结束后处理
                if tool_calls_accum:
                    # AI 想调用工具 -> 发送 tool_calls 事件给前端
                    # 如果在调用工具之前AI已经输出了一些文字，保存到数据库并通知前端
                    if full_content:
                        try:
                            assistant_msg = ChatMessage(
                                conversation_id=conv_id, role='assistant', content=full_content)
                            db.session.add(assistant_msg)
                            db.session.commit()
                        except Exception as e:
                            traceback.print_exc()
                    pending = _tool_calls_to_pending(tool_calls_accum)
                    yield f"data: {json.dumps({'type': 'tool_calls', 'tool_calls': pending, 'pre_content': full_content})}\n\n"
                elif full_content:
                    # 正常文本回复 -> 保存到数据库
                    try:
                        assistant_msg = ChatMessage(
                            conversation_id=conv_id, role='assistant', content=full_content)
                        db.session.add(assistant_msg)
                        c = db.session.get(ChatConversation, conv_id)
                        if c:
                            c.updated_at = datetime.utcnow()
                            msg_count = ChatMessage.query.filter_by(conversation_id=conv_id).count()
                            if msg_count <= 2:
                                c.title = user_message[:50]
                        db.session.commit()
                    except Exception as e:
                        traceback.print_exc()

                yield "data: [DONE]\n\n"

        return _make_sse_response(generate)

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return error_response(f'发送消息失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>/execute-tools', methods=['POST'])
@admin_required
def execute_tools_endpoint(current_user, conv_id):
    """
    用户确认后执行工具调用 - 全部采用流式 SSE 返回。
    流程：执行工具 → 发送状态更新 → DeepSeek 流式回复（可能再次触发工具调用）
    """
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')

        data = request.get_json()
        tool_calls_data = data.get('tool_calls', [])
        prior_tool_context = data.get('prior_tool_context', [])  # 前几轮工具调用的上下文
        if not tool_calls_data:
            return error_response('没有要执行的工具')

        app = current_app._get_current_object()

        # 重建对话上下文
        msgs = ChatMessage.query.filter_by(conversation_id=conv_id).order_by(ChatMessage.created_at).all()
        assembled = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        history_dicts = [{'role': m.role, 'content': m.content} for m in msgs]
        history_dicts = truncate_to_budget(history_dicts, HISTORY_TOKEN_BUDGET)
        assembled.extend(history_dicts)

        # 追加之前轮次的工具调用上下文（多轮时保留历史）
        for ctx_msg in prior_tool_context:
            assembled.append(ctx_msg)

        # 构建当前轮的 assistant tool_calls 消息
        assistant_tool_msg = {
            'role': 'assistant',
            'content': None,
            'tool_calls': [{
                'id': tc['id'], 'type': 'function',
                'function': {
                    'name': tc['name'],
                    'arguments': json.dumps(tc['arguments'], ensure_ascii=False)
                }
            } for tc in tool_calls_data]
        }
        assembled.append(assistant_tool_msg)

        def generate():
            with app.app_context():
                tool_results_strs = []  # 收集工具结果，用于构建上下文传递

                # Step 1: 逐个执行工具，发送状态更新
                for tc in tool_calls_data:
                    tool_name = tc['name']
                    tool_args = tc['arguments']
                    tool_id = tc['id']
                    name_cn = TOOL_NAME_MAP.get(tool_name, tool_name)

                    yield f"data: {json.dumps({'type': 'tool_status', 'message': f'⏳ 正在执行: {name_cn}...'})}\n\n"

                    result = execute_tool(tool_name, tool_args)
                    result_str = json.dumps(result, ensure_ascii=False)
                    tool_results_strs.append(result_str)
                    print(f"🔧 工具 {tool_name} 结果: {result_str[:200]}...")

                    assembled.append({
                        'role': 'tool',
                        'tool_call_id': tool_id,
                        'content': result_str,
                    })

                    yield f"data: {json.dumps({'type': 'tool_status', 'message': f'✅ {name_cn} 执行完成'})}\n\n"

                yield f"data: {json.dumps({'type': 'tool_status', 'message': '🤔 AI 正在分析工具结果...'})}\n\n"

                # Step 2: 调用 DeepSeek 流式获取基于工具结果的回复
                full_content = ''
                tool_calls_accum = []

                try:
                    resp = call_deepseek_stream(assembled, tools=TOOLS)

                    for event_type, event_data in _parse_stream_with_tools(resp):
                        if event_type == 'content':
                            yield f"data: {json.dumps({'content': event_data})}\n\n"
                        elif event_type == '_done':
                            full_content = event_data['full_content']
                            tool_calls_accum = event_data['tool_calls']
                except Exception as e:
                    traceback.print_exc()
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                if tool_calls_accum:
                    # AI 想要再次调用工具（多轮）
                    # 如果AI在调用工具之前已经输出了文字，保存到数据库
                    if full_content:
                        try:
                            assistant_msg = ChatMessage(
                                conversation_id=conv_id, role='assistant', content=full_content)
                            db.session.add(assistant_msg)
                            db.session.commit()
                        except Exception as e:
                            traceback.print_exc()
                    # 构建当前轮的上下文记录，传给前端保存
                    current_round_ctx = [assistant_tool_msg]
                    for i, tc in enumerate(tool_calls_data):
                        current_round_ctx.append({
                            'role': 'tool',
                            'tool_call_id': tc['id'],
                            'content': tool_results_strs[i],
                        })
                    full_tool_context = prior_tool_context + current_round_ctx

                    pending = _tool_calls_to_pending(tool_calls_accum)
                    yield f"data: {json.dumps({'type': 'tool_calls', 'tool_calls': pending, 'tool_context': full_tool_context, 'pre_content': full_content})}\n\n"
                elif full_content:
                    # 最终回复 -> 保存
                    try:
                        assistant_msg = ChatMessage(
                            conversation_id=conv_id, role='assistant', content=full_content)
                        db.session.add(assistant_msg)
                        c = db.session.get(ChatConversation, conv_id)
                        if c:
                            c.updated_at = datetime.utcnow()
                        db.session.commit()
                    except Exception as e:
                        traceback.print_exc()

                yield "data: [DONE]\n\n"

        return _make_sse_response(generate)

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return error_response(f'工具执行失败: {str(e)}')


# ==================== 记忆 API ====================

@bp.route('/memory', methods=['GET'])
@admin_required
def list_memory(current_user):
    tier = request.args.get('tier', '')
    query = MemoryEntry.query.filter_by(user_id=current_user['user_id'])
    if tier:
        query = query.filter_by(tier=tier)
    entries = query.order_by(MemoryEntry.updated_at.desc()).all()
    return success_response([e.to_dict() for e in entries])


@bp.route('/memory', methods=['POST'])
@admin_required
def add_memory(current_user):
    try:
        data = request.get_json()
        tier = data.get('tier', 'warm')
        category = data.get('category', 'fact')
        content = data.get('content', '').strip()
        if not content:
            return error_response('内容不能为空')
        expires_at = None
        if tier == 'warm':
            expires_at = datetime.utcnow() + timedelta(days=7)
        entry = MemoryEntry(
            user_id=current_user['user_id'], tier=tier, category=category,
            content=content, expires_at=expires_at)
        db.session.add(entry)
        db.session.commit()
        return success_response(entry.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加失败: {str(e)}')


@bp.route('/memory/<int:entry_id>', methods=['DELETE'])
@admin_required
def delete_memory(current_user, entry_id):
    try:
        entry = MemoryEntry.query.get(entry_id)
        if not entry or entry.user_id != current_user['user_id']:
            return error_response('记忆条目不存在')
        db.session.delete(entry)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


@bp.route('/memory/summarize/<int:conv_id>', methods=['POST'])
@admin_required
def summarize_conversation(current_user, conv_id):
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')
        msgs = ChatMessage.query.filter_by(conversation_id=conv_id).order_by(ChatMessage.created_at).all()
        if not msgs:
            return error_response('会话没有消息')
        summary_messages = [
            {'role': 'system', 'content': '请将以下对话内容总结为3-5条关键信息点，每条一行，格式为"- 关键信息"。只输出总结，不需要其他内容。'},
            {'role': 'user', 'content': '\n'.join([f'{m.role}: {m.content}' for m in msgs[-20:]])}
        ]
        msg = call_deepseek_non_stream(summary_messages)
        summary = msg.get('content', '')
        entry = MemoryEntry(
            user_id=current_user['user_id'], tier='cold', category='summary',
            content=f"[会话总结: {conv.title}]\n{summary}",
            source_conversation_id=conv_id)
        db.session.add(entry)
        db.session.commit()
        return success_response(entry.to_dict(), message='总结成功')
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return error_response(f'总结失败: {str(e)}')
