import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../core/constants/app_colors.dart';

/// 工单卡片组件
class WorkOrderCard extends StatelessWidget {
  final String title;
  final String type;
  final String priority;
  final String dueDate;
  final String creator;
  final VoidCallback? onTap;

  const WorkOrderCard({
    super.key,
    required this.title,
    required this.type,
    required this.priority,
    required this.dueDate,
    required this.creator,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.only(bottom: 12.h),
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12.r),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow.withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题和优先级
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                SizedBox(width: 8.w),
                _buildPriorityBadge(priority),
              ],
            ),
            SizedBox(height: 12.h),
            
            // 类型标签
            _buildTypeBadge(type),
            
            SizedBox(height: 12.h),
            
            // 底部信息
            Row(
              children: [
                Icon(
                  Icons.person_outline,
                  size: 14.w,
                  color: AppColors.textSecondary,
                ),
                SizedBox(width: 4.w),
                Text(
                  creator,
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
                const Spacer(),
                Icon(
                  Icons.access_time,
                  size: 14.w,
                  color: AppColors.textSecondary,
                ),
                SizedBox(width: 4.w),
                Text(
                  dueDate,
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: _isOverdue(dueDate)
                        ? AppColors.error
                        : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(String priority) {
    Color color;
    switch (priority) {
      case '高':
        color = AppColors.priorityHigh;
        break;
      case '中':
        color = AppColors.priorityMedium;
        break;
      default:
        color = AppColors.priorityLow;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4.r),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.priority_high,
            size: 12.w,
            color: color,
          ),
          Text(
            priority,
            style: TextStyle(
              fontSize: 11.sp,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    Color color = _getTypeColor(type);
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4.r),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        type,
        style: TextStyle(
          fontSize: 12.sp,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case '稽查整改':
        return AppColors.typeAudit;
      case '营销活动':
        return AppColors.typeMarketing;
      case '设备报修':
        return AppColors.typeRepair;
      case '物料申请':
        return AppColors.typeMaterial;
      case '人员调度':
        return AppColors.typeStaffing;
      default:
        return AppColors.typeOther;
    }
  }

  bool _isOverdue(String dueDate) {
    try {
      final date = DateTime.parse(dueDate);
      return date.isBefore(DateTime.now());
    } catch (e) {
      return false;
    }
  }
}


