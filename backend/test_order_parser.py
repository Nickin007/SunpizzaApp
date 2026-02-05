"""
测试订单解析功能
根据指定门店过滤订单并解析商品信息
"""
import pandas as pd
import sys
import os

# 添加app目录到路径
sys.path.insert(0, os.path.dirname(__file__))
from app.utils.order_parser_20260205 import parse_order_items

# 目标门店列表
TARGET_STORES = [
    "圣比萨·手拍披萨·炸鸡（宜山店）",
    "圣比萨·手拍披萨·意面（新城店）",
    "圣比萨·手拍披萨·炸鸡（桐乡总店）",
    "圣比萨·手拍披萨·意面（双塔店）",
    "圣比萨·手拍披萨·炸鸡（欧洲城店）",
    "圣比萨·手拍披萨·意面（龙港西城店）",
    "圣比萨·手拍披萨·炸鸡（灵溪新天地店）",
    "圣比萨·手拍披萨·炸鸡（临安店）",
    "圣比萨·手拍披萨·意面（马站店）",
    "圣比萨·手拍披萨·意面（金乡店）",
    "圣比萨·手拍披萨·炸鸡（瞿溪店）",
    "圣比萨·手拍披萨·炸鸡（海城店）",
    "圣比萨·手拍披萨·意面（雪山店）",
    "圣比萨·手拍披萨·意面（娄桥店）",
    "圣比萨·手拍披萨·意面（龙霞店）",
    "圣比萨·手拍披萨·意面（灵溪店）",
    "圣比萨·手拍披萨·意面（黄龙店）",
]

def main():
    # 读取Excel文件
    excel_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Sample_order_eleme.xlsx')
    print(f"读取Excel文件: {excel_path}")
    
    df = pd.read_excel(excel_path, engine='openpyxl')
    print(f"总订单数: {len(df)}")
    
    # 获取列名
    columns = list(df.columns)
    print(f"列名: {columns}")
    
    # 查找门店名称和商品信息列
    store_col = None
    product_col = None
    
    for col in columns:
        if '门店名称' in str(col):
            store_col = col
        if '商品信息' in str(col):
            product_col = col
    
    if not store_col or not product_col:
        print(f"错误: 未找到必要的列 (门店名称: {store_col}, 商品信息: {product_col})")
        return
    
    print(f"门店名称列: {store_col}")
    print(f"商品信息列: {product_col}")
    
    # 过滤目标门店
    df_filtered = df[df[store_col].isin(TARGET_STORES)]
    print(f"过滤后订单数: {len(df_filtered)}")
    
    if df_filtered.empty:
        print("警告: 没有找到匹配的门店订单")
        # 打印实际的门店名称以便对比
        unique_stores = df[store_col].unique()
        print(f"Excel中的门店名称示例 (前10个):")
        for s in unique_stores[:10]:
            print(f"  - {s}")
        return
    
    # 解析订单
    results = []
    parse_errors = []
    
    for idx, row in df_filtered.iterrows():
        store_name = row[store_col]
        product_info = str(row[product_col]) if pd.notna(row[product_col]) else ''
        
        if not product_info or product_info == 'nan':
            continue
        
        try:
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
                
                results.append({
                    '门店名称': store_name,
                    '原始商品信息': product_info,
                    '解析单品名称': product_name,
                    '数量': qty,
                })
        except Exception as e:
            parse_errors.append({
                '门店名称': store_name,
                '原始商品信息': product_info,
                '错误信息': str(e),
            })
    
    print(f"成功解析: {len(results)} 条记录")
    print(f"解析错误: {len(parse_errors)} 条记录")
    
    # 创建结果DataFrame
    df_results = pd.DataFrame(results)
    
    # 统计每个门店的单品销量
    if not df_results.empty:
        summary = df_results.groupby(['门店名称', '解析单品名称'])['数量'].sum().reset_index()
        summary.columns = ['门店名称', '单品名称', '总销量']
        summary = summary.sort_values(['门店名称', '总销量'], ascending=[True, False])
    else:
        summary = pd.DataFrame(columns=['门店名称', '单品名称', '总销量'])
    
    # 统计所有门店的单品总销量
    if not df_results.empty:
        total_summary = df_results.groupby('解析单品名称')['数量'].sum().reset_index()
        total_summary.columns = ['单品名称', '总销量']
        total_summary = total_summary.sort_values('总销量', ascending=False)
    else:
        total_summary = pd.DataFrame(columns=['单品名称', '总销量'])
    
    # 保存结果到Excel
    import datetime
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), f'order_parse_test_result_{timestamp}.xlsx')
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # 解析详情
        df_results.to_excel(writer, sheet_name='解析详情', index=False)
        
        # 门店单品统计
        summary.to_excel(writer, sheet_name='门店单品统计', index=False)
        
        # 全部单品汇总
        total_summary.to_excel(writer, sheet_name='全部单品汇总', index=False)
        
        # 解析错误
        if parse_errors:
            df_errors = pd.DataFrame(parse_errors)
            df_errors.to_excel(writer, sheet_name='解析错误', index=False)
    
    print(f"\n结果已保存到: {output_path}")
    print(f"\n=== 单品汇总TOP 20 ===")
    print(total_summary.head(20).to_string(index=False))

if __name__ == '__main__':
    main()
