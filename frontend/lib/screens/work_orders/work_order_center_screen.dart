import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/work_order_card.dart';
import '../../services/work_order_service.dart';
import 'create_work_order_screen.dart';
import 'work_order_detail_screen.dart';

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
  late Map<String, bool> _hasMore; // 是否还有更多数据
  
  final List<String> _tabs = ['待受理', '进行中', '已完成', '已归档'];
  final WorkOrderService _workOrderService = WorkOrderService();
  
  // 状态名称到 ID 的映射
  final Map<String, int> _statusMap = {
    '待受理': 1,
    '进行中': 2,
    '已完成': 3,
    '已归档': 4,
  };
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    
    // 为每个 tab 创建 RefreshController
    _refreshControllers = {};
    _workOrdersData = {};
    _currentPages = {};
    _hasMore = {};
    
    for (var tab in _tabs) {
      _refreshControllers[tab] = RefreshController();
      _workOrdersData[tab] = [];
      _currentPages[tab] = 1;
      _hasMore[tab] = true;
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
      _hasMore[status] = true;
    } else {
      if (!_hasMore[status]!) {
        _refreshControllers[status]!.loadNoData();
        return;
      }
      _currentPages[status] = _currentPages[status]! + 1;
    }
    
    try {
      // 调用真实的 API
      final statusId = _statusMap[status]!;
      final page = _currentPages[status]!;
      
      final response = await _workOrderService.getWorkOrders(
        statusId: statusId,
        page: page,
        perPage: 20,
      );
      
      // 解析返回数据
      final newOrders = (response['items'] as List)
          .map((item) => {
                'id': item['id'],
                'title': item['title'],
                'type': item['type']?['type_name'] ?? '未知类型',
                'priority': item['priority']?['priority_name'] ?? '中',
                'status': item['status']?['status_name'] ?? '待受理',
                'dueDate': item['due_date']?.toString().substring(0, 10) ?? '',
                'creator': item['creator']?['real_name'] ?? '未知',
                'shopName': item['shop']?['name'] ?? '',
                'createdAt': item['created_at']?.toString().substring(0, 10) ?? '',
              })
          .toList();
      
      // 判断是否还有更多数据
      final currentPage = response['page'];
      final totalPages = response['pages'];
      _hasMore[status] = currentPage < totalPages;
      
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
      } else {
        if (_hasMore[status]!) {
          _refreshControllers[status]!.loadComplete();
        } else {
          _refreshControllers[status]!.loadNoData();
        }
      }
    } catch (e) {
      print('加载工单列表失败: $e');
      
      // 更新 RefreshController 状态
      if (isRefresh) {
        _refreshControllers[status]!.refreshFailed();
      } else {
        _refreshControllers[status]!.loadFailed();
      }
      
      // 显示错误提示
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载失败: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.label,
              indicatorWeight: 0.1,
              isScrollable: false,
              labelStyle: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
              ),
              tabs: _tabs.map((tab) {
                return Tab(text: tab);
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
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const CreateWorkOrderScreen(),
            ),
          );
          
          print('📝 创建工单返回结果: $result');
          
          // 如果创建成功，刷新"待受理"标签页的数据
          if (result == true && mounted) {
            print('🔄 开始刷新工单列表...');
            // 直接调用 _loadData 方法刷新数据
            await _loadData(_tabs[0], isRefresh: true);
            _refreshControllers[_tabs[0]]?.refreshCompleted();
          }
        },
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
            title: (order['title'] as String?) ?? '未命名工单',
            type: (order['type'] as String?) ?? '未知类型',
            priority: (order['priority'] as String?) ?? '中',
            status: (order['status'] as String?) ?? '待受理',
            dueDate: (order['dueDate'] as String?) ?? '',
            creator: (order['creator'] as String?) ?? '未知',
            shopName: order['shopName'] as String?,
            createdAt: order['createdAt'] as String?,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => WorkOrderDetailScreen(
                    workOrderId: order['id'] as int,
                  ),
                ),
              );
              
              // 如果状态更新了，刷新所有标签页
              if (result == true && mounted) {
                print('🔄 工单状态已更新，刷新所有标签页...');
                for (var tab in _tabs) {
                  await _loadData(tab, isRefresh: true);
                  _refreshControllers[tab]?.refreshCompleted();
                }
              }
            },
          );
        },
      ),
    );
  }

}


