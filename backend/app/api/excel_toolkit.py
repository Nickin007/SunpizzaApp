"""
Excel工具包API模块
"""
from flask import Blueprint, request, send_file
from app.utils.response import success_response, error_response
import pandas as pd
from io import BytesIO

bp = Blueprint('excel_toolkit', __name__, url_prefix='/api/excel-toolkit')


# ==================== 推广门店聚合 ====================

# 分组键列
GROUP_KEYS = ['日期', '门店名称']
# 附带列（取 first）
KEEP_COLS = ['城市', '省份', '门店ID']
# 求和列
SUM_COLS = [
    '推广消费(元)', '推广现金消费(元)', '曝光提升数',
    '进店提升数', '订单提升数', '订单原价交易额(元)', '订单交易额(元)'
]
# 最终输出列顺序
OUTPUT_COLS = GROUP_KEYS + KEEP_COLS + SUM_COLS


def _read_uploaded_excel():
    """读取上传的 Excel 文件，返回 DataFrame 或错误响应"""
    if 'file' not in request.files:
        return None, error_response('未上传文件', 400)

    file = request.files['file']
    if not file.filename.endswith('.xlsx'):
        return None, error_response('仅支持 .xlsx 格式文件', 400)

    try:
        df = pd.read_excel(file, engine='openpyxl')
    except Exception as e:
        return None, error_response(f'读取Excel失败: {str(e)}', 400)

    return df, None


def _aggregate(df):
    """按 日期+门店名称 聚合推广数据"""
    # 检查必要列
    missing = [c for c in (GROUP_KEYS + KEEP_COLS + SUM_COLS) if c not in df.columns]
    if missing:
        return None, error_response(f'缺少必要列: {", ".join(missing)}', 400)

    # 构建聚合字典
    agg_dict = {}
    for col in KEEP_COLS:
        agg_dict[col] = 'first'
    for col in SUM_COLS:
        agg_dict[col] = 'sum'

    result = df.groupby(GROUP_KEYS, as_index=False).agg(agg_dict)

    # 按 日期、门店名称 排序
    result = result.sort_values(GROUP_KEYS).reset_index(drop=True)

    # 保证列顺序
    result = result[OUTPUT_COLS]

    return result, None


@bp.route('/promo-aggregate/preview', methods=['POST'])
def promo_preview():
    """上传Excel后返回原始数据全量预览"""
    try:
        df, err = _read_uploaded_excel()
        if err:
            return err

        # 将 NaN 替换为 None，方便 JSON 序列化
        df = df.where(pd.notnull(df), None)

        # 转为列名 + 行数据的格式
        columns = list(df.columns)
        rows = df.values.tolist()

        # 将 numpy 类型转为 Python 原生类型
        clean_rows = []
        for row in rows:
            clean_row = []
            for val in row:
                if val is None:
                    clean_row.append(None)
                elif hasattr(val, 'item'):
                    clean_row.append(val.item())
                else:
                    clean_row.append(val)
            clean_rows.append(clean_row)

        return success_response(data={
            'columns': columns,
            'rows': clean_rows,
            'total_rows': len(clean_rows),
        }, message='预览成功')

    except Exception as e:
        return error_response(f'预览失败: {str(e)}', 500)


@bp.route('/promo-aggregate', methods=['POST'])
def promo_aggregate():
    """上传Excel并返回聚合后的JSON数据（用于结果预览）"""
    try:
        df, err = _read_uploaded_excel()
        if err:
            return err

        result, err = _aggregate(df)
        if err:
            return err

        # 将 NaN 替换为 None
        result = result.where(pd.notnull(result), None)

        columns = list(result.columns)
        rows = result.values.tolist()

        # 转为 Python 原生类型
        clean_rows = []
        for row in rows:
            clean_row = []
            for val in row:
                if val is None:
                    clean_row.append(None)
                elif hasattr(val, 'item'):
                    clean_row.append(val.item())
                else:
                    clean_row.append(val)
            clean_rows.append(clean_row)

        # 统计信息
        unique_stores = result['门店名称'].nunique()
        unique_dates = result['日期'].nunique()

        return success_response(data={
            'columns': columns,
            'rows': clean_rows,
            'total_rows': len(clean_rows),
            'unique_stores': unique_stores,
            'unique_dates': unique_dates,
        }, message='聚合成功')

    except Exception as e:
        return error_response(f'聚合失败: {str(e)}', 500)


@bp.route('/promo-aggregate/export', methods=['POST'])
def promo_aggregate_export():
    """接收聚合结果JSON，生成Excel文件供下载"""
    try:
        data = request.get_json()
        if not data or 'columns' not in data or 'rows' not in data:
            return error_response('缺少数据', 400)

        columns = data['columns']
        rows = data['rows']

        df = pd.DataFrame(rows, columns=columns)

        # 生成 Excel
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='推广门店聚合')
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='推广门店聚合结果.xlsx'
        )

    except Exception as e:
        return error_response(f'导出失败: {str(e)}', 500)
