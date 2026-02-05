"""
订单解析工具
用于将订单商品信息拆分成单个单品
"""
import re


def parse_order_items(order_text):
    """
    使用新的分割方法解析订单中的单品信息
    """
    items = []
    
    # 使用 _x*y 模式来分割订单，其中 x 是正整数，y 是小数
    # 这个模式可以准确识别每个品的结束位置
    parts = split_order_by_pattern(order_text)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # 检查是否是爆品团商品（包含"values"关键词）
        if 'values' in part:
            # 使用爆品团商品解析逻辑
            items.extend(parse_baopintuan_part(part))
        # 判断该部分是否为套餐（包含[]）
        elif '[' in part and ']' in part:
            # 处理套餐部分
            items.extend(parse_combo_part(part))
        else:
            # 处理单点部分
            items.extend(parse_single_part(part))
    
    return items


def parse_baopintuan_part(combo_text):
    """
    解析爆品团商品
    格式示例: 手握三选一+二选一+可乐-单点[{values:[奥尔良],name:3选1:奥尔良,{values:[上校鸡块 2 块],name:2选1:上校鸡块 2 块,{values:[可乐],name:饮品:可乐]_1*21.4
    提取所有 values:[] 中的内容
    """
    items = []
    
    # 提取订单数量（从 _x*y 模式中获取）
    quantity_match = re.search(r'_(\d+)\*\d+\.?\d*$', combo_text)
    order_qty = 1
    if quantity_match:
        try:
            order_qty = int(quantity_match.group(1))
        except ValueError:
            order_qty = 1
    
    # 匹配所有 values:[...] 中的内容
    # 支持两种格式: values:[xxx] 和 values: [xxx]
    pattern = r'values:\s*\[([^\]]*)\]'
    matches = re.findall(pattern, combo_text)
    
    for value in matches:
        value = value.strip()
        if value:
            # 每个value对应的数量 = 订单数量
            items.append(f"{value}_{order_qty}")
    
    return items


def split_order_by_pattern(order_text):
    """
    使用 _x*y 模式来分割订单，其中 x 是正整数，y 是小数
    """
    parts = []
    
    # 匹配 _x*y 模式，其中 x 是正整数，y 是小数
    pattern = r'_(\d+)\*(\d+\.?\d*)'
    
    # 找到所有匹配的位置
    matches = list(re.finditer(pattern, order_text))
    
    if not matches:
        # 如果没有找到匹配，返回整个订单作为一个部分
        return [order_text]
    
    # 根据匹配位置分割订单
    start_pos = 0
    for match in matches:
        # 当前匹配的结束位置（包含整个 _x*y 模式）
        end_pos = match.end()
        
        # 提取从开始到当前匹配结束的部分
        part = order_text[start_pos:end_pos]
        parts.append(part)
        
        # 更新开始位置为下一个字符（跳过可能的+号）
        start_pos = end_pos
        if start_pos < len(order_text) and order_text[start_pos] == '+':
            start_pos += 1
    
    # 添加最后一个部分（如果有）
    if start_pos < len(order_text):
        parts.append(order_text[start_pos:])
    
    return parts


def parse_combo_part(combo_text):
    """
    解析套餐部分
    """
    items = []
    
    # 提取套餐名称和内容
    combo_name_match = re.match(r'([^\[]+)\[(.*)\]', combo_text)
    if not combo_name_match:
        return items
        
    combo_name = combo_name_match.group(1).strip()
    combo_content = combo_name_match.group(2).strip()
    
    # 检查是否是饮料单品 - 使用精确匹配或前缀匹配
    beverage_match = is_beverage(combo_name)
    if beverage_match:
        # 提取数量
        quantity_match = re.search(r'_(\d+)\*\d+\.?\d*$', combo_text)
        if quantity_match:
            quantity = quantity_match.group(1)
            items.append(f"{beverage_match}_{quantity}")
        else:
            items.append(f"{beverage_match}_1")
        return items
    
    # 检查是否是特殊芝士披萨套餐
    is_special_cheese_pizza = any(keyword in combo_name for keyword in [
        "全芝士披萨", "纯芝士披萨", "金牌芝士披萨"
    ])
    
    if is_special_cheese_pizza:
        # 提取数量
        quantity_match = re.search(r'_(\d+)\*\d+\.?\d*$', combo_text)
        if quantity_match:
            quantity = quantity_match.group(1)
            items.append(f"{combo_name}_{quantity}")
        else:
            items.append(f"{combo_name}_1")
        return items
    
    # 检查是否是大圣鸡排套餐
    is_dasheng_chicken = "大圣鸡排" in combo_name
    
    if is_dasheng_chicken:
        # 提取口味信息
        flavor_match = re.search(r'口味:([^,_]*)(?:_\d+)?', combo_content)
        if flavor_match:
            flavor = flavor_match.group(1).strip()
            # 提取数量
            quantity_match = re.search(r'_(\d+)\*\d+\.?\d*$', combo_text)
            if quantity_match:
                quantity = quantity_match.group(1)
                items.append(f"{flavor}大圣鸡排_{quantity}")
            else:
                items.append(f"{flavor}大圣鸡排_1")
        else:
            # 如果没有找到口味信息，直接使用套餐名称
            quantity_match = re.search(r'_(\d+)\*\d+\.?\d*$', combo_text)
            if quantity_match:
                quantity = quantity_match.group(1)
                items.append(f"{combo_name}_{quantity}")
            else:
                items.append(f"{combo_name}_1")
        return items
    
    # 检查是否是双拼披萨 - 改进的检测逻辑
    is_double_pizza = (
        re.search(r'双拼|随心❤️拼|随心拼', combo_name) and 
        re.search(r'双拼1|双拼2|一半拼|另一半拼', combo_content)
    )
    
    # 检查是否是手握披萨套餐
    is_handheld_pizza = "手握三选一" in combo_name
    
    # 检查是否是三拼披萨套餐
    is_triple_pizza = "随心三拼" in combo_name and re.search(r'三重奏1|三重奏2|三重奏3', combo_content)
    
    # 提取双拼披萨的尺寸
    pizza_size = None
    if is_double_pizza:
        # 从套餐名称中提取尺寸
        size_match = re.search(r'(\d+(?:英寸|寸))', combo_name)
        if size_match:
            pizza_size = size_match.group(1)
    
    # 处理套餐内容
    combo_items = re.split(r'[,，]', combo_content)
    for item in combo_items:
        item = item.strip()
        if not item:
            continue
            
        # 处理双拼披萨的特殊情况
        if is_double_pizza and ':' in item:
            category, item_content = item.split(':', 1)
            category = category.strip()
            item_content = item_content.strip()
            
            # 扩展双拼分类，包括"一半拼"和"另一半拼"
            if category in ['双拼1', '双拼2', '一半拼', '另一半拼']:
                # 检查口味名称中是否已包含尺寸
                flavor_size_match = re.search(r'(\d+(?:英寸|寸))', item_content)
                
                if flavor_size_match:
                    # 口味名称中已包含尺寸，直接使用
                    items.append(f"{item_content}（半）_1")
                elif pizza_size:
                    # 口味名称中不包含尺寸，使用套餐名称中的尺寸
                    items.append(f"{item_content}{pizza_size}（半）_1")
                else:
                    # 没有找到尺寸信息，只添加半份标记
                    items.append(f"{item_content}（半）_1")
                continue
        
        # 处理三拼披萨的特殊情况
        if is_triple_pizza and ':' in item:
            category, item_content = item.split(':', 1)
            category = category.strip()
            item_content = item_content.strip()
            
            # 处理三重奏的口味，添加"手握披萨（三拼）"后缀
            if category in ['三重奏1', '三重奏2', '三重奏3']:
                items.append(f"{item_content}手握披萨（三拼）_1")
                continue
        
        # 处理手握披萨的特殊情况
        if is_handheld_pizza and ':' in item:
            category, item_content = item.split(':', 1)
            category = category.strip()
            item_content = item_content.strip()
            
            # 只对3选1的口味添加"手握披萨"后缀
            if category == '3选1':
                items.append(f"{item_content}手握披萨_1")
                continue
                
            # 处理2选1和饮品选项，不添加"手握披萨"后缀
            if category in ['2选1', '饮品']:
                # 检查是否有下划线标注数量
                if '_' in item_content:
                    # 有下划线的情况：名称_数量
                    item_name = item_content.rsplit('_', 1)[0].strip()
                    quantity = item_content.rsplit('_', 1)[1].strip()
                    # 清理数量中的非数字字符（除了*）
                    quantity = re.sub(r'[^\d*]', '', quantity)
                    items.append(f"{item_name}_{quantity}")
                else:
                    # 没有下划线的情况：默认数量为1
                    items.append(f"{item_content}_1")
                continue
        
        # 处理普通套餐单品（保持不变）
        if ':' in item:
            category, item_content = item.split(':', 1)
            category = category.strip()
            item_content = item_content.strip()
            
            # 检查是否有下划线标注数量
            if '_' in item_content:
                # 有下划线的情况：名称_数量
                item_name = item_content.rsplit('_', 1)[0].strip()
                quantity = item_content.rsplit('_', 1)[1].strip()
                # 清理数量中的非数字字符（除了*）
                quantity = re.sub(r'[^\d*]', '', quantity)
                items.append(f"{item_name}_{quantity}")
            else:
                # 没有下划线的情况：默认数量为1
                items.append(f"{item_content}_1")
        else:
            # 如果没有冒号分隔，直接作为单品处理
            if '_' in item:
                item_name = item.rsplit('_', 1)[0].strip()
                quantity = item.rsplit('_', 1)[1].strip()
                quantity = re.sub(r'[^\d*]', '', quantity)
                items.append(f"{item_name}_{quantity}")
            else:
                items.append(f"{item}_1")
    
    return items


def parse_single_part(single_text):
    """
    解析单点部分
    """
    items = []
    
    # 匹配单品格式：名称_数量*价格 或 名称_数量
    # 使用非贪婪匹配，直到遇到 _x*y 模式
    item_pattern = r'^([^_]*)_(\d+)(?:\*\d+\.?\d*)?'
    item_match = re.match(item_pattern, single_text)
    
    if item_match:
        item_name = item_match.group(1).strip()
        quantity = item_match.group(2).strip()
        
        # 不再过滤任何字段，所有单品都会被解析
        if item_name and quantity:
            items.append(f"{item_name}_{quantity}")
    
    return items


def is_beverage(combo_name):
    """
    判断是否为饮料单品，返回匹配的饮料名称
    """
    # 饮料关键词列表，按优先级排序（更具体的在前面）
    beverage_keywords = [
        "【肥宅快乐水】小可乐",
        "可乐听装",
        "可乐小瓶",
        "可乐罐装",
        "可乐（听装）",
        "可乐（罐装）",
        "可口可乐",
        "可口可乐 1听",
        "可口可乐300ml",
        "小可乐",
        "零度可口可乐饮料",
        "原味奶茶",
        "奶茶",
        "港式奶茶",
        "港式奶茶1杯",
        "芒果汁",
        "芒果汁1杯",
        "雪碧",
        "芬达",
        "小芬达",
        "芬达饮料",
        "柠檬茶",
        "柠檬茶1杯",
        "柠檬茶（福利款）",
        "雀巢牛奶"
    ]
    
    # 检查套餐名称是否精确匹配或前缀匹配饮料关键词
    for keyword in beverage_keywords:
        if combo_name == keyword or combo_name.startswith(keyword):
            # 返回标准化的饮料名称（使用列表中的标准名称）
            return keyword
    
    return None
