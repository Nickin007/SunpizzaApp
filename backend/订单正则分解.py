import re
import pandas as pd
import os

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
            
        # 判断该部分是否为套餐（包含[]）
        if '[' in part and ']' in part:
            # 处理套餐部分
            items.extend(parse_combo_part(part))
        else:
            # 处理单点部分
            items.extend(parse_single_part(part))
    
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

def process_excel_file(input_file_path):
    """
    处理Excel文件，解析订单信息
    """
    try:
        # 读取Excel文件
        df = pd.read_excel(input_file_path)
        
        # 检查文件结构
        if df.empty:
            print("Excel文件为空！")
            return
        
        # 检查必要的列是否存在
        required_columns = ['日期', '门店名称', '商品信息']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"Excel文件中缺少以下列: {', '.join(missing_columns)}")
            print(f"现有列: {', '.join(df.columns)}")
            return
        
        print(f"检测到所需列: {', '.join(required_columns)}")
        
        # 解析每个订单
        results = []
        order_counter = 1
        
        for index, row in df.iterrows():
            order_text = str(row['商品信息'])
            date = row['日期']
            store_name = row['门店名称']
            
            if order_text and order_text != 'nan':
                items = parse_order_items(order_text)
                
                # 为每个单品添加编号
                for i, item in enumerate(items, 1):
                    results.append({
                        '序号': f"订单{order_counter}",
                        '日期': date,
                        '门店名称': store_name,
                        '解析单品': f"{i}. {item}",
                        '原订单': order_text
                    })
                
                order_counter += 1
        
        # 创建结果DataFrame
        result_df = pd.DataFrame(results)
        
        # 保存结果
        output_file = os.path.join(os.path.dirname(__file__), '解析结果.xlsx')
        result_df.to_excel(output_file, index=False)
        
        print(f"解析完成！共处理 {order_counter-1} 个订单")
        print(f"结果已保存至: {output_file}")
        
        # 显示前几个结果作为示例
        print("\n解析结果格式示例:")
        sample_df = result_df.head(10)
        for _, row in sample_df.iterrows():
            print(f"{row['序号']:10} {row['解析单品']:30} {row['日期']} {row['门店名称']} {row['原订单'][:50]}")
        
    except Exception as e:
        print(f"处理文件时出错: {e}")

def main():
    """
    主函数：获取用户输入并处理Excel文件
    """
    print("=" * 80)
    print("订单解析工具 - 完整版")
    print("=" * 80)
    print("说明：")
    print("- 解析结果将包含日期、门店名称和完整订单信息")
    print("- 每个单品都有编号")
    print("- 使用 _x*y 模式精准分割订单")
    print("- 双拼披萨会从套餐名中提取尺寸并标注为半份")
    print("- 饮料单品使用精确匹配或前缀匹配")
    print("- 不过滤任何字段，所有单品都会被解析")
    print("=" * 80)
    
    while True:
        file_path = input("\n请输入Excel文件路径（输入'quit'退出）: ").strip().strip('"')
        
        if file_path.lower() == 'quit':
            print("程序退出")
            break
        
        if not os.path.exists(file_path):
            print("文件不存在，请检查路径是否正确")
            continue
        
        if not file_path.lower().endswith(('.xlsx', '.xls')):
            print("请提供Excel文件（.xlsx 或 .xls 格式）")
            continue
        
        try:
            process_excel_file(file_path)
            break
        except Exception as e:
            print(f"处理文件时出错: {e}")
            print("请检查文件格式是否正确")

# 测试函数
def test_parser():
    """
    测试解析功能
    """
    test_cases = [
        "花果山披萨-7英寸(手拍)_1*25.9+奶酪芝士卷边（7英寸）_1*4.9+芒果汁[温度:冷]_1*7.0",  # 饮料单品
        "柠檬茶[温度:常温]_1*5.0+可乐听装[温度:冷]_1*6.0",  # 多个饮料单品
        "【肥宅快乐水】小可乐[温度:冷]_1*5.0+可口可乐 1听[温度:冷]_1*6.0",  # 特殊饮料名称
        "【随心拼】12英寸披萨（口味自选）[双拼1:缤纷水果,双拼2:缤纷水果]_1*105.0",  # 双拼披萨
        "新奥尔良烤鸡肉披萨-7英寸(手拍)_1*58.0+金丝鸡排_1*10.88",  # 全是单点
        "️【任选】爆款意面4选1+小吃5选1+饮品[意面:黑椒牛肉意面,小吃:地道肠1根,饮品:小可乐]_1*61.0",  # 全是套餐
        "【任选】披萨随心配[加选小吃一:不另加_1,加选小吃二:不另加._1,必选小吃:地道肠_1,披萨:碳烤鸡肉培根披萨_7英寸(手拍)_1,饮品:雀巢牛奶_1]_1*31.9+蛋挞一个（原味）_1*3.9+点击右上角❤️收藏得小吃[3选1:上校鸡块2个]_1*2.0",  # 套餐与单点组合
        "【任选】披萨8选1+小吃5选1+饮品·[披萨:日系照烧鸡披萨7英寸,小吃:薯饼3个,饮品:芒果汁]_1*58.0+️【任选】爆款意面4选1+小吃5选1+饮品[意面:招牌肉酱意面,小吃:盐酥鸡米花小份,饮品:芒果汁]_1*61.0",  # 多个套餐
        "任选披萨6选1+小吃6选1+饮料[7寸披萨6选1:水果披萨7寸,美味小吃6选1:上校鸡块4个,饮料选1:芒果汁,饮料温度:常温]_1*40.0",  # 包含之前被过滤的字段
        "测试套餐+包含加号[内容:测试+内容_1]_1*10.0+单品_1*5.0"  # 测试套餐内包含加号的情况
    ]
    
    print("测试解析功能:")
    print("-" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n测试用例 {i}:")
        print(f"原订单: {test_case}")
        items = parse_order_items(test_case)
        print("解析结果:")
        for j, item in enumerate(items, 1):
            print(f"  {j}. {item}")

if __name__ == "__main__":
    # 运行测试
    # test_parser()
    
    # 运行主程序
    main()