"""
Excel工具包API模块
"""
from flask import Blueprint, request, send_file
from app.utils.response import success_response, error_response
import pandas as pd
import numpy as np
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


def _read_uploaded_file(file_obj=None, field_name='file'):
    """读取上传的 Excel/CSV 文件，返回 DataFrame 或错误响应"""
    if file_obj is None:
        if field_name not in request.files:
            return None, error_response('未上传文件', 400)
        file_obj = request.files[field_name]

    filename = file_obj.filename.lower() if file_obj.filename else ''
    if not (filename.endswith('.xlsx') or filename.endswith('.csv')):
        return None, error_response('仅支持 .xlsx 或 .csv 格式文件', 400)

    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_obj)
        else:
            df = pd.read_excel(file_obj, engine='openpyxl')
    except Exception as e:
        return None, error_response(f'读取文件失败: {str(e)}', 400)

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
        df, err = _read_uploaded_file()
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
        df, err = _read_uploaded_file()
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


# ==================== 淘宝闪购运营核心指标计算 ====================

# 门店销售数据必须包含的列
SALES_REQUIRED_COLS = [
    '日期', '门店名称', '收入', '有效订单量', '曝光次数', '曝光人数',
    '曝光同行均值前10%均值', '进店转化率', '进店转化率的同行前10%均值',
    '下单转化率', '下单转化率的同行前10%均值', '近30日复购率',
]

# 推广聚合数据必须包含的列
PROMO_REQUIRED_COLS = [
    '日期', '门店名称', '推广现金消费(元)', '曝光提升数', '订单提升数',
]

# 12个指标定义：(代号, 名称)
KPI_DEFINITIONS = [
    ('CR1', '推广成本率'),
    ('UC1', '单均推广成本'),
    ('EC1', '千次曝光成本'),
    ('CV1', '综合转化率'),
    ('FC1', '推广流量贡献度'),
    ('PC1', '推广流量综合转化率'),
    ('NC1', '自然流量综合转化率'),
    ('EA1', '曝光前10%优势'),
    ('VA1', '进店转化前10%优势'),
    ('OA1', '下单转化前10%优势'),
    ('LV1', '用户生命周期价值'),
    ('CT1', '单均推广成本阈值'),
]


def _safe_divide(numerator, denominator, label=''):
    """安全除法，除数为0时返回特殊标记字符串"""
    if denominator == 0 or denominator is None or (isinstance(denominator, float) and np.isnan(denominator)):
        return 'N/A(除数为0)'
    result = numerator / denominator
    if np.isinf(result) or np.isnan(result):
        return 'N/A(除数为0)'
    return result


def _compute_kpi_row(row):
    """对单行数据计算12个KPI指标"""
    # 从合并后的行中取值，推广数据缺失已填0
    revenue = row.get('收入', 0) or 0
    valid_orders = row.get('有效订单量', 0) or 0
    exposure_count = row.get('曝光次数', 0) or 0
    exposure_people = row.get('曝光人数', 0) or 0
    exposure_top10 = row.get('曝光同行均值前10%均值', 0) or 0
    enter_rate = row.get('进店转化率', 0) or 0
    enter_rate_top10 = row.get('进店转化率的同行前10%均值', 0) or 0
    order_rate = row.get('下单转化率', 0) or 0
    order_rate_top10 = row.get('下单转化率的同行前10%均值', 0) or 0
    repurchase_30d = row.get('近30日复购率', 0) or 0
    promo_cash = row.get('推广现金消费(元)', 0) or 0
    exposure_boost = row.get('曝光提升数', 0) or 0
    order_boost = row.get('订单提升数', 0) or 0

    # CR1 推广成本率 = 推广现金消费(元) / 收入
    cr1 = _safe_divide(promo_cash, revenue)

    # UC1 单均推广成本 = 推广现金消费(元) / 有效订单量
    uc1 = _safe_divide(promo_cash, valid_orders)

    # EC1 千次曝光成本 = (推广现金消费(元) / 曝光提升数) * 1000
    ec1_raw = _safe_divide(promo_cash, exposure_boost)
    ec1 = ec1_raw * 1000 if isinstance(ec1_raw, (int, float)) else ec1_raw

    # CV1 综合转化率 = 进店转化率 * 下单转化率
    cv1 = enter_rate * order_rate

    # FC1 推广流量贡献度 = 曝光提升数 / 曝光次数
    fc1 = _safe_divide(exposure_boost, exposure_count)

    # PC1 推广流量综合转化率 = 订单提升数 / 曝光提升数
    pc1 = _safe_divide(order_boost, exposure_boost)

    # NC1 自然流量综合转化率 = (有效订单量 - 订单提升数) / (曝光次数 - 曝光提升数)
    natural_orders = valid_orders - order_boost
    natural_exposure = exposure_count - exposure_boost
    nc1 = _safe_divide(natural_orders, natural_exposure)

    # EA1 曝光前10%优势 = (曝光人数 - 曝光同行均值前10%均值) / 曝光同行均值前10%均值
    ea1 = _safe_divide(exposure_people - exposure_top10, exposure_top10)

    # VA1 进店转化前10%优势 = (进店转化率 - 进店转化率的同行前10%均值) / 进店转化率的同行前10%均值
    va1 = _safe_divide(enter_rate - enter_rate_top10, enter_rate_top10)

    # OA1 下单转化前10%优势 = (下单转化率 - 下单转化率的同行前10%均值) / 下单转化率的同行前10%均值
    oa1 = _safe_divide(order_rate - order_rate_top10, order_rate_top10)

    # LV1 用户生命周期价值 = (收入 / 有效订单量) / (1 - 近30日复购率)
    avg_order_value = _safe_divide(revenue, valid_orders)
    if isinstance(avg_order_value, str):
        lv1 = avg_order_value
    else:
        lv1 = _safe_divide(avg_order_value, 1 - repurchase_30d)

    # CT1 单均推广成本阈值 = LV1 * 0.15
    ct1 = lv1 * 0.15 if isinstance(lv1, (int, float)) else lv1

    return [cr1, uc1, ec1, cv1, fc1, pc1, nc1, ea1, va1, oa1, lv1, ct1]


def _clean_value(val):
    """将 numpy 类型转为 Python 原生类型"""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        if np.isnan(val) or np.isinf(val):
            return 'N/A(除数为0)'
        return round(float(val), 6)
    if isinstance(val, float):
        if np.isnan(val) or np.isinf(val):
            return 'N/A(除数为0)'
        return round(val, 6)
    if hasattr(val, 'item'):
        return val.item()
    return val


@bp.route('/taobao-kpi/calculate', methods=['POST'])
def taobao_kpi_calculate():
    """上传两个Excel文件，计算淘宝闪购运营核心指标"""
    try:
        # 读取两个文件
        if 'sales_file' not in request.files:
            return error_response('未上传门店销售数据文件', 400)
        if 'promo_file' not in request.files:
            return error_response('未上传门店推广聚合数据文件', 400)

        sales_file = request.files['sales_file']
        promo_file = request.files['promo_file']

        df_sales, err = _read_uploaded_file(sales_file)
        if err:
            return err
        df_promo, err = _read_uploaded_file(promo_file)
        if err:
            return err

        # 检查必要列
        sales_missing = [c for c in SALES_REQUIRED_COLS if c not in df_sales.columns]
        if sales_missing:
            return error_response(f'门店销售数据缺少列: {", ".join(sales_missing)}', 400)

        promo_missing = [c for c in PROMO_REQUIRED_COLS if c not in df_promo.columns]
        if promo_missing:
            return error_response(f'门店推广聚合数据缺少列: {", ".join(promo_missing)}', 400)

        # 统一日期格式为字符串以便匹配
        df_sales['日期'] = df_sales['日期'].astype(str)
        df_promo['日期'] = df_promo['日期'].astype(str)

        # 日期覆盖分析
        sales_dates = set(df_sales['日期'].unique())
        promo_dates = set(df_promo['日期'].unique())
        matched_dates = sorted(list(sales_dates & promo_dates))
        missing_promo_dates = sorted(list(sales_dates - promo_dates))

        # Left join: 以销售数据为主
        promo_cols_to_join = ['日期', '门店名称', '推广现金消费(元)', '曝光提升数',
                              '进店提升数', '订单提升数']
        # 只保留需要的列避免冲突
        df_promo_slim = df_promo[promo_cols_to_join].copy()

        df_merged = pd.merge(df_sales, df_promo_slim, on=['日期', '门店名称'], how='left')

        # 推广数据缺失填 0
        for col in ['推广现金消费(元)', '曝光提升数', '进店提升数', '订单提升数']:
            df_merged[col] = df_merged[col].fillna(0)

        # 按日期 + 门店名称排序
        df_merged = df_merged.sort_values(['日期', '门店名称']).reset_index(drop=True)

        # 计算KPI
        output_columns = ['日期', '门店名称']
        for code, name in KPI_DEFINITIONS:
            output_columns.append(f'{code} {name}')

        output_rows = []
        for _, row in df_merged.iterrows():
            base = [_clean_value(row['日期']), _clean_value(row['门店名称'])]
            kpi_values = _compute_kpi_row(row)
            base.extend([_clean_value(v) for v in kpi_values])
            output_rows.append(base)

        # 统计信息
        unique_stores = df_merged['门店名称'].nunique()
        unique_dates = df_merged['日期'].nunique()

        return success_response(data={
            'columns': output_columns,
            'rows': output_rows,
            'total_rows': len(output_rows),
            'unique_stores': unique_stores,
            'unique_dates': unique_dates,
            'date_info': {
                'matched_dates': matched_dates,
                'missing_promo_dates': missing_promo_dates,
                'sales_dates': sorted(list(sales_dates)),
                'promo_dates': sorted(list(promo_dates)),
            }
        }, message='计算成功')

    except Exception as e:
        return error_response(f'计算失败: {str(e)}', 500)



# ==================== 一图看清当日运营 ====================

# 门店销售数据需要的列（用于 dashboard）
DASHBOARD_SALES_COLS = [
    '日期', '门店名称', '商圈CR10%', '店铺分值', '收入', '商圈收入排名', '商圈同行数量',
    '单均实付', '有效订单量', '曝光次数', '曝光人数', '曝光人数排名',
    '曝光同行均值', '曝光同行均值前10%均值',
    '进店次数', '进店人数', '进店转化率', '进店转化率同行均值', '进店转化率的同行前10%均值',
    '下单转化率', '下单转化率同行均值', '下单转化率的同行前10%均值',
    '下单用户数', '新客占比', '近7日复购率', '近30日复购率',
    '店铺评分', '营业时间段', '营业时长', '异常关店时间段', '异常关店时长',
    '出餐时长', '商责取消率', '商责退单率', '差评回复率',
]

# 推广原始数据需要的列（用于 dashboard）
DASHBOARD_PROMO_RAW_COLS = [
    '日期', '门店名称', '推广消费(元)', '推广现金消费(元)',
    '曝光提升数', '进店提升数', '订单提升数',
    '订单原价交易额(元)', '订单交易额(元)',
]

# KPI 文件列前缀
KPI_CODE_MAP = {
    'CR1': 'CR1', 'UC1': 'UC1', 'EC1': 'EC1', 'CV1': 'CV1',
    'FC1': 'FC1', 'PC1': 'PC1', 'NC1': 'NC1', 'EA1': 'EA1',
    'VA1': 'VA1', 'OA1': 'OA1', 'LV1': 'LV1', 'CT1': 'CT1',
}


def _safe_float(val, default=0):
    """安全获取浮点数值"""
    if val is None:
        return default
    if isinstance(val, str):
        if 'N/A' in val:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return default
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


def _compute_dashboard_metrics(row, promo_row):
    """计算 14 个新观察指标"""
    metrics = {}

    # 安全取值 - 销售数据
    revenue = _safe_float(row.get('收入'))
    valid_orders = _safe_float(row.get('有效订单量'))
    exposure_count = _safe_float(row.get('曝光次数'))
    exposure_people = _safe_float(row.get('曝光人数'))
    exposure_peer_avg = _safe_float(row.get('曝光同行均值'))
    exposure_top10 = _safe_float(row.get('曝光同行均值前10%均值'))
    enter_count = _safe_float(row.get('进店次数'))
    enter_people = _safe_float(row.get('进店人数'))
    enter_rate = _safe_float(row.get('进店转化率'))
    enter_rate_top10 = _safe_float(row.get('进店转化率的同行前10%均值'))
    order_rate = _safe_float(row.get('下单转化率'))
    order_rate_top10 = _safe_float(row.get('下单转化率的同行前10%均值'))
    market_rank = _safe_float(row.get('商圈收入排名'))
    market_peers = _safe_float(row.get('商圈同行数量'))
    market_cr10 = _safe_float(row.get('商圈CR10%'))
    new_customer_rate = _safe_float(row.get('新客占比'))
    repurchase_7d = _safe_float(row.get('近7日复购率'))
    repurchase_30d = _safe_float(row.get('近30日复购率'))
    cook_time = _safe_float(row.get('出餐时长'))
    cancel_rate = _safe_float(row.get('商责取消率'))
    refund_rate = _safe_float(row.get('商责退单率'))
    bad_review_rate = _safe_float(row.get('差评回复率'))
    abnormal_close = _safe_float(row.get('异常关店时长'))
    store_score = _safe_float(row.get('店铺分值'))
    store_rating = _safe_float(row.get('店铺评分'))
    avg_paid = _safe_float(row.get('单均实付'))

    # 安全取值 - 推广数据（已聚合）
    promo_cash = _safe_float(promo_row.get('推广现金消费(元)'))
    promo_total = _safe_float(promo_row.get('推广消费(元)'))
    exposure_boost = _safe_float(promo_row.get('曝光提升数'))
    enter_boost = _safe_float(promo_row.get('进店提升数'))
    order_boost = _safe_float(promo_row.get('订单提升数'))
    order_gmv = _safe_float(promo_row.get('订单交易额(元)'))
    plan_count = _safe_float(promo_row.get('_plan_count'))

    # ---- 商圈竞争力 ----
    # MR1 商圈排名百分位 = 商圈收入排名 / 商圈同行数量
    mr1 = _safe_divide(market_rank, market_peers) if market_peers else 'N/A(除数为0)'
    metrics['MR1'] = mr1

    # MR2 商圈CR10%距离 = 商圈CR10% - MR1
    if isinstance(mr1, (int, float)):
        metrics['MR2'] = market_cr10 - mr1
    else:
        metrics['MR2'] = 'N/A'

    # ---- 流量质量 ----
    # FQ1 进店深度 = 进店次数 / 进店人数
    metrics['FQ1'] = _safe_divide(enter_count, enter_people) if enter_people else 'N/A(除数为0)'

    # FQ2 曝光同行差距 = (曝光人数 - 曝光同行均值) / 曝光同行均值
    metrics['FQ2'] = _safe_divide(exposure_people - exposure_peer_avg, exposure_peer_avg) if exposure_peer_avg else 'N/A(除数为0)'

    # ---- 用户结构 ----
    # US1 新客占比
    metrics['US1'] = new_customer_rate

    # US2 复购动量 = 近30日复购率 - 近7日复购率
    metrics['US2'] = repurchase_30d - repurchase_7d

    # ---- 运营健康度 ----
    # OH1 出餐时长
    metrics['OH1'] = cook_time

    # OH2 商责问题率 = 商责取消率 + 商责退单率
    metrics['OH2'] = cancel_rate + refund_rate

    # OH3 差评回复率
    metrics['OH3'] = bad_review_rate

    # OH4 异常关店时长
    metrics['OH4'] = abnormal_close

    # ---- 推广效率 ----
    # PE1 推广ROI = 订单交易额(元) / 推广现金消费(元)
    metrics['PE1'] = _safe_divide(order_gmv, promo_cash) if promo_cash else 'N/A(除数为0)'

    # PE2 推广计划数量
    metrics['PE2'] = int(plan_count) if plan_count else 0

    # ---- 基础数据 ----
    metrics['revenue'] = revenue
    metrics['valid_orders'] = valid_orders
    metrics['avg_paid'] = avg_paid
    metrics['exposure_count'] = exposure_count
    metrics['store_score'] = store_score
    metrics['store_rating'] = store_rating

    # 补充推广基础数据
    metrics['promo_cash'] = promo_cash
    metrics['promo_total'] = promo_total
    metrics['exposure_boost'] = exposure_boost
    metrics['order_boost'] = order_boost

    return metrics


@bp.route('/daily-dashboard/merge', methods=['POST'])
def daily_dashboard_merge():
    """合并3个文件，返回仪表盘所需的全量数据"""
    try:
        # 读取3个文件
        if 'kpi_file' not in request.files:
            return error_response('未上传门店核心指标文件', 400)
        if 'sales_file' not in request.files:
            return error_response('未上传门店销售数据文件', 400)
        if 'promo_file' not in request.files:
            return error_response('未上传门店推广原始数据文件', 400)

        df_kpi, err = _read_uploaded_file(request.files['kpi_file'])
        if err:
            return err
        df_sales, err = _read_uploaded_file(request.files['sales_file'])
        if err:
            return err
        df_promo_raw, err = _read_uploaded_file(request.files['promo_file'])
        if err:
            return err

        # 验证必要列 - 销售数据（只检查关键列）
        sales_key_cols = ['日期', '门店名称', '收入', '有效订单量', '曝光次数']
        sales_missing = [c for c in sales_key_cols if c not in df_sales.columns]
        if sales_missing:
            return error_response(f'销售数据缺少关键列: {", ".join(sales_missing)}', 400)

        # 验证推广原始数据的关键列
        promo_key_cols = ['日期', '门店名称', '推广现金消费(元)']
        promo_missing = [c for c in promo_key_cols if c not in df_promo_raw.columns]
        if promo_missing:
            return error_response(f'推广原始数据缺少关键列: {", ".join(promo_missing)}', 400)

        # 验证KPI文件至少有日期和门店名称
        if '日期' not in df_kpi.columns or '门店名称' not in df_kpi.columns:
            return error_response('核心指标文件缺少日期或门店名称列', 400)

        # 统一日期为字符串
        df_sales['日期'] = df_sales['日期'].astype(str).str.strip()
        df_promo_raw['日期'] = df_promo_raw['日期'].astype(str).str.strip()
        df_kpi['日期'] = df_kpi['日期'].astype(str).str.strip()

        # ---- 聚合推广原始数据 ----
        promo_sum_cols = [c for c in ['推广消费(元)', '推广现金消费(元)', '曝光提升数',
                          '进店提升数', '订单提升数', '订单原价交易额(元)', '订单交易额(元)']
                          if c in df_promo_raw.columns]

        promo_agg_dict = {col: 'sum' for col in promo_sum_cols}
        # PE2: 计划数量（统计行数，每行代表一个计划）
        df_promo_raw['_plan_count'] = 1  # 每行代表一个计划
        promo_agg_dict['_plan_count'] = 'sum'

        df_promo_agg = df_promo_raw.groupby(['日期', '门店名称'], as_index=False).agg(promo_agg_dict)

        # ---- 识别 KPI 列（含代号前缀的列）----
        kpi_rename = {}
        for col in df_kpi.columns:
            for code in KPI_CODE_MAP:
                if col.startswith(code):
                    kpi_rename[col] = code
                    break
        df_kpi_slim = df_kpi[['日期', '门店名称'] + list(kpi_rename.keys())].copy()
        df_kpi_slim = df_kpi_slim.rename(columns=kpi_rename)

        # ---- 合并三张表：以销售数据为主 ----
        df_merged = pd.merge(df_sales, df_promo_agg, on=['日期', '门店名称'], how='left')
        df_merged = pd.merge(df_merged, df_kpi_slim, on=['日期', '门店名称'], how='left')

        # 推广数据缺失填 0
        for col in promo_sum_cols + ['_plan_count']:
            if col in df_merged.columns:
                df_merged[col] = df_merged[col].fillna(0)

        # KPI 缺失填 N/A
        for code in KPI_CODE_MAP:
            if code in df_merged.columns:
                df_merged[code] = df_merged[code].fillna('N/A')

        # ---- 计算14个新指标 + 组装结果 ----
        results = []
        for _, row in df_merged.iterrows():
            row_dict = row.to_dict()

            # 计算新指标
            promo_row = {k: row_dict.get(k, 0) for k in
                         promo_sum_cols + ['_plan_count']}
            new_metrics = _compute_dashboard_metrics(row_dict, promo_row)

            # 组装一行数据
            store_data = {
                'date': str(row_dict.get('日期', '')),
                'store_name': str(row_dict.get('门店名称', '')),
            }

            # 12个原始KPI
            for code in KPI_CODE_MAP:
                val = row_dict.get(code, 'N/A')
                store_data[code] = _clean_value(val) if not isinstance(val, str) else val

            # 14个新指标 + 基础数据
            for k, v in new_metrics.items():
                store_data[k] = _clean_value(v) if not isinstance(v, str) else v

            results.append(store_data)

        # 可用日期列表
        available_dates = sorted(list(set(r['date'] for r in results)))

        return success_response(data={
            'records': results,
            'dates': available_dates,
            'total_records': len(results),
            'total_stores': len(set(r['store_name'] for r in results)),
        }, message='数据合并成功')

    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(f'合并失败: {str(e)}', 500)


@bp.route('/taobao-kpi/export', methods=['POST'])
def taobao_kpi_export():
    """接收计算结果JSON，生成Excel文件供下载"""
    try:
        data = request.get_json()
        if not data or 'columns' not in data or 'rows' not in data:
            return error_response('缺少数据', 400)

        columns = data['columns']
        rows = data['rows']
        date_info = data.get('date_info', {})

        df_result = pd.DataFrame(rows, columns=columns)

        # 生成 Excel
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Sheet1: 指标数据
            df_result.to_excel(writer, index=False, sheet_name='运营核心指标')

            # Sheet2: 日期覆盖说明
            date_rows = []
            matched = date_info.get('matched_dates', [])
            missing_promo = date_info.get('missing_promo_dates', [])

            for d in matched:
                date_rows.append({'日期': d, '销售数据': '有', '推广数据': '有', '状态': '已分析'})
            for d in missing_promo:
                date_rows.append({'日期': d, '销售数据': '有', '推广数据': '缺失(推广指标按0计算)', '状态': '已分析(推广数据缺失)'})

            df_dates = pd.DataFrame(date_rows)
            if not df_dates.empty:
                df_dates = df_dates.sort_values('日期').reset_index(drop=True)
            df_dates.to_excel(writer, index=False, sheet_name='日期覆盖说明')

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='淘宝闪购运营核心指标.xlsx'
        )

    except Exception as e:
        return error_response(f'导出失败: {str(e)}', 500)
