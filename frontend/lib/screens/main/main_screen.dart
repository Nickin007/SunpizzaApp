import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_colors.dart';
import '../home/dashboard_screen.dart';
import '../work_orders/work_order_center_screen.dart';
import '../training/training_center_screen.dart';
import '../profile/profile_center_screen.dart';

/// 主框架页面 - 包含底部导航栏
class MainScreen extends StatefulWidget {
  final String? initialTab;

  const MainScreen({super.key, this.initialTab});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const DashboardScreen(),
    const WorkOrderCenterScreen(),
    const TrainingCenterScreen(),
    const ProfileCenterScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // 根据初始tab参数设置当前索引
    if (widget.initialTab != null) {
      switch (widget.initialTab) {
        case 'home':
          _currentIndex = 0;
          break;
        case 'work':
          _currentIndex = 1;
          break;
        case 'training':
          _currentIndex = 2;
          break;
        case 'profile':
          _currentIndex = 3;
          break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: SafeArea(
          child: Container(
            height: 56.h,
            padding: EdgeInsets.symmetric(vertical: 4.h),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, Icons.home_outlined, Icons.home, '首页'),
                _buildNavItem(1, Icons.assignment_outlined, Icons.assignment, '店务'),
                _buildNavItem(2, Icons.school_outlined, Icons.school, '培训'),
                _buildNavItem(3, Icons.person_outline, Icons.person, '我的'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// 构建导航项
  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;
    
    // 检测是否是iPad（屏幕宽度大于600）
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentIndex = index;
        });
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(
          horizontal: 10.w,
          vertical: isTablet ? 1.h : 2.h, // iPad减小垂直padding
        ),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    AppColors.primary.withOpacity(0.1),
                    AppColors.primaryLight.withOpacity(0.05),
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(12.r),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? activeIcon : icon,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
              size: isTablet ? 22.w : 23.w, // iPad稍微减小图标
            ),
            SizedBox(height: isTablet ? 0.5.h : 1.h), // iPad减小间距
            Text(
              label,
              style: TextStyle(
                fontSize: isTablet ? 9.sp : 9.5.sp, // iPad稍微减小字体
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}


