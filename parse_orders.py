"""
订单报表解析脚本
功能：读取订单报表CSV，删除所有"订单类型"为"平台外卖"的订单，保存筛选后的结果
"""

import pandas as pd
import os

# 文件路径
INPUT_FILE = "订单报表_2026-01-14_2026-02-12_1770994707611.csv"
OUTPUT_FILE = "订单报表_仅堂食自提自营.csv"

def main():
    # 获取当前脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILE)
    output_path = os.path.join(script_dir, OUTPUT_FILE)

    # 读取CSV文件
    print(f"正在读取文件: {input_path}")
    df = pd.read_csv(input_path, encoding="utf-8", dtype=str)

    total_count = len(df)
    print(f"原始订单总数: {total_count}")

    # 查看订单类型分布
    print("\n【订单类型分布】")
    print(df["订单类型"].value_counts().to_string())

    # 过滤掉"平台外卖"和"外卖"类型的订单
    exclude_types = ["平台外卖", "外卖"]
    df_filtered = df[~df["订单类型"].isin(exclude_types)]

    filtered_count = len(df_filtered)
    removed_count = total_count - filtered_count
    print(f"\n已删除 '平台外卖' 和 '外卖' 订单数: {removed_count}")
    print(f"保留订单数: {filtered_count}")

    # 保存筛选后的结果
    df_filtered.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\n筛选结果已保存至: {output_path}")


if __name__ == "__main__":
    main()
