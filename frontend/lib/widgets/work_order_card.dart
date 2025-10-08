import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../core/constants/app_colors.dart';

/// 工单卡片组件
class WorkOrderCard extends StatelessWidget {
  final String title;
  final String type;
  final String priority;
  final String status;
  final String dueDate;
  final String creator;
  final String? shopName;
  final String? createdAt;
  final VoidCallback? onTap;

  const WorkOrderCard({
    super.key,
    required this.title,
    required this.type,
    required this.priority,
    required this.status,
    required this.dueDate,
    required this.creator,
    this.shopName,
    this.createdAt,
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
            // 标题
            Text(
              title,
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: 12.h),
            
            // 3个标签：类型、优先级、状态
            Wrap(
              spacing: 8.w,
              runSpacing: 8.h,
              children: [
                _buildTypeBadge(type),
                _buildPriorityBadge(priority),
                _buildStatusBadge(status),
              ],
            ),
            
            SizedBox(height: 12.h),
            
            // 底部信息：创建人、门店、创建时间
            Row(
              children: [
                // 创建人
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
                
                // 门店
                if (shopName != null) ...[
                  SizedBox(width: 12.w),
                  Icon(
                    Icons.store_outlined,
                    size: 14.w,
                    color: AppColors.textSecondary,
                  ),
                  SizedBox(width: 4.w),
                  Flexible(
                    child: Text(
                      shopName!,
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                
                const Spacer(),
                
                // 创建时间
                Icon(
                  Icons.access_time,
                  size: 14.w,
                  color: AppColors.textSecondary,
                ),
                SizedBox(width: 4.w),
                Text(
                  createdAt ?? dueDate,
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    Color color = _getTypeColor(type);
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6.r),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        type,
        style: TextStyle(
          fontSize: 11.sp,
          fontWeight: FontWeight.w600,
          color: color,
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
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6.r),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        priority,
        style: TextStyle(
          fontSize: 11.sp,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
  
  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case '待受理':
        color = AppColors.statusPending;
        break;
      case '进行中':
        color = AppColors.statusInProgress;
        break;
      case '已完成':
        color = AppColors.statusCompleted;
        break;
      case '已关闭':
        color = AppColors.statusClosed;
        break;
      default:
        color = AppColors.textSecondary;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 5.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6.r),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11.sp,
          fontWeight: FontWeight.w600,
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

}


