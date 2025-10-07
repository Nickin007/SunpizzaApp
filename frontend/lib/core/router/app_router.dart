import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/main/main_screen.dart';
import '../../screens/work_orders/work_order_detail_screen.dart';
import '../../screens/work_orders/create_work_order_screen.dart';
import '../../screens/training/course_detail_screen.dart';

/// 应用路由配置
class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      // 登录
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      
      // 主框架（包含底部导航栏）
      GoRoute(
        path: '/main',
        name: 'main',
        builder: (context, state) {
          final tab = state.uri.queryParameters['tab'];
          return MainScreen(initialTab: tab);
        },
      ),
      
      // 工单详情
      GoRoute(
        path: '/work-order/:id',
        name: 'work-order-detail',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return WorkOrderDetailScreen(workOrderId: id);
        },
      ),
      
      // 创建工单
      GoRoute(
        path: '/create-work-order',
        name: 'create-work-order',
        builder: (context, state) => const CreateWorkOrderScreen(),
      ),
      
      // 课程详情
      GoRoute(
        path: '/course/:id',
        name: 'course-detail',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return CourseDetailScreen(courseId: id);
        },
      ),
    ],
  );
}
