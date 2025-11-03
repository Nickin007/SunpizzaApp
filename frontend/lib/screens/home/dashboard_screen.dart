import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/stat_circle_card.dart';
import '../../widgets/quick_action_button.dart';
import '../../services/work_order_service.dart';
import '../../services/activity_service.dart';

/// 首页 - 数据仪表盘
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final WorkOrderService _workOrderService = WorkOrderService();
  final ActivityService _activityService = ActivityService();
  
  Map<String, int> _stats = {
    '待受理': 0,
    '进行中': 0,
    '已完成': 0,
    '已归档': 0,
  };
  List<Map<String, dynamic>> _activities = [];
  bool _isLoadingActivities = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _loadActivities();
  }

  /// 加载统计数据
  Future<void> _loadStats() async {
    try {
      print('📊 开始加载首页统计数据...');
      final stats = await _workOrderService.getStats();
      print('📊 后端返回的统计数据: $stats');
      
      setState(() {
        // 后端返回的 key 可能不同，需要映射
        _stats = {
          '待受理': stats['待受理'] ?? 0,
          '进行中': stats['进行中'] ?? 0,
          '已完成': stats['已完成'] ?? 0,
          '已归档': stats['已归档'] ?? 0,
        };
      });
      
      print('📊 映射后的统计数据: $_stats');
    } catch (e) {
      print('❌ 加载统计数据失败: $e');
      // 显示错误提示
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载统计数据失败: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  /// 加载活动日志
  Future<void> _loadActivities() async {
    try {
      setState(() {
        _isLoadingActivities = true;
      });

      print('📊 开始加载活动日志...');
      final response = await _activityService.getActivities(page: 1, perPage: 10);
      
      setState(() {
        // response 结构: { data: { data: [...], page: 1, pages: 1, total: 2 } }
        final responseData = response['data'] as Map<String, dynamic>?;
        _activities = List<Map<String, dynamic>>.from(responseData?['data'] ?? []);
        _isLoadingActivities = false;
      });
      
      print('📊 活动日志加载成功，共 ${_activities.length} 条');
    } catch (e) {
      print('❌ 加载活动日志失败: $e');
      setState(() {
        _isLoadingActivities = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载活动日志失败: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  /// 刷新所有数据
  Future<void> _refreshAll() async {
    await Future.wait([
      _loadStats(),
      _loadActivities(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshAll,
          child: CustomScrollView(
            slivers: [
            // 顶部欢迎区域 - 科技感设计
            SliverToBoxAdapter(
              child: Container(
                padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 30.h),
                decoration: const BoxDecoration(
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
                            title: '已归档',
                            count: _stats['已归档']!,
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
              sliver: _isLoadingActivities
                  ? SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(20.h),
                          child: const CircularProgressIndicator(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    )
                  : _activities.isEmpty
                      ? SliverToBoxAdapter(
                          child: Center(
                            child: Padding(
                              padding: EdgeInsets.all(20.h),
                              child: Text(
                                '暂无动态',
                                style: TextStyle(
                                  fontSize: 14.sp,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final activity = _activities[index];
                              return _buildActivityItem(activity);
                            },
                            childCount: _activities.length,
                          ),
                        ),
            ),

            SizedBox(height: 20.h).sliverBox,
          ],
        ),
        ),
      ),
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity) {
    // 解析数据
    final workOrderTitle = activity['work_order_title'] ?? '未知工单';
    final description = activity['description'] ?? '执行了操作';
    final createdAt = activity['created_at'] as String?;
    final actionType = activity['action_type'] as String?;
    
    // 格式化时间
    final relativeTime = _activityService.formatRelativeTime(createdAt);
    
    // 根据操作类型选择图标
    IconData icon;
    Color iconColor;
    switch (actionType) {
      case 'work_order_created':
        icon = Icons.add_circle;
        iconColor = AppColors.success;
        break;
      case 'work_order_status_changed':
        icon = Icons.swap_horiz;
        iconColor = AppColors.warning;
        break;
      case 'work_order_assigned':
        icon = Icons.person_add;
        iconColor = AppColors.info;
        break;
      case 'work_order_comment':
        icon = Icons.comment;
        iconColor = AppColors.primary;
        break;
      case 'work_order_image_added':
        icon = Icons.image;
        iconColor = AppColors.accent;
        break;
      default:
        icon = Icons.notifications_active;
        iconColor = AppColors.primary;
    }
    
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
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20.r),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 20.w,
            ),
          ),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '【$workOrderTitle】',
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
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          SizedBox(width: 8.w),
          Text(
            relativeTime,
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



