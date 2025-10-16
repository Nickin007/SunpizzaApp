import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_colors.dart';
import '../../services/work_order_service.dart';

/// 创建/编辑工单页面
class CreateWorkOrderScreen extends StatefulWidget {
  final int? workOrderId; // 如果为null，则为创建模式；否则为编辑模式
  final Map<String, dynamic>? initialData; // 编辑模式的初始数据
  
  const CreateWorkOrderScreen({
    super.key,
    this.workOrderId,
    this.initialData,
  });

  @override
  State<CreateWorkOrderScreen> createState() => _CreateWorkOrderScreenState();
}

class _CreateWorkOrderScreenState extends State<CreateWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _assigneeNameController = TextEditingController();
  final WorkOrderService _workOrderService = WorkOrderService();
  
  Map<String, dynamic>? _selectedType;
  Map<String, dynamic>? _selectedPriority;
  DateTime? _selectedDueDate;
  
  bool _isLoading = false;
  bool _isSearchingAssignee = false;
  
  // 字典数据
  List<Map<String, dynamic>> _taskTypes = [];
  List<Map<String, dynamic>> _priorities = [];
  List<Map<String, dynamic>> _shops = [];
  Map<String, dynamic>? _selectedShop;
  
  // 受理人
  Map<String, dynamic>? _assigneeUser;
  String? _assigneeError;
  
  // 是否为编辑模式
  bool get isEditMode => widget.workOrderId != null;
  
  @override
  void initState() {
    super.initState();
    _loadDictData();
    _initializeFormData();
  }
  
  /// 初始化表单数据（编辑模式）
  void _initializeFormData() {
    if (isEditMode && widget.initialData != null) {
      final data = widget.initialData!;
      
      // 填充基本信息
      _titleController.text = data['title'] ?? '';
      _descriptionController.text = data['description'] ?? '';
      
      // 填充受理人信息
      if (data['assignee'] != null) {
        _assigneeUser = {
          'id': data['assignee']['id'],
          'real_name': data['assignee']['real_name'],
          'username': data['assignee']['username'],
        };
        _assigneeNameController.text = data['assignee']['real_name'] ?? '';
      }
      
      // 填充截止日期
      if (data['due_date'] != null) {
        try {
          _selectedDueDate = DateTime.parse(data['due_date'].toString().substring(0, 10));
        } catch (e) {
          print('解析截止日期失败: $e');
        }
      }
    }
  }
  
  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _assigneeNameController.dispose();
    super.dispose();
  }
  
  /// 加载字典数据
  Future<void> _loadDictData() async {
    try {
      final types = await _workOrderService.getTaskTypes();
      final priorities = await _workOrderService.getPriorities();
      
      // 加载门店列表（admin 创建工单时需要）
      List<Map<String, dynamic>> shops = [];
      try {
        final response = await _workOrderService.getShops();
        shops = List<Map<String, dynamic>>.from(response['items']);
      } catch (e) {
        print('加载门店列表失败: $e');
      }
      
      setState(() {
        _taskTypes = types;
        _priorities = priorities;
        _shops = shops;
        
        // 编辑模式：设置选中的类型、优先级、门店
        if (isEditMode && widget.initialData != null) {
          final data = widget.initialData!;
          
          // 设置任务类型
          if (data['type'] != null) {
            _selectedType = _taskTypes.firstWhere(
              (t) => t['id'] == data['type']['id'],
              orElse: () => _taskTypes.isNotEmpty ? _taskTypes[0] : {},
            );
          }
          
          // 设置优先级
          if (data['priority'] != null) {
            _selectedPriority = _priorities.firstWhere(
              (p) => p['id'] == data['priority']['id'],
              orElse: () => _priorities.isNotEmpty ? _priorities[0] : {},
            );
          }
          
          // 设置门店
          if (data['shop'] != null && _shops.isNotEmpty) {
            _selectedShop = _shops.firstWhere(
              (s) => s['id'] == data['shop']['id'],
              orElse: () => _shops[0],
            );
          }
        } else {
          // 创建模式：自动选择第一个门店（如果有的话）
          if (_shops.isNotEmpty) {
            _selectedShop = _shops[0];
          }
        }
      });
    } catch (e) {
      print('加载字典数据失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载数据失败: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }
  
  /// 搜索受理人
  Future<void> _searchAssignee(String realName) async {
    if (realName.trim().isEmpty) {
      setState(() {
        _assigneeUser = null;
        _assigneeError = null;
      });
      return;
    }
    
    setState(() {
      _isSearchingAssignee = true;
      _assigneeError = null;
    });
    
    try {
      final user = await _workOrderService.searchUserByName(realName.trim());
      setState(() {
        _assigneeUser = user;
        _assigneeError = null;
        _isSearchingAssignee = false;
      });
      print('✅ 找到受理人: ${user['real_name']} (ID: ${user['id']})');
    } catch (e) {
      setState(() {
        _assigneeUser = null;
        _assigneeError = e.toString().replaceAll('Exception: ', '');
        _isSearchingAssignee = false;
      });
      print('❌ 未找到受理人: $e');
    }
  }
  
  /// 选择截止日期
  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() {
        _selectedDueDate = picked;
      });
    }
  }
  
  /// 提交工单
  Future<void> _submitWorkOrder() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    if (_selectedType == null) {
      _showMessage('请选择任务类型');
      return;
    }
    
    if (_selectedPriority == null) {
      _showMessage('请选择优先级');
      return;
    }
    
    // ✅ 验证受理人必填
    if (_assigneeUser == null) {
      _showMessage('请输入并选择受理人');
      return;
    }
    
    // ✅ 验证不能选择admin
    if (_assigneeUser!['role'] == 'admin') {
      _showMessage('不能给管理员分配工单');
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      if (isEditMode) {
        // 编辑模式：更新工单
        print('🚀 开始更新工单...');
        print('  工单ID: ${widget.workOrderId}');
        print('  标题: ${_titleController.text.trim()}');
        
        await _workOrderService.updateWorkOrder(
          widget.workOrderId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isNotEmpty 
              ? _descriptionController.text.trim()
              : null,
          statusId: 1, // 编辑后重置为"待受理"状态
          dueDate: _selectedDueDate?.toIso8601String(),
        );
        
        print('✅ 工单更新成功！');
      } else {
        // 创建模式：创建新工单
        print('🚀 开始创建工单...');
        print('  标题: ${_titleController.text.trim()}');
        print('  类型ID: ${_selectedType!['id']}');
        print('  优先级ID: ${_selectedPriority!['id']}');
        print('  门店ID: ${_selectedShop?['id']}');
        print('  受理人ID: ${_assigneeUser!['id']}'); // ✅ 不再使用 ?，已确保非空
        print('  受理人姓名: ${_assigneeUser!['real_name']}');
        
        // 调用真实的 API 创建工单
        final result = await _workOrderService.createWorkOrder(
          title: _titleController.text.trim(),
          typeId: _selectedType!['id'],
          priorityId: _selectedPriority!['id'],
          assigneeId: _assigneeUser!['id'], // ✅ 必填参数，前面已验证非空
          description: _descriptionController.text.trim().isNotEmpty 
              ? _descriptionController.text.trim()
              : null,
          dueDate: _selectedDueDate?.toIso8601String(),
          shopId: _selectedShop?['id'], // ✅ 可选参数（不再强制关联门店）
        );
        
        print('✅ 工单创建成功！');
        print('  工单ID: ${result['id']}');
      }
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        // 显示成功消息
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12.w),
                Text(isEditMode ? '工单更新成功！' : '工单创建成功！'),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            duration: const Duration(seconds: 2),
          ),
        );
        
        // 延迟返回，确保用户看到成功消息
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            Navigator.pop(context, true); // 返回 true 表示操作成功，触发列表刷新
          }
        });
      }
    } catch (e) {
      print('❌ ${isEditMode ? '工单更新' : '工单创建'}失败！');
      print('  错误: $e');
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showMessage('创建失败：$e');
      }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(isEditMode ? '编辑工单' : '创建工单'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submitWorkOrder,
            child: _isLoading
                ? SizedBox(
                    width: 20.w,
                    height: 20.w,
                    child: const CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    isEditMode ? '保存' : '提交',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16.w),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题输入框
              _buildSectionTitle('工单标题', required: true),
              SizedBox(height: 8.h),
              _buildTextField(
                controller: _titleController,
                hint: '请输入工单标题',
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入工单标题';
                  }
                  return null;
                },
              ),
              SizedBox(height: 20.h),
              
              // 任务类型选择
              _buildSectionTitle('任务类型', required: true),
              SizedBox(height: 8.h),
              _buildTypeSelector(),
              SizedBox(height: 20.h),
              
              // 优先级选择
              _buildSectionTitle('优先级', required: true),
              SizedBox(height: 8.h),
              _buildPrioritySelector(),
              SizedBox(height: 20.h),
              
              // 工单描述
              _buildSectionTitle('工单描述'),
              SizedBox(height: 8.h),
              _buildTextField(
                controller: _descriptionController,
                hint: '请详细描述工单内容...',
                maxLines: 5,
              ),
              SizedBox(height: 20.h),
              
              // 所属门店（仅对 admin 显示）
              if (_shops.isNotEmpty) ...[
                _buildSectionTitle('所属门店', required: true),
                SizedBox(height: 8.h),
                _buildShopSelector(),
                SizedBox(height: 20.h),
              ],
              
              // 受理人（✅ 改为必填）
              _buildSectionTitle('受理人', required: true),
              SizedBox(height: 8.h),
              _buildAssigneeField(),
              SizedBox(height: 20.h),
              
              // 截止日期
              _buildSectionTitle('截止日期'),
              SizedBox(height: 8.h),
              _buildDueDateSelector(),
              SizedBox(height: 40.h),
              
              // 提交按钮
              SizedBox(
                width: double.infinity,
                height: 50.h,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitWorkOrder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          '创建工单',
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  /// 章节标题
  Widget _buildSectionTitle(String title, {bool required = false}) {
    return Row(
      children: [
        if (required)
          Padding(
            padding: EdgeInsets.only(right: 4.w),
            child: Text(
              '*',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.error,
              ),
            ),
          ),
        Text(
          title,
          style: TextStyle(
            fontSize: 16.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
  
  /// 文本输入框
  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: TextStyle(fontSize: 15.sp),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppColors.textHint),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.error),
        ),
      ),
    );
  }
  
  /// 任务类型选择器
  Widget _buildTypeSelector() {
    return Wrap(
      spacing: 10.w,
      runSpacing: 10.h,
      children: _taskTypes.map((type) {
        final isSelected = _selectedType?['id'] == type['id'];
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedType = type;
            });
          },
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(20.r),
              border: Border.all(
                color: isSelected ? AppColors.primary : AppColors.divider,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Text(
              type['type_name'],
              style: TextStyle(
                fontSize: 14.sp,
                color: isSelected ? Colors.white : AppColors.textPrimary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
  
  /// 优先级选择器
  Widget _buildPrioritySelector() {
    return Row(
      children: _priorities.map((priority) {
        final isSelected = _selectedPriority?['id'] == priority['id'];
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: priority['id'] == 3 ? 0 : 10.w),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedPriority = priority;
                });
              },
              child: Container(
                padding: EdgeInsets.symmetric(vertical: 12.h),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(12.r),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.divider,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    priority['priority_name'],
                    style: TextStyle(
                      fontSize: 15.sp,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
  
  /// 截止日期选择器
  Widget _buildDueDateSelector() {
    return GestureDetector(
      onTap: _selectDueDate,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: AppColors.divider),
        ),
        child: Row(
          children: [
            Icon(
              Icons.calendar_today,
              color: AppColors.primary,
              size: 20.w,
            ),
            SizedBox(width: 12.w),
            Text(
              _selectedDueDate != null
                  ? _formatDate(_selectedDueDate!)
                  : '请选择截止日期（可选）',
              style: TextStyle(
                fontSize: 15.sp,
                color: _selectedDueDate != null 
                    ? AppColors.textPrimary 
                    : AppColors.textHint,
              ),
            ),
            const Spacer(),
            if (_selectedDueDate != null)
              GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedDueDate = null;
                  });
                },
                child: Icon(
                  Icons.close,
                  color: AppColors.textSecondary,
                  size: 20.w,
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  /// 门店选择器
  Widget _buildShopSelector() {
    return InkWell(
      onTap: () => _showShopPicker(),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(
            color: _selectedShop != null ? AppColors.primary : Colors.grey[300]!,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.store,
              color: _selectedShop != null ? AppColors.primary : AppColors.textHint,
              size: 20.w,
            ),
            SizedBox(width: 12.w),
            Text(
              _selectedShop != null
                  ? (_selectedShop!['name'] ?? '未命名门店')
                  : '请选择所属门店',
              style: TextStyle(
                fontSize: 15.sp,
                color: _selectedShop != null 
                    ? AppColors.textPrimary 
                    : AppColors.textHint,
              ),
            ),
            const Spacer(),
            Icon(
              Icons.arrow_forward_ios,
              color: AppColors.textSecondary,
              size: 16.w,
            ),
          ],
        ),
      ),
    );
  }
  
  /// 显示门店选择器
  void _showShopPicker() {
    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (context) => Container(
        padding: EdgeInsets.all(20.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '选择门店',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 20.h),
            ..._shops.map((shop) => ListTile(
              leading: Icon(Icons.store, color: AppColors.primary),
              title: Text(shop['name'] ?? '未命名门店'),
              subtitle: Text(shop['address'] ?? ''),
              trailing: _selectedShop?['id'] == shop['id']
                  ? Icon(Icons.check_circle, color: AppColors.primary)
                  : null,
              onTap: () {
                setState(() {
                  _selectedShop = shop;
                });
                Navigator.pop(context);
              },
            )).toList(),
          ],
        ),
      ),
    );
  }
  
  /// 受理人输入框
  Widget _buildAssigneeField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _assigneeNameController,
          decoration: InputDecoration(
            hintText: '输入受理人姓名（如：李店长）',
            filled: true,
            fillColor: Colors.grey[50],
            contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12.r),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12.r),
              borderSide: BorderSide(
                color: _assigneeError != null ? AppColors.error : Colors.grey[300]!,
                width: 1.5,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12.r),
              borderSide: BorderSide(
                color: _assigneeError != null ? AppColors.error : AppColors.primary,
                width: 1.5,
              ),
            ),
            suffixIcon: _isSearchingAssignee
                ? Padding(
                    padding: EdgeInsets.all(12.w),
                    child: SizedBox(
                      width: 20.w,
                      height: 20.w,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ),
                  )
                : _assigneeUser != null
                    ? Icon(Icons.check_circle, color: AppColors.success, size: 24.w)
                    : _assigneeError != null
                        ? Icon(Icons.error, color: AppColors.error, size: 24.w)
                        : null,
          ),
          onChanged: (value) {
            // 防抖搜索
            Future.delayed(const Duration(milliseconds: 500), () {
              if (_assigneeNameController.text == value) {
                _searchAssignee(value);
              }
            });
          },
        ),
        
        // 显示验证结果
        if (_assigneeError != null) ...[
          SizedBox(height: 8.h),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
            decoration: BoxDecoration(
              color: AppColors.error.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8.r),
              border: Border.all(
                color: AppColors.error.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, size: 16.w, color: AppColors.error),
                SizedBox(width: 8.w),
                Expanded(
                  child: Text(
                    _assigneeError!,
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        
        if (_assigneeUser != null) ...[
          SizedBox(height: 8.h),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8.r),
              border: Border.all(
                color: AppColors.success.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle_outline, size: 16.w, color: AppColors.success),
                SizedBox(width: 8.w),
                Expanded(
                  child: Text(
                    '已找到：${_assigneeUser!['real_name']} (${_assigneeUser!['username']})',
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.success,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
  
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
