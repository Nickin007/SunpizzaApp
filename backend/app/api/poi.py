"""
POI门店搜索API
集成高德地图POI搜索功能，支持门店数据抓取、存储和导出
"""
from flask import Blueprint, request, jsonify, send_file
from app.utils.auth import token_required
from app import db
from app.models import POIStore
import requests
import time
from io import BytesIO
from datetime import datetime
import pandas as pd

bp = Blueprint('poi', __name__, url_prefix='/api/poi')

# 高德地图API配置
AMAP_API_KEY = '03a638e9a905bb792a66d2bddc1f4ea0'
AMAP_BASE_URL = 'https://restapi.amap.com/v3/place/text'

# 城市区县配置（用于分批查询，避免触碰高德API单次查询上限）
# 格式：城市名 -> [(区县名, adcode), ...]
# adcode是行政区划代码，高德API能精确识别
CITY_DISTRICTS = {
    # ============ 浙江省（11个地级市）============
    '杭州市': [
        ('上城区', '330102'),
        ('拱墅区', '330105'),
        ('西湖区', '330106'),
        ('滨江区', '330108'),
        ('萧山区', '330109'),
        ('余杭区', '330110'),
        ('临平区', '330113'),
        ('钱塘区', '330114'),
        ('富阳区', '330111'),
        ('临安区', '330112'),
        ('桐庐县', '330122'),
        ('淳安县', '330127'),
        ('建德市', '330182'),
    ],
    '宁波市': [
        ('海曙区', '330203'),
        ('江北区', '330205'),
        ('北仑区', '330206'),
        ('镇海区', '330211'),
        ('鄞州区', '330212'),
        ('奉化区', '330213'),
        ('象山县', '330225'),
        ('宁海县', '330226'),
        ('余姚市', '330281'),
        ('慈溪市', '330282'),
    ],
    '温州市': [
        ('鹿城区', '330302'),
        ('龙湾区', '330303'),
        ('瓯海区', '330304'),
        ('洞头区', '330305'),
        ('永嘉县', '330324'),
        ('平阳县', '330326'),
        ('苍南县', '330327'),
        ('文成县', '330328'),
        ('泰顺县', '330329'),
        ('瑞安市', '330381'),
        ('乐清市', '330382'),
        ('龙港市', '330383'),
    ],
    '嘉兴市': [
        ('南湖区', '330402'),
        ('秀洲区', '330411'),
        ('嘉善县', '330421'),
        ('海盐县', '330424'),
        ('海宁市', '330481'),
        ('平湖市', '330482'),
        ('桐乡市', '330483'),
    ],
    '湖州市': [
        ('吴兴区', '330502'),
        ('南浔区', '330503'),
        ('德清县', '330521'),
        ('长兴县', '330522'),
        ('安吉县', '330523'),
    ],
    '绍兴市': [
        ('越城区', '330602'),
        ('柯桥区', '330603'),
        ('上虞区', '330604'),
        ('新昌县', '330624'),
        ('诸暨市', '330681'),
        ('嵊州市', '330683'),
    ],
    '金华市': [
        ('婺城区', '330702'),
        ('金东区', '330703'),
        ('武义县', '330723'),
        ('浦江县', '330726'),
        ('磐安县', '330727'),
        ('兰溪市', '330781'),
        ('义乌市', '330782'),
        ('东阳市', '330783'),
        ('永康市', '330784'),
    ],
    '衢州市': [
        ('柯城区', '330802'),
        ('衢江区', '330803'),
        ('常山县', '330822'),
        ('开化县', '330824'),
        ('龙游县', '330825'),
        ('江山市', '330881'),
    ],
    '舟山市': [
        ('定海区', '330902'),
        ('普陀区', '330903'),
        ('岱山县', '330921'),
        ('嵊泗县', '330922'),
    ],
    '台州市': [
        ('椒江区', '331002'),
        ('黄岩区', '331003'),
        ('路桥区', '331004'),
        ('三门县', '331022'),
        ('天台县', '331023'),
        ('仙居县', '331024'),
        ('温岭市', '331081'),
        ('临海市', '331082'),
        ('玉环市', '331083'),
    ],
    '丽水市': [
        ('莲都区', '331102'),
        ('青田县', '331121'),
        ('缙云县', '331122'),
        ('遂昌县', '331123'),
        ('松阳县', '331124'),
        ('云和县', '331125'),
        ('庆元县', '331126'),
        ('景宁畲族自治县', '331127'),
        ('龙泉市', '331181'),
    ],
    
    # ============ 上海市（直辖市）============
    '上海市': [
        ('黄浦区', '310101'),
        ('徐汇区', '310104'),
        ('长宁区', '310105'),
        ('静安区', '310106'),
        ('普陀区', '310107'),
        ('虹口区', '310109'),
        ('杨浦区', '310110'),
        ('闵行区', '310112'),
        ('宝山区', '310113'),
        ('嘉定区', '310114'),
        ('浦东新区', '310115'),
        ('金山区', '310116'),
        ('松江区', '310117'),
        ('青浦区', '310118'),
        ('奉贤区', '310120'),
        ('崇明区', '310151'),
    ],
    
    # ============ 江苏省（13个地级市）============
    '南京市': [
        ('玄武区', '320102'),
        ('秦淮区', '320104'),
        ('建邺区', '320105'),
        ('鼓楼区', '320106'),
        ('浦口区', '320111'),
        ('栖霞区', '320113'),
        ('雨花台区', '320114'),
        ('江宁区', '320115'),
        ('六合区', '320116'),
        ('溧水区', '320117'),
        ('高淳区', '320118'),
    ],
    '无锡市': [
        ('锡山区', '320205'),
        ('惠山区', '320206'),
        ('滨湖区', '320211'),
        ('梁溪区', '320213'),
        ('新吴区', '320214'),
        ('江阴市', '320281'),
        ('宜兴市', '320282'),
    ],
    '徐州市': [
        ('鼓楼区', '320302'),
        ('云龙区', '320303'),
        ('贾汪区', '320305'),
        ('泉山区', '320311'),
        ('铜山区', '320312'),
        ('丰县', '320321'),
        ('沛县', '320322'),
        ('睢宁县', '320324'),
        ('新沂市', '320381'),
        ('邳州市', '320382'),
    ],
    '常州市': [
        ('天宁区', '320402'),
        ('钟楼区', '320404'),
        ('新北区', '320411'),
        ('武进区', '320412'),
        ('金坛区', '320413'),
        ('溧阳市', '320481'),
    ],
    '苏州市': [
        ('虎丘区', '320505'),
        ('吴中区', '320506'),
        ('相城区', '320507'),
        ('姑苏区', '320508'),
        ('吴江区', '320509'),
        ('苏州工业园区', '320571'),
        ('常熟市', '320581'),
        ('张家港市', '320582'),
        ('昆山市', '320583'),
        ('太仓市', '320585'),
    ],
    '南通市': [
        ('崇川区', '320602'),
        ('通州区', '320612'),
        ('海门区', '320614'),
        ('如东县', '320623'),
        ('启东市', '320681'),
        ('如皋市', '320682'),
        ('海安市', '320685'),
    ],
    '连云港市': [
        ('连云区', '320703'),
        ('海州区', '320706'),
        ('赣榆区', '320707'),
        ('东海县', '320722'),
        ('灌云县', '320723'),
        ('灌南县', '320724'),
    ],
    '淮安市': [
        ('淮安区', '320803'),
        ('淮阴区', '320804'),
        ('清江浦区', '320812'),
        ('洪泽区', '320813'),
        ('涟水县', '320826'),
        ('盱眙县', '320830'),
        ('金湖县', '320831'),
    ],
    '盐城市': [
        ('亭湖区', '320902'),
        ('盐都区', '320903'),
        ('大丰区', '320904'),
        ('响水县', '320921'),
        ('滨海县', '320922'),
        ('阜宁县', '320923'),
        ('射阳县', '320924'),
        ('建湖县', '320925'),
        ('东台市', '320981'),
    ],
    '扬州市': [
        ('广陵区', '321002'),
        ('邗江区', '321003'),
        ('江都区', '321012'),
        ('宝应县', '321023'),
        ('仪征市', '321081'),
        ('高邮市', '321084'),
    ],
    '镇江市': [
        ('京口区', '321102'),
        ('润州区', '321111'),
        ('丹徒区', '321112'),
        ('丹阳市', '321181'),
        ('扬中市', '321182'),
        ('句容市', '321183'),
    ],
    '泰州市': [
        ('海陵区', '321202'),
        ('高港区', '321203'),
        ('姜堰区', '321204'),
        ('兴化市', '321281'),
        ('靖江市', '321282'),
        ('泰兴市', '321283'),
    ],
    '宿迁市': [
        ('宿城区', '321302'),
        ('宿豫区', '321311'),
        ('沭阳县', '321322'),
        ('泗阳县', '321323'),
        ('泗洪县', '321324'),
    ],
}

# 品牌分类配置
BRAND_CATEGORIES = {
    '披萨类': ['必胜客', '尊宝', '达美乐', '菲滋意式餐厅', '芝根芝底', 
               '披萨速递', '至尊比萨', '三只熊披萨', '比格比萨', '玛格丽塔',
               '麦翁掌上披萨', '棒约翰', '洁妹披萨', '乐凯撒', '慕玛披萨', '罗嘟嘟', '圣比萨'],
    '炸鸡/汉堡': ['肯德基', '麦当劳', '塔斯汀', '华莱士', 'KFC'],
    '奶茶/咖啡': ['瑞幸咖啡', '古茗', '霸王茶姬', '茶百道', '沪上阿姨', '一点点']
}

# 其他POI类型配置（细粒度）
OTHER_POI_TYPES = {
    # 教育类 - 细分
    '幼儿园': {
        'keywords': ['幼儿园', '托儿所'],
        'icon': '🧒',
        'color': '#ffc53d'
    },
    '小学': {
        'keywords': ['小学'],
        'icon': '🎒',
        'color': '#40a9ff'
    },
    '中学': {
        'keywords': ['中学', '初中', '高中'],
        'icon': '📖',
        'color': '#1890ff'
    },
    '大学': {
        'keywords': ['大学', '学院', '高等专科'],
        'icon': '🎓',
        'color': '#2f54eb'
    },
    
    # 医疗类 - 细分
    '医院': {
        'keywords': ['医院', '人民医院', '中心医院'],
        'icon': '🏥',
        'color': '#52c41a'
    },
    '诊所': {
        'keywords': ['诊所', '门诊', '卫生院', '社区医院'],
        'icon': '💊',
        'color': '#73d13d'
    },
    
    # 商业类
    '购物中心': {
        'keywords': ['购物中心', '商场', '百货', 'mall', '广场'],
        'icon': '🏬',
        'color': '#fa8c16'
    },
    
    # 居住类 - 使用高德官方POI分类编码
    '住宅区': {
        'types': ['120000', '120203', '120300', '120301', '120302', '120303', '120304'],  # 高德官方住宅区全部编码
        'icon': '🏘️',
        'color': '#722ed1'
    },
    
    # 交通类
    '地铁站': {
        'keywords': ['地铁站'],
        'icon': '🚇',
        'color': '#13c2c2'
    },
    
    # 办公类
    '写字楼': {
        'keywords': ['写字楼', '商务楼', '办公楼', '大厦'],
        'icon': '🏢',
        'color': '#2f54eb'
    }
}


def get_brand_category(brand_name):
    """根据品牌名获取类别"""
    for category, brands in BRAND_CATEGORIES.items():
        if brand_name in brands:
            return category
    return '其他'


def match_brand_from_store_name(store_name):
    """
    从门店名称中匹配已配置的品牌
    
    参数:
        store_name: 门店名称，如 "luckin coffee 瑞幸咖啡（临平运河店）"
    
    返回:
        匹配到的品牌名，如 "瑞幸咖啡"，如果未匹配到则返回 None
    """
    if not store_name:
        return None
    
    store_name_lower = store_name.lower()
    
    # 遍历所有已配置的品牌
    for category, brands in BRAND_CATEGORIES.items():
        for brand in brands:
            # 检查门店名称中是否包含品牌名（不区分大小写）
            if brand.lower() in store_name_lower:
                return brand
            # 同时检查原始大小写
            if brand in store_name:
                return brand
    
    return None


def fetch_stores_from_amap_by_districts(keyword=None, city='', max_pages=10, types=None):
    """
    按区县分批查询POI（避免单个城市查询触碰高德API上限）
    
    参数:
        keyword: 搜索关键词
        city: 城市名称（如"温州市"）
        max_pages: 每个区县的最大查询页数（注意：这是单个区县的上限，不是总上限）
        types: 高德POI分类编码（如 "120000|120203|120300"）
    
    返回:
        合并后的门店信息列表和总数
    """
    # 检查该城市是否配置了区县列表
    if city in CITY_DISTRICTS:
        districts = CITY_DISTRICTS[city]
        # 每个区县单独上限2000页（50000条）
        district_max_pages = 2000
        
        # 🔥 关键优化：将types拆分成单个type分别查询，突破225条限制
        types_list = []
        if types:
            types_list = types.split('|')
            print(f"🔥 检测到组合types，将拆分为 {len(types_list)} 个单独type查询")
            print(f"   Types: {types_list}")
        
        print(f"🌍 城市 {city} 配置了 {len(districts)} 个区县，将分批查询")
        if types_list:
            print(f"📊 查询策略: {len(districts)}个区县 × {len(types_list)}个type = {len(districts) * len(types_list)}次查询")
            print(f"   每次查询最多225条，预计可获取 {len(districts) * len(types_list) * 225} 条数据（去重前）")
        
        all_stores = []
        total_count = 0
        
        for i, (district_name, adcode) in enumerate(districts, 1):
            print(f"\n📍 正在查询第 {i}/{len(districts)} 个区县: {district_name} (adcode={adcode})")
            
            district_stores = []
            district_count = 0
            
            if types_list:
                # 有types：拆分成单个type分别查询
                for j, single_type in enumerate(types_list, 1):
                    print(f"   └─ Type {j}/{len(types_list)}: {single_type}")
                    
                    stores, count = fetch_stores_from_amap(
                        keyword=keyword,
                        city=adcode,
                        max_pages=district_max_pages,
                        types=single_type  # 单个type
                    )
                    
                    district_stores.extend(stores)
                    district_count += count
                    
                    print(f"      ✓ 获取 {len(stores)} 条（API显示: {count}）")
                    time.sleep(0.3)  # type之间稍作停顿
            else:
                # 没有types：使用keyword查询
                stores, count = fetch_stores_from_amap(
                    keyword=keyword,
                    city=adcode,
                    max_pages=district_max_pages,
                    types=None
                )
                district_stores.extend(stores)
                district_count += count
            
            # 去重（同一个区县内可能有重复）
            before_dedup = len(district_stores)
            district_stores = remove_duplicates(district_stores)
            after_dedup = len(district_stores)
            
            all_stores.extend(district_stores)
            total_count += district_count
            
            if before_dedup != after_dedup:
                print(f"✅ {district_name} 查询完成: {after_dedup} 条数据（去重前: {before_dedup}，去重: {before_dedup - after_dedup}）")
            else:
                print(f"✅ {district_name} 查询完成: {after_dedup} 条数据")
            
            time.sleep(0.5)  # 区县之间稍作停顿
        
        # 全局去重
        before_global_dedup = len(all_stores)
        all_stores = remove_duplicates(all_stores)
        after_global_dedup = len(all_stores)
        
        print(f"\n🎉 {city} 所有区县查询完成")
        print(f"   去重前: {before_global_dedup} 条")
        print(f"   去重后: {after_global_dedup} 条")
        print(f"   去重数: {before_global_dedup - after_global_dedup} 条")
        
        return all_stores, total_count
    else:
        # 如果没有配置区县，使用原始单次查询
        print(f"ℹ️ 城市 {city} 未配置区县列表，使用单次查询")
        return fetch_stores_from_amap(keyword=keyword, city=city, max_pages=max_pages, types=types)


def fetch_stores_from_amap(keyword=None, city='', max_pages=10, types=None):
    """
    从高德地图API搜索门店信息（单次查询）
    
    参数:
        keyword: 搜索关键词（如"肯德基"），可选
        city: 城市名称（如"杭州市"）或区县名称（如"杭州西湖区"）
        max_pages: 最大查询页数
        types: 高德POI分类编码（如"120000"），使用types时可以不提供keyword
    
    返回:
        门店信息列表和总数
    """
    all_stores = []
    page = 1
    offset = 25  # 每页返回数量，最大25
    total_count = 0
    
    while page <= max_pages:
        params = {
            'key': AMAP_API_KEY,
            'city': city,
            'citylimit': 'true',  # 强制限定在指定城市范围内
            'offset': offset,
            'page': page,
            'extensions': 'all',  # 返回详细信息
            'output': 'JSON'
        }
        
        # 优先使用types参数，如果没有types则使用keyword
        if types:
            params['types'] = types
            params['keywords'] = ''  # 使用types时，keywords设为空
        elif keyword:
            params['keywords'] = keyword
        else:
            print("错误：必须提供keyword或types参数之一")
            return [], 0
        
        try:
            response = requests.get(AMAP_BASE_URL, params=params, timeout=10)
            data = response.json()
            
            # 第一页时打印调试信息（仅在详细模式下）
            # 单type查询时不打印，避免日志过多
            if page == 1 and types and '|' in str(types):
                # 组合types才打印
                print(f"      🔍 API请求: city={city}, types={types}")
                print(f"      📡 返回: count={data.get('count')}")
            
            # 检查返回状态
            if data['status'] != '1':
                print(f"❌ API错误: {data.get('info', '未知错误')}, infocode={data.get('infocode')}")
                # 打印完整返回数据以便调试
                print(f"   完整返回: {data}")
                break
            
            # 第一次请求时获取总数
            if page == 1:
                total_count = int(data.get('count', 0))
            
            pois = data.get('pois', [])
            
            if not pois:
                break
            
            # 提取门店信息
            for poi in pois:
                location = poi.get('location', '')
                lon_lat = location.split(',') if location else ['', '']
                
                # 处理电话号码（可能是字符串、数组或空）
                tel = poi.get('tel', '')
                if isinstance(tel, list):
                    phone = ';'.join(tel) if tel else ''
                else:
                    phone = str(tel) if tel else ''
                
                # 处理地址（可能是字符串、数组或空）
                addr = poi.get('address', '')
                if isinstance(addr, list):
                    address = ';'.join(addr) if addr else ''
                else:
                    address = str(addr) if addr else ''
                
                store_info = {
                    'poi_id': poi.get('id', ''),
                    'store_name': poi.get('name', ''),
                    'address': address,
                    'full_address': f"{poi.get('pname', '')}{poi.get('cityname', '')}{poi.get('adname', '')}{address}",
                    'province': poi.get('pname', ''),
                    'city': poi.get('cityname', ''),
                    'district': poi.get('adname', ''),
                    'phone': phone,
                    'poi_type': poi.get('type', ''),
                    'longitude': float(lon_lat[0]) if len(lon_lat) > 0 and lon_lat[0] else None,
                    'latitude': float(lon_lat[1]) if len(lon_lat) > 1 and lon_lat[1] else None,
                }
                all_stores.append(store_info)
            
            # 继续下一页
            page += 1
            time.sleep(0.2)  # 避免请求过快
            
        except requests.exceptions.RequestException as e:
            print(f"请求出错: {e}")
            break
        except Exception as e:
            print(f"处理数据出错: {e}")
            break
    
    return all_stores, total_count


def remove_duplicates(stores):
    """根据POI_ID去除重复的门店"""
    seen_ids = set()
    unique_stores = []
    
    for store in stores:
        poi_id = store.get('poi_id', '')
        if poi_id and poi_id not in seen_ids:
            seen_ids.add(poi_id)
            unique_stores.append(store)
        elif not poi_id:  # 如果没有ID，也保留
            unique_stores.append(store)
    
    return unique_stores


@bp.route('/search', methods=['POST', 'OPTIONS'])
@token_required
def search_poi(current_user):
    """
    搜索POI门店
    
    请求体：
    {
        "keyword": "肯德基",
        "city": "杭州",
        "max_pages": 10,
        "save_to_db": true,
        "poi_category": "brand"  # 可选：brand(品牌) 或 其他类型（学校/医院等）
    }
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        keyword = data.get('keyword')
        city = data.get('city')
        max_pages = data.get('max_pages', 10)
        save_to_db = data.get('save_to_db', False)
        poi_category = data.get('poi_category', 'brand')  # 默认为品牌
        types = data.get('types')  # 高德POI分类编码（可选）
        
        if not city:
            return jsonify({
                'code': 400,
                'message': '请提供城市'
            }), 400
        
        if not keyword and not types:
            return jsonify({
                'code': 400,
                'message': '请提供关键词或POI分类编码'
            }), 400
        
        # 从高德API搜索 - 优先使用types参数
        # 如果城市配置了区县列表，使用分批查询（所有POI类型都使用分区查询以获取更完整的数据）
        if city in CITY_DISTRICTS:
            print(f"📊 使用分区查询策略：城市={city}, 类型={poi_category}, 关键词={keyword}, types={types}")
            stores, total = fetch_stores_from_amap_by_districts(keyword=keyword, city=city, max_pages=max_pages, types=types)
        else:
            print(f"📊 使用单次查询策略：城市={city}（未配置区县列表）")
            stores, total = fetch_stores_from_amap(keyword=keyword, city=city, max_pages=max_pages, types=types)
        
        if not stores:
            return jsonify({
                'code': 200,
                'message': '未找到相关门店',
                'data': {
                    'stores': [],
                    'total': 0
                }
            })
        
        # 去重
        unique_stores = remove_duplicates(stores)
        
        # 保存到数据库
        if save_to_db:
            saved_count = 0
            skipped_count = 0
            
            for store in unique_stores:
                try:
                    # 检查是否已存在
                    existing = POIStore.query.filter_by(poi_id=store['poi_id']).first()
                    
                    # 确定类别
                    if poi_category == 'brand':
                        # 优先检查：门店名是否包含搜索关键词
                        store_name_lower = store['store_name'].lower() if store['store_name'] else ''
                        keyword_lower = keyword.lower()
                        
                        if keyword_lower in store_name_lower or keyword in store['store_name']:
                            # 门店名包含搜索关键词，检查搜索关键词是否是配置的品牌
                            keyword_matched = match_brand_from_store_name(keyword)
                            if keyword_matched:
                                # 搜索关键词是配置的品牌，优先使用它
                                brand_name = keyword_matched
                            else:
                                # 搜索关键词不是配置的品牌，跳过
                                print(f"跳过非品牌POI: {store['store_name']} (搜索词: {keyword})")
                                skipped_count += 1
                                continue
                        else:
                            # 门店名不包含搜索关键词，尝试从门店名匹配其他品牌
                            matched_brand = match_brand_from_store_name(store['store_name'])
                            if matched_brand:
                                # 匹配到其他配置的品牌
                                brand_name = matched_brand
                            else:
                                # 没有匹配到任何配置的品牌，跳过
                                print(f"跳过非品牌POI: {store['store_name']} (搜索词: {keyword})")
                                skipped_count += 1
                                continue
                        
                        category = get_brand_category(brand_name)
                    else:
                        # 其他POI类型（学校、医院等）
                        category = poi_category
                        brand_name = poi_category
                    
                    if existing:
                        # 更新现有记录
                        for key, value in store.items():
                            setattr(existing, key, value)
                        existing.brand_name = brand_name
                        existing.category = category
                    else:
                        # 创建新记录
                        poi_store = POIStore(
                            poi_id=store['poi_id'],
                            brand_name=brand_name,
                            store_name=store['store_name'],
                            city=store['city'],
                            province=store['province'],
                            district=store['district'],
                            address=store['address'],
                            full_address=store['full_address'],
                            phone=store['phone'],
                            longitude=store['longitude'],
                            latitude=store['latitude'],
                            poi_type=store['poi_type'],
                            category=category
                        )
                        db.session.add(poi_store)
                    
                    saved_count += 1
                except Exception as e:
                    print(f"保存门店失败: {e}")
                    continue
            
            db.session.commit()
            
            # 如果有跳过的POI，在消息中提示
            if skipped_count > 0:
                print(f"共跳过 {skipped_count} 条非配置品牌的POI")
        
        return jsonify({
            'code': 200,
            'message': f'成功搜索到 {len(unique_stores)} 条数据' + (f'，已保存 {saved_count} 条到数据库' if save_to_db else ''),
            'data': {
                'stores': unique_stores,
                'total': len(unique_stores),
                'api_total': total
            }
        })
        
    except Exception as e:
        print(f"搜索POI出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'搜索失败: {str(e)}'
        }), 500


@bp.route('/batch-search', methods=['POST', 'OPTIONS'])
@token_required
def batch_search_poi(current_user):
    """
    批量搜索多个品牌（用于竞品分析）
    
    请求体：
    {
        "keywords": ["肯德基", "麦当劳", "必胜客"],
        "city": "杭州",
        "save_to_db": true
    }
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        keywords = data.get('keywords', [])
        city = data.get('city')
        save_to_db = data.get('save_to_db', False)
        
        if not keywords or not city:
            return jsonify({
                'code': 400,
                'message': '请提供关键词列表和城市'
            }), 400
        
        all_results = {}
        total_stores = 0
        
        for keyword in keywords:
            # 搜索每个品牌
            stores, total = fetch_stores_from_amap(keyword, city, max_pages=10)
            unique_stores = remove_duplicates(stores)
            
            # 保存到数据库
            if save_to_db and unique_stores:
                for store in unique_stores:
                    try:
                        # 优先检查：门店名是否包含搜索关键词
                        store_name_lower = store['store_name'].lower() if store['store_name'] else ''
                        keyword_lower = keyword.lower()
                        
                        if keyword_lower in store_name_lower or keyword in store['store_name']:
                            # 门店名包含搜索关键词，检查搜索关键词是否是配置的品牌
                            keyword_matched = match_brand_from_store_name(keyword)
                            if keyword_matched:
                                # 搜索关键词是配置的品牌，优先使用它
                                brand_name = keyword_matched
                            else:
                                # 搜索关键词不是配置的品牌，跳过
                                print(f"批量搜索-跳过非品牌POI: {store['store_name']} (搜索词: {keyword})")
                                continue
                        else:
                            # 门店名不包含搜索关键词，尝试从门店名匹配其他品牌
                            matched_brand = match_brand_from_store_name(store['store_name'])
                            if matched_brand:
                                # 匹配到其他配置的品牌
                                brand_name = matched_brand
                            else:
                                # 没有匹配到任何配置的品牌，跳过
                                print(f"批量搜索-跳过非品牌POI: {store['store_name']} (搜索词: {keyword})")
                                continue
                        
                        existing = POIStore.query.filter_by(poi_id=store['poi_id']).first()
                        if existing:
                            for key, value in store.items():
                                setattr(existing, key, value)
                            existing.brand_name = brand_name
                            existing.category = get_brand_category(brand_name)
                        else:
                            poi_store = POIStore(
                                poi_id=store['poi_id'],
                                brand_name=brand_name,
                                store_name=store['store_name'],
                                city=store['city'],
                                province=store['province'],
                                district=store['district'],
                                address=store['address'],
                                full_address=store['full_address'],
                                phone=store['phone'],
                                longitude=store['longitude'],
                                latitude=store['latitude'],
                                poi_type=store['poi_type'],
                                category=get_brand_category(brand_name)
                            )
                            db.session.add(poi_store)
                    except Exception as e:
                        print(f"保存门店失败: {e}")
                        continue
            
            all_results[keyword] = {
                'stores': unique_stores,
                'count': len(unique_stores)
            }
            total_stores += len(unique_stores)
            
            time.sleep(0.5)  # 不同关键词之间稍作停顿
        
        if save_to_db:
            db.session.commit()
        
        return jsonify({
            'code': 200,
            'message': f'成功搜索 {len(keywords)} 个品牌，共 {total_stores} 家门店',
            'data': {
                'results': all_results,
                'total': total_stores
            }
        })
        
    except Exception as e:
        print(f"批量搜索POI出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'批量搜索失败: {str(e)}'
        }), 500


@bp.route('/poi-types', methods=['GET', 'OPTIONS'])
@token_required
def get_poi_types(current_user):
    """
    获取可用的POI类型列表
    
    返回：
    {
        "code": 200,
        "data": {
            "types": [
                {
                    "type": "学校",
                    "keywords": ["小学", "中学", "高中"],
                    "icon": "🏫",
                    "color": "#1890ff"
                },
                ...
            ]
        }
    }
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        types_list = []
        for type_name, config in OTHER_POI_TYPES.items():
            type_info = {
                'type': type_name,
                'icon': config['icon'],
                'color': config['color']
            }
            
            # 如果有types字段（高德官方编码），则使用types；否则使用keywords
            if 'types' in config:
                type_info['types'] = config['types']
            else:
                type_info['keywords'] = config.get('keywords', [])
            
            types_list.append(type_info)
        
        return jsonify({
            'code': 200,
            'data': {
                'types': types_list
            }
        })
    except Exception as e:
        print(f"获取POI类型列表出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取失败: {str(e)}'
        }), 500


@bp.route('/other-pois', methods=['GET', 'OPTIONS'])
@token_required
def get_other_pois(current_user):
    """
    获取数据库中已存储的其他类型POI（非品牌）
    
    查询参数：
    - city: 城市筛选
    
    返回：
    [
        {
            "poi_type": "学校",
            "store_count": 50,
            "icon": "🏫",
            "color": "#1890ff"
        },
        ...
    ]
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        city = request.args.get('city')
        
        # 获取其他类型的POI（category在OTHER_POI_TYPES中）
        other_types = list(OTHER_POI_TYPES.keys())
        
        # 基础查询
        query = db.session.query(
            POIStore.category,
            db.func.count(POIStore.id).label('store_count')
        ).filter(POIStore.category.in_(other_types)).group_by(POIStore.category)
        
        # 城市筛选
        if city:
            query = query.filter(POIStore.city == city)
        
        results = query.all()
        
        poi_types = []
        for row in results:
            type_config = OTHER_POI_TYPES.get(row.category, {})
            poi_types.append({
                'poi_type': row.category,
                'store_count': row.store_count,
                'icon': type_config.get('icon', '📍'),
                'color': type_config.get('color', '#666666')
            })
        
        # 按数量降序排序
        poi_types.sort(key=lambda x: x['store_count'], reverse=True)
        
        return jsonify({
            'code': 200,
            'data': {
                'poi_types': poi_types,
                'total': len(poi_types)
            }
        })
        
    except Exception as e:
        print(f"获取其他POI列表出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取失败: {str(e)}'
        }), 500


@bp.route('/brands', methods=['GET', 'OPTIONS'])
@token_required
def get_brands(current_user):
    """
    获取数据库中所有品牌列表及统计信息
    
    查询参数：
    - city: 城市筛选（可选）
    
    返回：
    [
        {
            "brand_name": "必胜客",
            "category": "披萨类",
            "store_count": 121,
            "cities": ["杭州", "温州"],
            "last_updated": "2025-11-23T10:00:00"
        },
        ...
    ]
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        city = request.args.get('city')
        
        # 基础查询
        query = db.session.query(
            POIStore.brand_name,
            POIStore.category,
            db.func.count(POIStore.id).label('store_count'),
            db.func.max(POIStore.updated_at).label('last_updated')
        ).group_by(POIStore.brand_name, POIStore.category)
        
        # 城市筛选
        if city:
            query = query.filter(POIStore.city == city)
        
        results = query.all()
        
        brands = []
        for row in results:
            # 获取该品牌的所有城市
            cities_query = db.session.query(POIStore.city).filter(
                POIStore.brand_name == row.brand_name
            ).distinct()
            
            if city:
                cities_query = cities_query.filter(POIStore.city == city)
            
            cities = [c[0] for c in cities_query.all()]
            
            brands.append({
                'brand_name': row.brand_name,
                'category': row.category,
                'store_count': row.store_count,
                'cities': cities,
                'last_updated': row.last_updated.isoformat() if row.last_updated else None
            })
        
        # 按门店数量降序排序
        brands.sort(key=lambda x: x['store_count'], reverse=True)
        
        return jsonify({
            'code': 200,
            'message': '获取成功',
            'data': {
                'brands': brands,
                'total': len(brands)
            }
        })
        
    except Exception as e:
        print(f"获取品牌列表出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取失败: {str(e)}'
        }), 500


@bp.route('/stores', methods=['GET', 'OPTIONS'])
@token_required
def get_poi_stores(current_user):
    """
    获取数据库中已存储的POI数据
    
    查询参数：
    - city: 城市筛选
    - brand_name: 品牌筛选（可以是逗号分隔的多个品牌，如 "必胜客,肯德基"）
    - category: 类别筛选
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        city = request.args.get('city')
        brand_name = request.args.get('brand_name')
        category = request.args.get('category')
        
        query = POIStore.query
        
        if city:
            query = query.filter(POIStore.city == city)
        
        # 支持多品牌筛选
        if brand_name:
            brands = [b.strip() for b in brand_name.split(',')]
            query = query.filter(POIStore.brand_name.in_(brands))
        
        if category:
            query = query.filter(POIStore.category == category)
        
        stores = query.all()
        
        return jsonify({
            'code': 200,
            'data': {
                'stores': [store.to_dict() for store in stores],
                'total': len(stores)
            }
        })
        
    except Exception as e:
        print(f"获取POI数据出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'获取数据失败: {str(e)}'
        }), 500


@bp.route('/export', methods=['POST', 'OPTIONS'])
@token_required
def export_poi_to_excel(current_user):
    """
    导出POI数据为Excel文件
    
    请求体：
    {
        "store_ids": [1, 2, 3],  # 可选，不传则导出所有
        "brands": ["肯德基", "麦当劳"]  # 可选
    }
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json() or {}
        store_ids = data.get('store_ids')
        brands = data.get('brands')
        
        query = POIStore.query
        
        if store_ids:
            query = query.filter(POIStore.id.in_(store_ids))
        if brands:
            query = query.filter(POIStore.brand_name.in_(brands))
        
        stores = query.all()
        
        if not stores:
            return jsonify({
                'code': 400,
                'message': '没有找到符合条件的门店数据'
            }), 400
        
        # 转换为DataFrame
        data_list = []
        for store in stores:
            data_list.append({
                '品牌名称': store.brand_name,
                '门店名称': store.store_name,
                '类别': store.category,
                '城市': store.city,
                '省份': store.province,
                '区域': store.district,
                '详细地址': store.address,
                '完整地址': store.full_address,
                '电话': store.phone,
                '经度': float(store.longitude) if store.longitude else '',
                '纬度': float(store.latitude) if store.latitude else '',
                'POI类型': store.poi_type,
                '创建时间': store.created_at.strftime('%Y-%m-%d %H:%M:%S') if store.created_at else ''
            })
        
        df = pd.DataFrame(data_list)
        
        # 创建Excel文件
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='POI门店数据')
        
        output.seek(0)
        
        # 生成文件名
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'POI门店数据_{timestamp}.xlsx'
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"导出Excel出错: {e}")
        return jsonify({
            'code': 500,
            'message': f'导出失败: {str(e)}'
        }), 500

