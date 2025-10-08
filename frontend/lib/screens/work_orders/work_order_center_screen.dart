import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/work_order_card.dart';

/// 店务中心 - 工单任务中心
class WorkOrderCenterScreen extends StatefulWidget {
  const WorkOrderCenterScreen({super.key});

  @override
  State<WorkOrderCenterScreen> createState() => _WorkOrderCenterScreenState();
}

class _WorkOrderCenterScreenState extends State<WorkOrderCenterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Map<String, RefreshController> _refreshControllers;
  late Map<String, List<Map<String, dynamic>>> _workOrdersData;
  late Map<String, int> _currentPages;
  
  final List<String> _tabs = ['待受理', '进行中', '已完成', '已关闭'];
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    
    // 为每个 tab 创建 RefreshController
    _refreshControllers = {};
    _workOrdersData = {};
    _currentPages = {};
    
    for (var tab in _tabs) {
      _refreshControllers[tab] = RefreshController();
      _workOrdersData[tab] = [];
      _currentPages[tab] = 1;
    }
    
    // 初始加载数据
    for (var tab in _tabs) {
      _loadData(tab, isRefresh: true);
    }
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    for (var controller in _refreshControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }
  
  /// 加载数据
  Future<void> _loadData(String status, {bool isRefresh = false}) async {
    if (isRefresh) {
      _currentPages[status] = 1;
    } else {
      _currentPages[status] = _currentPages[status]! + 1;
    }
    
    // TODO: 从 API 加载数据
    await Future.delayed(const Duration(milliseconds: 500));
    
    // 模拟数据 - 每个状态只显示 1 条示例
    final newOrders = isRefresh ? [
      {
        'id': _tabs.indexOf(status) + 1,
        'title': '【${_getExampleType(status)}】$status示例工单',
        'type': _getExampleType(status),
        'priority': _getExamplePriority(status),
        'dueDate': '2025-10-${15 + _tabs.indexOf(status)}',
        'creator': '${_getExampleCreator(status)}',
      }
    ] : <Map<String, dynamic>>[];
    
    setState(() {
      if (isRefresh) {
        _workOrdersData[status] = newOrders;
      } else {
        _workOrdersData[status]!.addAll(newOrders);
      }
    });
    
    // 更新 RefreshController 状态
    if (isRefresh) {
      _refreshControllers[status]!.refreshCompleted();
      // 示例数据已经全部加载，没有更多数据
      _refreshControllers[status]!.loadNoData();
    } else {
      // 上拉加载时，直接提示没有更多数据
      _refreshControllers[status]!.loadNoData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('店务中心'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(48.h),
          child: Container(
            color: AppColors.surface,
            child:             TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelStyle: TextStyle(
                fontSize: 13.sp,
                fontWeight: FontWeight.w600,
              ),
              labelPadding: EdgeInsets.symmetric(horizontal: 12.w),
              tabs: _tabs.map((tab) {
                return Tab(
                  text: '$tab (${_workOrdersData[tab]?.length ?? 0})',
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((tab) {
          return _buildWorkOrderList(tab);
        }).toList(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/create-work-order'),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: AppColors.textWhite),
      ),
    );
  }

  Widget _buildWorkOrderList(String status) {
    final orders = _workOrdersData[status]!;

    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64.w,
              color: AppColors.textHint,
            ),
            SizedBox(height: 16.h),
            Text(
              '暂无$status任务',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
            SizedBox(height: 16.h),
            ElevatedButton(
              onPressed: () => _loadData(status, isRefresh: true),
              child: const Text('重新加载'),
            ),
          ],
        ),
      );
    }

    return SmartRefresher(
      controller: _refreshControllers[status]!,
      enablePullDown: true,
      enablePullUp: true,
      onRefresh: () => _loadData(status, isRefresh: true),
      onLoading: () => _loadData(status, isRefresh: false),
      header: WaterDropHeader(
        waterDropColor: AppColors.primary,
        complete: Text(
          '刷新成功',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
        ),
      ),
      footer: CustomFooter(
        builder: (context, mode) {
          Widget body;
          if (mode == LoadStatus.idle) {
            body = Text(
              '上拉加载更多',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            );
          } else if (mode == LoadStatus.loading) {
            body = const CircularProgressIndicator(strokeWidth: 2);
          } else if (mode == LoadStatus.failed) {
            body = Text(
              '加载失败，点击重试',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            );
          } else if (mode == LoadStatus.canLoading) {
            body = Text(
              '松手加载更多',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            );
          } else {
            body = Text(
              '没有更多数据了',
              style: TextStyle(color: AppColors.textHint, fontSize: 14.sp),
            );
          }
          return SizedBox(
            height: 55.h,
            child: Center(child: body),
          );
        },
      ),
      child: ListView.builder(
        padding: EdgeInsets.all(16.w),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          return WorkOrderCard(
            title: order['title'] as String,
            type: order['type'] as String,
            priority: order['priority'] as String,
            dueDate: order['dueDate'] as String,
            creator: order['creator'] as String,
            onTap: () {
              context.push('/work-order/${order['id']}');
            },
          );
        },
      ),
    );
  }

  /// 为不同状态返回合适的示例类型
  String _getExampleType(String status) {
    switch (status) {
      case '待受理':
        return '设备报修';
      case '进行中':
        return '稽查整改';
      case '已完成':
        return '营销活动';
      case '已关闭':
        return '物料申请';
      default:
        return '其他';
    }
  }
  
  /// 为不同状态返回合适的示例优先级
  String _getExamplePriority(String status) {
    switch (status) {
      case '待受理':
        return '高';
      case '进行中':
        return '中';
      case '已完成':
        return '低';
      case '已关闭':
        return '中';
      default:
        return '低';
    }
  }
  
  /// 为不同状态返回合适的示例创建人
  String _getExampleCreator(String status) {
    switch (status) {
      case '待受理':
        return '李店长';
      case '进行中':
        return '张经理';
      case '已完成':
        return '王主管';
      case '已关闭':
        return '陈店长';
      default:
        return '管理员';
    }
  }
}


