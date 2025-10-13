"""
Excel文件解析服务
用于解析饿了么门店数据Excel文件
"""

import pandas as pd
from datetime import datetime
import re

# 字段映射：Excel列名 -> 数据库字段名
FIELD_MAPPING = {
    '日期': 'data_date',
    '门店名称': 'store_name',
    '门店编号': 'store_id',
    '省份': 'province',
    '城市名称': 'city',
    '区县名称': 'district',
    '门店地址': 'address',
    '首次营业时间': 'first_open_time',
    '是否直营': 'is_direct',
    
    # 运营时长
    '营业时长': 'business_hours',
    '高峰期营业时长': 'peak_hours',
    '异常关店时长': 'abnormal_close_hours',
    '是否有效门店': 'is_valid_store',
    
    # 订单财务
    '有效订单': 'valid_orders',
    '无效订单': 'invalid_orders',
    '商户原因无效订单数': 'merchant_invalid_orders',
    '收入': 'income',
    '打包费': 'packaging_fee',
    '平台技术服务费': 'platform_service_fee',
    '配送费补贴': 'delivery_subsidy',
    '履约技术服务费': 'fulfillment_service_fee',
    '退单费用': 'refund_fee',
    '顾客实付总额': 'customer_payment_total',
    '单均实付': 'avg_payment_per_order',
    '单均收入': 'avg_income_per_order',
    
    # 营销漏斗
    '曝光人数': 'exposure_users',
    '新客曝光人数': 'exposure_new_users',
    '老客曝光人数': 'exposure_old_users',
    '曝光次数': 'exposure_times',
    '进店人数': 'visit_users',
    '新客进店人数': 'visit_new_users',
    '老客进店人数': 'visit_old_users',
    '进店次数': 'visit_times',
    '下单人数': 'order_users',
    '新客下单人数': 'order_new_users',
    '老客下单人数': 'order_old_users',
    '下单次数': 'order_times',
    '进店转化率': 'visit_conversion_rate',
    '新客进店转化率': 'new_visit_conversion_rate',
    '老客进店转化率': 'old_visit_conversion_rate',
    '下单转化率': 'order_conversion_rate',
    '新客下单转化率': 'new_order_conversion_rate',
    '老客下单转化率': 'old_order_conversion_rate',
    
    # 商品运营
    '上架商品数': 'online_products',
    '有交易商品数': 'sold_products',
    '库存不足商品数': 'out_of_stock_products',
    '新上架商品数': 'new_products',
    '活动商品数': 'promotion_products',
    '满减活动订单数': 'discount_orders',
    '近7日复购人数': 'repurchase_7d_users',
    '近7日复购率': 'repurchase_7d_rate',
    '近30日复购人数': 'repurchase_30d_users',
    '近30日复购率': 'repurchase_30d_rate',
    
    # 服务质量
    '差评订单数': 'bad_review_orders',
    '投诉订单数': 'complaint_orders',
    '投诉订单id': 'complaint_order_ids',
    '出餐超时订单数': 'overtime_orders',
    '出餐超时订单id': 'overtime_order_ids',
    '单均出餐时长': 'avg_cooking_time',
    '拒单数': 'reject_orders',
    '商责取消数': 'merchant_cancel_orders',
    '商责取消率': 'merchant_cancel_rate',
    '商责退单数': 'merchant_refund_orders',
    '商责退单率': 'merchant_refund_rate',
    '单均取餐时长': 'avg_pickup_time',
    
    # 评分
    '店铺评分': 'store_score',
    '满意度得分': 'satisfaction_score',
    '味道得分': 'taste_score',
    '包装得分': 'packaging_score',
    
    # 近60日
    '近60日好评率': 'good_rate_60d',
    '近60日好评数': 'good_count_60d',
    '近60日中评率': 'medium_rate_60d',
    '近60日中评数': 'medium_count_60d',
    '近60日差评率': 'bad_rate_60d',
    '近60日差评数': 'bad_count_60d',
    '近60日优质评价率': 'quality_rate_60d',
    '近60日优质评价数': 'quality_count_60d',
    '近60日订单评价率': 'review_rate_60d',
    '近60日订单评价数': 'review_count_60d',
    '近60日差评人工回复率': 'bad_reply_rate_60d',
    
    # 近30日
    '近30天好评率': 'good_rate_30d',
    '近30天好评数': 'good_count_30d',
    '近30天中评率': 'medium_rate_30d',
    '近30天中评数': 'medium_count_30d',
    '近30天差评率': 'bad_rate_30d',
    '近30天差评数': 'bad_count_30d',
    '近30天优质评价率': 'quality_rate_30d',
    '近30天优质评价数': 'quality_count_30d',
    '近30天订单评价率': 'review_rate_30d',
    '近30天订单评价数': 'review_count_30d',
    '近30天差评人工回复率': 'bad_reply_rate_30d',
}


class ExcelParser:
    """Excel解析器"""
    
    @staticmethod
    def parse_excel(file_path):
        """
        解析Excel文件
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            tuple: (success, data, error_message)
                - success: 是否成功
                - data: 解析后的数据列表
                - error_message: 错误信息
        """
        try:
            # 读取Excel文件
            df = pd.read_excel(file_path, engine='openpyxl')
            
            # 验证必填列
            required_columns = ['日期', '门店名称']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return False, None, f"缺少必填列: {', '.join(missing_columns)}"
            
            # 数据清洗和转换
            result_data = []
            for index, row in df.iterrows():
                try:
                    row_data = ExcelParser._convert_row(row)
                    result_data.append(row_data)
                except Exception as e:
                    print(f"警告：第{index+2}行数据转换失败: {str(e)}")
                    continue
            
            return True, result_data, None
            
        except Exception as e:
            return False, None, f"Excel解析失败: {str(e)}"
    
    @staticmethod
    def _convert_row(row):
        """
        转换单行数据
        
        Args:
            row: pandas Series对象
            
        Returns:
            dict: 转换后的数据字典
        """
        result = {}
        
        for excel_col, db_field in FIELD_MAPPING.items():
            if excel_col in row.index:
                value = row[excel_col]
                
                # 处理空值
                if pd.isna(value) or value == '' or value == '-':
                    value = None
                
                # 类型转换
                if value is not None:
                    # 日期类型
                    if db_field == 'data_date':
                        value = ExcelParser._parse_date(value)
                    elif db_field == 'first_open_time':
                        value = ExcelParser._parse_datetime(value)
                    
                    # 数值类型（整数）
                    elif db_field.endswith('_orders') or db_field.endswith('_users') \
                        or db_field.endswith('_times') or db_field.endswith('_products') \
                        or db_field.endswith('_count_60d') or db_field.endswith('_count_30d'):
                        value = ExcelParser._parse_int(value)
                    
                    # 数值类型（小数）
                    elif db_field.endswith('_rate') or db_field.endswith('_score') \
                        or db_field.endswith('_fee') or db_field in ['income', 'customer_payment_total', 
                        'avg_payment_per_order', 'avg_income_per_order', 'avg_cooking_time', 'avg_pickup_time']:
                        value = ExcelParser._parse_decimal(value)
                    
                    # 字符串类型
                    else:
                        value = str(value).strip() if value else None
                
                result[db_field] = value
        
        return result
    
    @staticmethod
    def _parse_date(value):
        """解析日期"""
        if isinstance(value, datetime):
            return value.date()
        elif isinstance(value, str):
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except:
                return None
        return None
    
    @staticmethod
    def _parse_datetime(value):
        """解析日期时间"""
        if isinstance(value, datetime):
            return value
        elif isinstance(value, str):
            try:
                return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            except:
                try:
                    return datetime.strptime(value, '%Y-%m-%d')
                except:
                    return None
        return None
    
    @staticmethod
    def _parse_int(value):
        """解析整数"""
        try:
            if isinstance(value, (int, float)):
                return int(value)
            elif isinstance(value, str):
                # 移除逗号等分隔符
                value = value.replace(',', '').replace('，', '')
                return int(float(value))
        except:
            return 0
        return 0
    
    @staticmethod
    def _parse_decimal(value):
        """解析小数"""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            elif isinstance(value, str):
                # 移除百分号
                value = value.replace('%', '').replace(',', '').replace('，', '')
                return float(value)
        except:
            return 0.0
        return 0.0
    
    @staticmethod
    def validate_data(data):
        """
        验证数据完整性
        
        Args:
            data: 数据字典
            
        Returns:
            tuple: (is_valid, error_message)
        """
        # 检查必填字段
        if not data.get('data_date'):
            return False, "缺少日期字段"
        
        if not data.get('store_name'):
            return False, "缺少门店名称"
        
        return True, None

