import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/course_card.dart';

/// 培训中心
class TrainingCenterScreen extends StatefulWidget {
  const TrainingCenterScreen({super.key});

  @override
  State<TrainingCenterScreen> createState() => _TrainingCenterScreenState();
}

class _TrainingCenterScreenState extends State<TrainingCenterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  final List<String> _categories = ['全部', '产品类', '服务类', '运营类'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
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
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              isScrollable: false,
              labelStyle: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
              ),
              tabs: _categories.map((category) {
                return Tab(text: category);
              }).toList(),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _categories.map((category) {
          return _buildCourseGrid(category);
        }).toList(),
      ),
    );
  }

  Widget _buildCourseGrid(String category) {
    // 模拟课程数据
    final mockCourses = List.generate(
      8,
      (index) => {
        'id': index + 1,
        'title': '${category == '全部' ? '产品' : category.replaceAll('类', '')}培训课程 ${index + 1}',
        'description': '这是课程描述，介绍课程的主要内容和学习目标...',
        'status': index % 3 == 0 ? '未开始' : (index % 2 == 0 ? '学习中' : '已通过'),
        'coverUrl': null,
      },
    );

    return RefreshIndicator(
      onRefresh: () async {
        await Future.delayed(const Duration(seconds: 1));
      },
      child: GridView.builder(
        padding: EdgeInsets.all(16.w),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12.w,
          mainAxisSpacing: 12.h,
          childAspectRatio: 0.75,
        ),
        itemCount: mockCourses.length,
        itemBuilder: (context, index) {
          final course = mockCourses[index];
          return CourseCard(
            title: course['title'] as String,
            description: course['description'] as String,
            status: course['status'] as String,
            coverUrl: course['coverUrl'] as String?,
            onTap: () {
              context.push('/course/${course['id']}');
            },
          );
        },
      ),
    );
  }
}


