import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../services/work_order_service.dart';
import '../../providers/auth_provider.dart';
import 'create_work_order_screen.dart';

/// 工单详情页
class WorkOrderDetailScreen extends StatefulWidget {
  final int workOrderId;

  const WorkOrderDetailScreen({super.key, required this.workOrderId});

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  final WorkOrderService _workOrderService = WorkOrderService();
  bool _isLoading = true;
  Map<String, dynamic>? _workOrder;
  
  // 评论输入控制器
  final _commentController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _loadWorkOrderDetail();
  }
  
  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
  
  /// 加载工单详情
  Future<void> _loadWorkOrderDetail() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      // 调用真实的 API 加载工单详情
      final data = await _workOrderService.getWorkOrderDetail(widget.workOrderId);
      
      setState(() {
        _workOrder = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        _showMessage('加载失败：$e');
      }
    }
  }
  
  /// 添加评论
  Future<void> _addComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) {
      _showMessage('请输入评论内容');
      return;
    }
    
    try {
      // 调用真实的 API 添加评论
      await _workOrderService.addComment(
        widget.workOrderId,
        content: content,
      );
      
      _showMessage('评论添加成功', isSuccess: true);
      _commentController.clear();
      
      // 重新加载工单详情以显示新评论
      await _loadWorkOrderDetail();
    } catch (e) {
      _showMessage('评论失败：$e');
    }
  }
  
  /// 更新工单状态
  Future<void> _updateStatus(int statusId, String statusName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认操作'),
        content: Text('确定要将工单状态更新为"$statusName"吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      // 调用真实的 API 更新状态
      await _workOrderService.updateWorkOrder(
        widget.workOrderId,
        statusId: statusId,
      );
      
      if (mounted) {
        // 显示成功消息
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12.w),
                Text('工单状态已更新为"$statusName"'),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            duration: const Duration(seconds: 2),
          ),
        );
        
        // 延迟返回工单列表，并标记需要刷新
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            Navigator.pop(context, true); // 返回 true 标记状态已更新
          }
        });
      }
    } catch (e) {
      _showMessage('更新失败：$e');
    }
  }
  
  void _showMessage(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
  
  /// 编辑工单
  Future<void> _editWorkOrder() async {
    if (_workOrder == null) return;
    
    // 跳转到编辑页面
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateWorkOrderScreen(
          workOrderId: widget.workOrderId,
          initialData: _workOrder,
        ),
      ),
    );
    
    // 如果编辑成功，刷新工单详情
    if (result == true) {
      await _loadWorkOrderDetail();
    }
  }
  
  /// 删除工单
  Future<void> _deleteWorkOrder() async {
    // 显示确认对话框
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.red),
            SizedBox(width: 8),
            Text('确认删除'),
          ],
        ),
        content: const Text('确定要删除这个工单吗？\n删除后无法恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('确定删除'),
          ),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      // 调用删除 API
      await _workOrderService.deleteWorkOrder(widget.workOrderId);
      
      if (mounted) {
        _showMessage('工单已删除', isSuccess: true);
        
        // 延迟返回，确保用户看到成功消息
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            Navigator.pop(context, true); // 返回 true 标记需要刷新列表
          }
        });
      }
    } catch (e) {
      _showMessage('删除失败：$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('工单详情'),
        actions: [
          // 更多操作菜单（仅管理员可见）
          Consumer<AuthProvider>(
            builder: (context, authProvider, _) {
              final user = authProvider.currentUser;
              final isAdmin = user?.role == 'admin';
              
              if (!isAdmin) {
                return const SizedBox.shrink(); // 非管理员不显示菜单
              }
              
              return PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'edit') {
                    await _editWorkOrder();
                  } else if (value == 'delete') {
                    await _deleteWorkOrder();
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 20),
                        SizedBox(width: 8),
                        Text('编辑工单'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, size: 20, color: Colors.red),
                        SizedBox(width: 8),
                        Text('删除工单', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _workOrder == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64.w,
                        color: AppColors.textHint,
                      ),
                      SizedBox(height: 16.h),
                      Text(
                        '工单不存在或已被删除',
                        style: TextStyle(
                          fontSize: 16.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // 工单详情内容（可滚动）
                    Expanded(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.all(16.w),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 基本信息卡片
                            _buildBasicInfoCard(),
                            SizedBox(height: 16.h),
                            
                            // 描述卡片
                            if (_workOrder!['description'] != null &&
                                _workOrder!['description'].toString().isNotEmpty)
                              _buildDescriptionCard(),
                            if (_workOrder!['description'] != null &&
                                _workOrder!['description'].toString().isNotEmpty)
                              SizedBox(height: 16.h),
                            
                            // 评论列表
                            _buildCommentsSection(),
                          ],
                        ),
                      ),
                    ),
                    
                    // 底部操作栏
                    _buildBottomActions(),
                  ],
                ),
    );
  }
  
  /// 基本信息卡片
  Widget _buildBasicInfoCard() {
    final type = _workOrder!['type'] as Map<String, dynamic>?;
    final priority = _workOrder!['priority'] as Map<String, dynamic>?;
    final status = _workOrder!['status'] as Map<String, dynamic>?;
    final creator = _workOrder!['creator'] as Map<String, dynamic>?;
    final assignee = _workOrder!['assignee'] as Map<String, dynamic>?;
    final shop = _workOrder!['shop'] as Map<String, dynamic>?;
    
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            _workOrder!['title'] ?? '无标题',
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 16.h),
          
          // 标签行（类型、优先级、状态）
          Wrap(
            spacing: 8.w,
            runSpacing: 8.h,
            children: [
              if (type != null)
                _buildTag(
                  type['type_name'] ?? '未知',
                  Color(int.parse((type['color'] ?? '#999999').replaceFirst('#', '0xFF'))),
                ),
              if (priority != null)
                _buildTag(
                  priority['priority_name'] ?? '未知',
                  Color(int.parse((priority['color'] ?? '#999999').replaceFirst('#', '0xFF'))),
                ),
              if (status != null)
                _buildTag(
                  status['status_name'] ?? '未知',
                  Color(int.parse((status['color'] ?? '#999999').replaceFirst('#', '0xFF'))),
                ),
            ],
          ),
          SizedBox(height: 16.h),
          
          // 详细信息
          _buildInfoRow('创建人', creator?['real_name'] ?? '-'),
          _buildInfoRow('受理人', assignee?['real_name'] ?? '-'),
          _buildInfoRow('所属门店', shop?['name'] ?? '-'),
          _buildInfoRow('截止日期', _formatDate(_workOrder!['due_date'])),
          _buildInfoRow('创建时间', _formatDate(_workOrder!['created_at'])),
          _buildInfoRow('更新时间', _formatDate(_workOrder!['updated_at'])),
        ],
      ),
    );
  }
  
  /// 描述卡片
  Widget _buildDescriptionCard() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '工单描述',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 12.h),
          Text(
            _workOrder!['description'] ?? '',
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
  
  /// 评论列表
  Widget _buildCommentsSection() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '评论记录',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 12.h),
          
          if (_workOrder!['comments'] == null || (_workOrder!['comments'] as List).isEmpty)
            Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20.h),
                child: Text(
                  '暂无评论',
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textHint,
                  ),
                ),
              ),
            )
          else
            ...(_workOrder!['comments'] as List).map((comment) => _buildCommentItem(comment as Map<String, dynamic>)),
        ],
      ),
    );
  }
  
  /// 评论项
  Widget _buildCommentItem(Map<String, dynamic> comment) {
    final author = comment['author'] as Map<String, dynamic>?;
    final authorName = author?['real_name'] ?? '未知用户';
    
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16.w,
                backgroundColor: AppColors.primary.withOpacity(0.1),
                child: Text(
                  authorName.isNotEmpty ? authorName.substring(0, 1) : '?',
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
              SizedBox(width: 8.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authorName,
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _formatDate(comment['created_at']),
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textHint,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 8.h),
          Text(
            comment['content'] ?? '',
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
  
  /// 底部操作栏
  Widget _buildBottomActions() {
    // 获取当前用户信息
    final user = context.watch<AuthProvider>().currentUser;
    final isAdmin = user?.role == 'admin';
    final isShopManager = user?.role == 'shop_manager';
    final currentStatusId = (_workOrder!['status'] as Map<String, dynamic>?)?['id'];
    
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 评论输入框
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: '添加评论...',
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20.r),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8.w),
                IconButton(
                  onPressed: _addComment,
                  icon: const Icon(Icons.send),
                  color: AppColors.primary,
                ),
              ],
            ),
            
            // 管理员状态更新按钮
            if (isAdmin) ...[
              SizedBox(height: 12.h),
              Row(
                children: [
                  if (currentStatusId == 1) // 待受理 → 进行中
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _updateStatus(2, '进行中'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.statusInProgress,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8.r),
                          ),
                        ),
                        child: const Text('接受工单'),
                      ),
                    ),
                  if (currentStatusId == 2) // 进行中 → 已完成
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _updateStatus(3, '已完成'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.statusCompleted,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8.r),
                          ),
                        ),
                        child: const Text('完成工单'),
                      ),
                    ),
                  if (currentStatusId == 3) // 已完成 → 已归档
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _updateStatus(4, '已归档'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7F8C8D),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8.r),
                          ),
                        ),
                        child: const Text('归档工单'),
                      ),
                    ),
                  if (currentStatusId == 4) // 已归档
                    Expanded(
                      child: Container(
                        padding: EdgeInsets.symmetric(vertical: 12.h),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7F8C8D).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8.r),
                        ),
                        child: Center(
                          child: Text(
                            '工单已归档',
                            style: TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF7F8C8D),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
            
            // 店长状态更新按钮（仅进行中→已完成）
            if (!isAdmin && isShopManager && currentStatusId == 2) ...[
              SizedBox(height: 12.h),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _updateStatus(3, '已完成'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.statusCompleted,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8.r),
                        ),
                      ),
                      child: const Text('完成工单'),
                    ),
                  ),
                ],
              ),
            ],
            
            // 非管理员/店长用户的提示信息
            if (!isAdmin && !isShopManager && currentStatusId != 3 && currentStatusId != 4) ...[
              SizedBox(height: 12.h),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8.r),
                  border: Border.all(
                    color: AppColors.warning.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16.w,
                      color: AppColors.warning,
                    ),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Text(
                        '您没有权限更新工单状态',
                        style: TextStyle(
                          fontSize: 12.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  /// 标签
  Widget _buildTag(String text, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4.r),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12.sp,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
  
  /// 信息行
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 70.w,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} '
          '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }
}
