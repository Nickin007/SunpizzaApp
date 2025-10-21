"""
Excel文件解析服务
用于解析饿了么门店数据和订单数据Excel文件
"""

import pandas as pd
from datetime import datetime
import re

# ==================== 门店数据字段映射 ====================
# 字段映射：Excel列名 -> 数据库字段名
STORE_FIELD_MAPPING = {
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

# ==================== 订单数据字段映射（食亨） ====================
# 字段映射：Excel列名 -> 数据库字段名（来自食亨收银系统）
ORDER_SHIHENG_FIELD_MAPPING = {
    # 基础信息
    '门店名称': 'store_name',
    '门店编号': 'store_id',
    
    # 订单核心信息
    '订单号': 'order_id',
    '订单状态': 'order_status',
    '下单时间': 'order_time',
    '预约/即时单': 'order_type',
    
    # 出餐信息
    '出餐时间（分）': 'cooking_time',
    '出餐类型': 'cooking_type',
    
    # 订单详情
    '就餐人数': 'guest_count',
    '商品信息': 'product_info',
    '取餐号': 'pickup_number',
    '订单备注': 'order_note',
    '退款原因': 'refund_reason',
    
    # 财务信息
    '预计收入（元）': 'estimated_income',
    '平台服务费': 'platform_service_fee',
    '其他费用': 'other_fee',
    '配送费': 'delivery_fee',
    '优惠名称': 'discount_name',
    '餐盒费': 'package_fee',
}

# ==================== 订单数据字段映射（饿了么） ====================
# 字段映射：Excel列名 -> 数据库字段名（直接从饿了么后台导出）
# 需要4列：日期、门店名称、订单单号、商品信息
ORDER_ELEME_FIELD_MAPPING = {
    '日期': 'data_date',
    '门店名称': 'store_name',
    '订单单号': 'order_id',
    '商品信息': 'product_info',
}

# ==================== 商品数据字段映射 ====================
# 字段映射：Excel列名 -> 数据库字段名
PRODUCT_FIELD_MAPPING = {
    # 基础信息
    '日期': 'data_date',
    '城市名称': 'city',
    '门店名称': 'store_name',
    '门店编号': 'store_id',
    '商品名称': 'product_name',
    
    # 商品属性
    '是否新品': 'is_new_product',
    '是否招牌': 'is_signature',
    '是否套餐': 'is_combo',
    '是否配料': 'is_ingredient',
    '是否售罄': 'is_sold_out',
    
    # 销售数据
    '销售额': 'sales_amount',
    '销量': 'sales_volume',
    '下单人数': 'order_user_count',
    '带来订单数': 'order_count',
    '订单交易额': 'order_transaction_amount',
    
    # 复购数据
    '近30日复购人数': 'repurchase_30d_users',
    '近30日复购率': 'repurchase_30d_rate',
    
    # 新客数据
    '新客人数': 'new_customer_count',
    '新客占比': 'new_customer_ratio',
    
    # 用户行为数据
    '曝光人数': 'exposure_users',
    '点击人数': 'click_users',
    '加购人数': 'add_to_cart_users',
    '加购率': 'add_to_cart_rate',
    '点赞数': 'like_count',
}

# ==================== 评价数据字段映射 ====================
# 字段映射：Excel列名 -> 数据库字段名
REVIEW_FIELD_MAPPING = {
    # 基础信息
    '日期': 'data_date',
    '门店ID': 'store_id',
    '门店名称': 'store_name',
    '城市名称': 'city',
    
    # 订单与评价信息
    '订单ID': 'order_id',
    '评价时间': 'review_time',
    
    # 评分数据
    '总体评分': 'overall_score',
    '味道评分': 'taste_score',
    '包装评分': 'packaging_score',
    '配送评分': 'delivery_score',
    
    # 评价内容
    '评价内容': 'review_content',
    '回复内容': 'reply_content',
    
    # 商品反馈
    '点赞商品': 'liked_products',
    '点踩商品': 'disliked_products',
    
    # 状态字段
    '是否申诉成功': 'is_appeal_success',
    '是否计入总分': 'is_counted_in_score',
    '顾客是否会看到': 'is_visible_to_customer',
    '回评方式': 'reply_method',
    
    # 订单详情
    '订单详情': 'order_details',
}

# ==================== 商家成长数据字段映射 ====================
GROWTH_FIELD_MAPPING = {
    # 基础信息
    '日期': 'data_date',
    '门店名称': 'store_name',
    '门店id': 'store_id',
    '省份': 'province',
    '城市名称': 'city',
    '区县名称': 'district',
    '顶级连锁名称': 'chain_name',
    '地址': 'address',
    
    # 店铺评级
    'L等级分布': 'l_level',
    '店铺分': 'store_score',
    
    # 近7日高峰营业时长
    '近7日高峰营业时长当前值': 'peak_hours_7d_current',
    '近7日高峰营业时长目标值': 'peak_hours_7d_target',
    '近7日高峰营业时长指标得分': 'peak_hours_7d_score',
    '近7日高峰营业时长指标权重': 'peak_hours_7d_weight',
    
    # 近7日营业时长
    '近7日营业时长当前值': 'business_hours_7d_current',
    '近7日营业时长目标值': 'business_hours_7d_target',
    '近7日营业时长指标得分': 'business_hours_7d_score',
    '近7日营业时长指标权重': 'business_hours_7d_weight',
    
    # 昨日店装丰富度
    '昨日店装丰富度当前值': 'store_decoration_current',
    '昨日店装丰富度目标值': 'store_decoration_target',
    '昨日店装丰富度指标得分': 'store_decoration_score',
    '昨日店装丰富度指标权重': 'store_decoration_weight',
    
    # 昨日最低起送价
    '昨日最低起送价当前值': 'min_delivery_price_current',
    '昨日最低起送价目标值': 'min_delivery_price_target',
    '昨日最低起送价指标得分': 'min_delivery_price_score',
    '昨日最低起送价指标权重': 'min_delivery_price_weight',
    
    # 昨日服务功能丰富度
    '昨日服务功能丰富度当前值': 'service_features_current',
    '昨日服务功能丰富度目标值': 'service_features_target',
    '昨日服务功能丰富度指标得分': 'service_features_score',
    '昨日服务功能丰富度指标权重': 'service_features_weight',
    
    # 昨日有效活动丰富度
    '昨日有效活动丰富度当前值': 'promotion_richness_current',
    '昨日有效活动丰富度目标值': 'promotion_richness_target',
    '昨日有效活动丰富度指标得分': 'promotion_richness_score',
    '昨日有效活动丰富度指标权重': 'promotion_richness_weight',
    
    # 近7日差评回复率
    '近7日差评回复率当前值': 'negative_reply_rate_7d_current',
    '近7日差评回复率目标值': 'negative_reply_rate_7d_target',
    '近7日差评回复率指标得分': 'negative_reply_rate_7d_score',
    '近7日差评回复率指标权重': 'negative_reply_rate_7d_weight',
    
    # 昨日商家评分
    '昨日商家评分当前值': 'merchant_rating_current',
    '昨日商家评分目标值': 'merchant_rating_target',
    '昨日商家评分指标得分': 'merchant_rating_score',
    '昨日商家评分指标权重': 'merchant_rating_weight',
    
    # 近7日在线联系回复率
    '近7日在线联系回复率当前值': 'online_reply_rate_7d_current',
    '近7日在线联系回复率目标值': 'online_reply_rate_7d_target',
    '近7日在线联系回复率指标得分': 'online_reply_rate_7d_score',
    '近7日在线联系回复率指标权重': 'online_reply_rate_7d_weight',
    
    # 昨日优质商品率
    '昨日优质商品率当前值': 'quality_product_rate_current',
    '昨日优质商品率目标值': 'quality_product_rate_target',
    '昨日优质商品率指标得分': 'quality_product_rate_score',
    '昨日优质商品率指标权重': 'quality_product_rate_weight',
    
    # 昨日菜单丰富度
    '昨日菜单丰富度当前值': 'menu_richness_current',
    '昨日菜单丰富度目标值': 'menu_richness_target',
    '昨日菜单丰富度指标得分': 'menu_richness_score',
    '昨日菜单丰富度指标权重': 'menu_richness_weight',
    
    # 商责取消率
    '商责取消率当前值': 'merchant_cancel_rate_current',
    '商责取消率目标值': 'merchant_cancel_rate_target',
    '商责取消率指标得分': 'merchant_cancel_rate_score',
    '商责取消率指标权重': 'merchant_cancel_rate_weight',
    
    # 近7日出餐完成上报率
    '近7日出餐完成上报率当前值': 'meal_report_rate_7d_current',
    '近7日出餐完成上报率目标值': 'meal_report_rate_7d_target',
    '近7日出餐完成上报率指标得分': 'meal_report_rate_7d_score',
}

# ==================== 粉丝群数据字段映射 ====================
FANS_FIELD_MAPPING = {
    # 基础信息
    '日期': 'data_date',
    '门店名称': 'store_name',
    '门店编号': 'store_id',
    '门店所在城市': 'city',
    
    # 群基础信息
    '是否达到建群门槛': 'reach_threshold',
    '创建粉丝群类型': 'group_type',
    '粉丝群数量': 'group_count',
    
    # 粉丝统计
    '群粉丝人数': 'total_fans',
    '活跃粉丝人数': 'active_fans',
    '粉丝活跃率': 'fan_active_rate',
    '群访问粉丝人数': 'visit_fans',
    '粉丝群访问率': 'fan_visit_rate',
    '新入群粉丝人数': 'new_fans',
    '新入群粉丝占比': 'new_fan_ratio',
    '老粉丝群访问人数': 'old_visit_fans',
    '老粉丝群访问率': 'old_fan_visit_rate',
    '退群粉丝数': 'quit_fans',
    '退群粉丝占比': 'quit_fan_ratio',
    
    # 订单统计
    '粉丝群订单量': 'group_order_count',
    '门店有效订单量': 'store_order_count',
    '粉丝群订单占比': 'group_order_ratio',
    
    # 入群礼
    '入群礼订单量': 'welcome_gift_orders',
    '入群礼领取量': 'welcome_gift_received',
    
    # 群普通红包
    '群普通红包订单量': 'normal_redpack_orders',
    '群普通红包领取人数': 'normal_redpack_receivers',
    '群普通红包使用人数': 'normal_redpack_users',
    '群普通红包领取量': 'normal_redpack_received',
    
    # 群口令红包
    '群口令红包订单量': 'password_redpack_orders',
    '群口令红包领取人数': 'password_redpack_receivers',
    '群口令红包使用人数': 'password_redpack_users',
    '群口令红包领取量': 'password_redpack_received',
    
    # 群活跃度
    '活跃粉丝群数量': 'active_group_count',
    '有商家发消息的粉丝群数量': 'merchant_message_group_count',
    
    # 群配置
    '是否配置进群礼': 'has_welcome_gift',
    '发送群专属优惠券次数': 'send_coupon_times',
    '发送推荐商品次数': 'send_product_times',
    '是否配置群公告': 'has_announcement',
}


class ExcelParser:
    """Excel解析器"""
    
    @staticmethod
    def parse_excel(file_path, data_type='store'):
        """
        解析Excel或CSV文件
        
        Args:
            file_path: 文件路径（支持.xlsx, .xls, .csv）
            data_type: 数据类型 ('store' 或 'order')
            
        Returns:
            tuple: (success, data, error_message)
                - success: 是否成功
                - data: 解析后的数据列表
                - error_message: 错误信息
        """
        try:
            # 根据数据类型选择字段映射
            if data_type == 'order_shiheng':
                field_mapping = ORDER_SHIHENG_FIELD_MAPPING
                required_columns = ['门店名称', '订单号']  # 订单数据（食亨）必填
            elif data_type == 'order_eleme':
                field_mapping = ORDER_ELEME_FIELD_MAPPING
                required_columns = ['日期', '门店名称', '订单单号']  # 订单数据（饿了么）必填
            elif data_type == 'product':
                field_mapping = PRODUCT_FIELD_MAPPING
                required_columns = ['日期', '门店名称', '商品名称']  # 商品数据必填
            elif data_type == 'review':
                field_mapping = REVIEW_FIELD_MAPPING
                required_columns = ['日期', '门店名称']  # 评价数据必填
            elif data_type == 'growth':
                field_mapping = GROWTH_FIELD_MAPPING
                required_columns = ['日期', '门店名称']  # 商家成长数据必填
            elif data_type == 'fans':
                field_mapping = FANS_FIELD_MAPPING
                required_columns = ['日期', '门店名称']  # 粉丝群数据必填
            else:  # 'store' 或其他，默认使用门店映射
                field_mapping = STORE_FIELD_MAPPING
                required_columns = ['日期', '门店名称']  # 门店数据必填
            
            # 根据文件扩展名选择读取方式
            file_extension = file_path.lower().rsplit('.', 1)[-1]
            if file_extension == 'csv':
                # 读取CSV文件（支持多种编码）
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(file_path, encoding='gbk')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, encoding='gb2312')
            else:
                # 读取Excel文件
                df = pd.read_excel(file_path, engine='openpyxl')
            
            # 验证必填列
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return False, None, f"缺少必填列: {', '.join(missing_columns)}"
            
            # 数据清洗和转换
            result_data = []
            for index, row in df.iterrows():
                try:
                    row_data = ExcelParser._convert_row(row, field_mapping)
                    result_data.append(row_data)
                except Exception as e:
                    print(f"警告：第{index+2}行数据转换失败: {str(e)}")
                    continue
            
            return True, result_data, None
            
        except Exception as e:
            return False, None, f"Excel解析失败: {str(e)}"
    
    @staticmethod
    def _convert_row(row, field_mapping):
        """
        转换单行数据
        
        Args:
            row: pandas Series对象
            field_mapping: 字段映射字典
            
        Returns:
            dict: 转换后的数据字典
        """
        result = {}
        
        for excel_col, db_field in field_mapping.items():
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
                    elif db_field in ['first_open_time', 'order_time']:  # 订单的下单时间
                        value = ExcelParser._parse_datetime(value)
                    
                    # 数值类型（整数）
                    elif db_field in ['cooking_time', 'guest_count']:  # 订单数据的整数字段
                        value = ExcelParser._parse_int(value)
                    elif db_field.endswith('_orders') or db_field.endswith('_users') \
                        or db_field.endswith('_times') or db_field.endswith('_products') \
                        or db_field.endswith('_count_60d') or db_field.endswith('_count_30d'):
                        value = ExcelParser._parse_int(value)
                    
                    # 数值类型（小数）
                    elif db_field in ['estimated_income', 'platform_service_fee', 'other_fee', 
                                      'delivery_fee', 'package_fee']:  # 订单数据的金额字段
                        value = ExcelParser._parse_decimal(value)
                    elif db_field.endswith('_rate') or db_field.endswith('_score') \
                        or db_field.endswith('_fee') or db_field in ['income', 'customer_payment_total', 
                        'avg_payment_per_order', 'avg_income_per_order', 'avg_cooking_time', 'avg_pickup_time']:
                        value = ExcelParser._parse_decimal(value)
                    # Growth数据的指标字段（current, target, weight）
                    elif db_field.endswith('_current') or db_field.endswith('_target') or db_field.endswith('_weight'):
                        value = ExcelParser._parse_decimal(value)
                    # Growth数据的店铺分字段
                    elif db_field == 'store_score':
                        value = ExcelParser._parse_decimal(value)
                    
                    # 字符串类型
                    else:
                        value = str(value).strip() if value else None
                
                result[db_field] = value
        
        return result
    
    @staticmethod
    def _parse_date(value):
        """解析日期（支持多种格式）"""
        if isinstance(value, datetime):
            return value.date()
        elif isinstance(value, (int, float)):
            # 处理Excel中的纯数字日期（如 20251019）
            try:
                value_str = str(int(value))  # 转换为字符串，去除小数部分
                if len(value_str) == 8:  # 确保是8位数字（YYYYMMDD）
                    return datetime.strptime(value_str, '%Y%m%d').date()
            except:
                pass
            return None
        elif isinstance(value, str):
            # 尝试多种日期格式
            formats = [
                '%Y%m%d',             # 20251019 (用户的格式！)
                '%Y-%m-%d',           # 2025-10-19
                '%Y/%m/%d',           # 2025/10/19
                '%Y年%m月%d日',       # 2025年10月19日
                '%Y-%m-%d %H:%M:%S',  # 2025-10-19 00:00:00
                '%Y/%m/%d %H:%M:%S',  # 2025/10/19 00:00:00
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt).date()
                except:
                    continue
            return None
        return None
    
    @staticmethod
    def _parse_datetime(value):
        """解析日期时间（支持多种格式）"""
        if isinstance(value, datetime):
            return value
        elif isinstance(value, str):
            # 尝试多种日期时间格式
            formats = [
                '%Y-%m-%d %H:%M:%S',  # 2025-01-13 10:27:00
                '%Y/%m/%d %H:%M:%S',  # 2025/01/13 10:27:00
                '%Y/%m/%d %H:%M',     # 2025/01/13 10:27
                '%Y-%m-%d %H:%M',     # 2025-01-13 10:27
                '%Y/%m/%d',           # 2025/01/13
                '%Y-%m-%d',           # 2025-01-13
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except:
                    continue
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
    def validate_data(data, data_type='store'):
        """
        验证数据完整性
        
        Args:
            data: 数据字典
            data_type: 数据类型 ('store', 'order', 'product', 'review')
            
        Returns:
            tuple: (is_valid, error_message)
        """
        # 根据数据类型检查必填字段
        if data_type == 'order_shiheng':
            # 订单数据（食亨）必填字段
            if not data.get('store_name'):
                return False, "缺少门店名称"
            if not data.get('order_id'):
                return False, "缺少订单号"
        elif data_type == 'order_eleme':
            # 订单数据（饿了么）必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
            if not data.get('order_id'):
                return False, "缺少订单单号"
        elif data_type == 'product':
            # 商品数据必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
            if not data.get('product_name'):
                return False, "缺少商品名称"
        elif data_type == 'review':
            # 评价数据必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
        elif data_type == 'growth':
            # 商家成长数据必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
        elif data_type == 'fans':
            # 粉丝群数据必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
        else:
            # 门店数据必填字段
            if not data.get('data_date'):
                return False, "缺少日期字段"
            if not data.get('store_name'):
                return False, "缺少门店名称"
        
        return True, None

