import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
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

  final List<String> _tabs = ['待受理', '进行中', '已完成', '已关闭'];
  final Map<String, int> _counts = {
    '待受理': 5,
    '进行中': 12,
    '已完成': 48,
    '已关闭': 23,
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
                  text: '$tab (${_counts[tab]})',
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
    // 模拟数据，实际应从API获取
    final mockOrders = List.generate(
      _counts[status]!,
      (index) => {
        'id': index + 1,
        'title': '【${_getRandomType()}】$status 工单任务 ${index + 1}',
        'type': _getRandomType(),
        'priority': index % 3 == 0 ? '高' : (index % 2 == 0 ? '中' : '低'),
        'dueDate': '2025-10-${10 + index}',
        'creator': '张经理',
      },
    );

    if (mockOrders.isEmpty) {
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
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        // TODO: 刷新数据
        await Future.delayed(const Duration(seconds: 1));
      },
      child: ListView.builder(
        padding: EdgeInsets.all(16.w),
        itemCount: mockOrders.length,
        itemBuilder: (context, index) {
          final order = mockOrders[index];
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

  String _getRandomType() {
    final types = ['稽查整改', '营销活动', '设备报修', '物料申请', '人员调度', '其他'];
    return types[DateTime.now().millisecond % types.length];
  }
}


