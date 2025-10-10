import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/course_card.dart';
import '../../services/training_service.dart';

/// 培训中心
class TrainingCenterScreen extends StatefulWidget {
  const TrainingCenterScreen({super.key});

  @override
  State<TrainingCenterScreen> createState() => _TrainingCenterScreenState();
}

class _TrainingCenterScreenState extends State<TrainingCenterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TrainingService _trainingService = TrainingService();
  
  final List<Map<String, String>> _categories = [
    {'name': '全部', 'type': ''},
    {'name': '产品类', 'type': 'product'},
    {'name': '服务类', 'type': 'service'},
    {'name': '运营类', 'type': 'operation'},
  ];
  
  Map<String, List<Map<String, dynamic>>> _coursesData = {};
  Map<String, bool> _isLoading = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
    
    // 初始化加载状态
    for (var category in _categories) {
      _coursesData[category['name']!] = [];
      _isLoading[category['name']!] = false;
    }
    
    // 加载所有分类的课程
    for (var category in _categories) {
      _loadCourses(category['name']!, category['type']!);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  /// 加载课程列表
  Future<void> _loadCourses(String categoryName, String categoryType) async {
    if (_isLoading[categoryName]!) return;
    
    setState(() {
      _isLoading[categoryName] = true;
    });
    
    try {
      List<Map<String, dynamic>> courses;
      
      if (categoryType.isEmpty) {
        // 加载全部课程
        courses = await _trainingService.getCourses();
      } else {
        // 按分类加载（需要先获取分类ID）
        final categories = await _trainingService.getCategories(type: categoryType);
        if (categories.isNotEmpty) {
          courses = await _trainingService.getCourses(
            categoryId: categories[0]['id'],
          );
        } else {
          courses = [];
        }
      }
      
      setState(() {
        _coursesData[categoryName] = courses;
        _isLoading[categoryName] = false;
      });
    } catch (e) {
      print('加载课程失败: $e');
      setState(() {
        _isLoading[categoryName] = false;
      });
      
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
        title: const Text('培训中心'),
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
              tabs: _categories.map((category) {
                return Tab(text: category['name']);
              }).toList(),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _categories.map((category) {
          return _buildCourseGrid(category['name']!, category['type']!);
        }).toList(),
      ),
    );
  }

  Widget _buildCourseGrid(String categoryName, String categoryType) {
    final courses = _coursesData[categoryName] ?? [];
    final isLoading = _isLoading[categoryName] ?? false;
    
    if (isLoading && courses.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }
    
    if (courses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.school_outlined,
              size: 64.w,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16.h),
            Text(
              '暂无课程',
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
      onRefresh: () => _loadCourses(categoryName, categoryType),
      child: GridView.builder(
        padding: EdgeInsets.all(16.w),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12.w,
          mainAxisSpacing: 12.h,
          childAspectRatio: 0.75,
        ),
        itemCount: courses.length,
        itemBuilder: (context, index) {
          final course = courses[index];
          
          // 确定学习状态
          String status = '未开始';
          if (course['learning_record'] != null) {
            final record = course['learning_record'];
            if (record['completed'] == true) {
              status = '已完成';
            } else {
              status = '学习中';
            }
          }
          
          // 检查考试状态
          if (course['exam_submission'] != null) {
            final examStatus = course['exam_submission']['status'];
            if (examStatus == 'passed') {
              status = '已通过';
            } else if (examStatus == 'failed') {
              status = '未通过';
            } else if (examStatus == 'pending_review') {
              status = '待审核';
            }
          }
          
          return CourseCard(
            title: course['title'] ?? '未命名课程',
            description: course['description'] ?? '',
            status: status,
            coverUrl: null, // 暂不支持封面
            onTap: () {
              context.push('/course/${course['id']}');
            },
          );
        },
      ),
    );
  }
}


