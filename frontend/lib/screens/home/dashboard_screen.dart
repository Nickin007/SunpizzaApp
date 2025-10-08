import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/stat_circle_card.dart';
import '../../widgets/quick_action_button.dart';

/// 首页 - 数据仪表盘
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // 模拟数据，实际应从API获取
  final Map<String, int> _stats = {
    '待受理': 5,
    '进行中': 12,
    '已完成': 48,
    '已关闭': 23,
  };

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // 顶部欢迎区域 - 科技感设计
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 30.h),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primaryDark,
                      AppColors.primary,
                      AppColors.primaryLight,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 顶部栏
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            // Logo
                            Container(
                              width: 40.w,
                              height: 40.w,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10.r),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 10,
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(10.r),
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  width: 40.w,
                                  height: 40.w,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            SizedBox(width: 12.w),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '圣比萨',
                                  style: TextStyle(
                                    fontSize: 18.sp,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  'SMART STORE',
                                  style: TextStyle(
                                    fontSize: 10.sp,
                                    color: Colors.white.withOpacity(0.8),
                                    letterSpacing: 1,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        // 通知按钮
                        Container(
                          width: 40.w,
                          height: 40.w,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10.r),
                          ),
                          child: Stack(
                            children: [
                              Center(
                                child: Icon(
                                  Icons.notifications_outlined,
                                  color: Colors.white,
                                  size: 22.w,
                                ),
                              ),
                              Positioned(
                                right: 8.w,
                                top: 8.h,
                                child: Container(
                                  width: 8.w,
                                  height: 8.w,
                                  decoration: const BoxDecoration(
                                    color: AppColors.accent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24.h),
                    // 欢迎文本
                    Text(
                      '早上好，${user?.realName ?? "用户"} 👋',
                      style: TextStyle(
                        fontSize: 28.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20.r),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.store,
                            color: Colors.white,
                            size: 14.w,
                          ),
                          SizedBox(width: 6.w),
                          Text(
                            user?.shopName ?? '圣比萨门店管理平台',
                            style: TextStyle(
                              fontSize: 13.sp,
                              color: Colors.white.withOpacity(0.95),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 数据统计圆环区域
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.all(20.w),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '今日任务概览',
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 16.h),
                    Row(
                      children: [
                        Expanded(
                          child: StatCircleCard(
                            title: '待受理',
                            count: _stats['待受理']!,
                            color: AppColors.statusPending,
                            onTap: () => _navigateToWorkOrders('pending'),
                          ),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: StatCircleCard(
                            title: '进行中',
                            count: _stats['进行中']!,
                            color: AppColors.statusInProgress,
                            onTap: () => _navigateToWorkOrders('in_progress'),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12.h),
                    Row(
                      children: [
                        Expanded(
                          child: StatCircleCard(
                            title: '已完成',
                            count: _stats['已完成']!,
                            color: AppColors.statusCompleted,
                            onTap: () => _navigateToWorkOrders('completed'),
                          ),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: StatCircleCard(
                            title: '已关闭',
                            count: _stats['已关闭']!,
                            color: AppColors.statusClosed,
                            onTap: () => _navigateToWorkOrders('closed'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 快捷入口
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '快捷入口',
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 16.h),
                    Row(
                      children: [
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.add_task,
                            label: '创建工单',
                            color: AppColors.primary,
                            onTap: () => context.push('/create-work-order'),
                          ),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.cleaning_services,
                            label: '今日清洁',
                            color: AppColors.info,
                            onTap: () => _navigateToWorkOrders('routine'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            SizedBox(height: 20.h).sliverBox,

            // 最新动态
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                child: Text(
                  '最新动态',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),

            SizedBox(height: 12.h).sliverBox,

            // 动态列表
            SliverPadding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    return _buildActivityItem(
                      '【营销活动】双十一促销活动准备',
                      '张经理 已分配给您',
                      '5分钟前',
                    );
                  },
                  childCount: 5,
                ),
              ),
            ),

            SizedBox(height: 20.h).sliverBox,
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(String title, String description, String time) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8.r),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40.w,
            height: 40.w,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20.r),
            ),
            child: Icon(
              Icons.notifications_active,
              color: AppColors.primary,
              size: 20.w,
            ),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4.h),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: TextStyle(
              fontSize: 11.sp,
              color: AppColors.textHint,
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToWorkOrders(String status) {
    // 跳转到店务页面并传递状态参数
    context.go('/main?tab=work&status=$status');
  }
}

// 扩展方法，便于在SliverList中使用SizedBox
extension SliverBoxExtension on SizedBox {
  Widget get sliverBox => SliverToBoxAdapter(child: this);
}



