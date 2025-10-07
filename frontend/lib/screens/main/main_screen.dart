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
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        selectedFontSize: 12.sp,
        unselectedFontSize: 12.sp,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: '首页',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.assignment_outlined),
            activeIcon: Icon(Icons.assignment),
            label: '店务',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.school_outlined),
            activeIcon: Icon(Icons.school),
            label: '培训',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: '我的',
          ),
        ],
      ),
    );
  }
}


