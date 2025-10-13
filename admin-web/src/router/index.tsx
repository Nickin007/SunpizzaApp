import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import MainLayout from '../layouts/MainLayout';
import DeliveryLayout from '../layouts/DeliveryLayout';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Shops from '../pages/Shops';
import WorkOrders from '../pages/WorkOrders';
import Dict from '../pages/Dict';
import Training from '../pages/Training';
import DeliveryWelcome from '../pages/Delivery/Welcome';
// 饿了么数据分析页面
import ElemeStore from '../pages/Delivery/Analysis/Eleme/Store';
import ElemeOrder from '../pages/Delivery/Analysis/Eleme/Order';
import ElemeProduct from '../pages/Delivery/Analysis/Eleme/Product';
import ElemeReview from '../pages/Delivery/Analysis/Eleme/Review';
import ElemeGrowth from '../pages/Delivery/Analysis/Eleme/Growth';
import ElemeFans from '../pages/Delivery/Analysis/Eleme/Fans';
// 美团外卖数据分析页面
import MeituanBrand from '../pages/Delivery/Analysis/Meituan/Brand';
import MeituanStore from '../pages/Delivery/Analysis/Meituan/Store';
import MeituanOrder from '../pages/Delivery/Analysis/Meituan/Order';
import MeituanProduct from '../pages/Delivery/Analysis/Meituan/Product';
import MeituanReview from '../pages/Delivery/Analysis/Meituan/Review';
import MeituanFans from '../pages/Delivery/Analysis/Meituan/Fans';
import { useAuthStore } from '../store/authStore';

// 路由守卫组件 - 检查是否登录
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// 角色路由守卫 - 根据角色重定向
const RoleBasedRedirect = () => {
  const user = useAuthStore(state => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // 外卖运营角色跳转到外卖运营系统
  if (user.role === 'delivery_operation') {
    return <Navigate to="/delivery/welcome" replace />;
  }
  
  // 其他角色（admin, regional_manager, shop_manager）跳转到管理后台
  return <Navigate to="/admin/dashboard" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <PrivateRoute><RoleBasedRedirect /></PrivateRoute>,
  },
  // 管理后台路由（admin, regional_manager, shop_manager）
  {
    path: '/admin',
    element: <PrivateRoute><MainLayout /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'shops',
        element: <Shops />,
      },
      {
        path: 'work-orders',
        element: <WorkOrders />,
      },
      {
        path: 'dict',
        element: <Dict />,
      },
      {
        path: 'training',
        element: <Training />,
      },
    ],
  },
  // 外卖运营路由（delivery_operation）
  {
    path: '/delivery',
    element: <PrivateRoute><DeliveryLayout /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/delivery/welcome" replace />,
      },
      {
        path: 'welcome',
        element: <DeliveryWelcome />,
      },
      // 饿了么数据分析路由
      {
        path: 'eleme/store',
        element: <ElemeStore />,
      },
      {
        path: 'eleme/order',
        element: <ElemeOrder />,
      },
      {
        path: 'eleme/product',
        element: <ElemeProduct />,
      },
      {
        path: 'eleme/review',
        element: <ElemeReview />,
      },
      {
        path: 'eleme/growth',
        element: <ElemeGrowth />,
      },
      {
        path: 'eleme/fans',
        element: <ElemeFans />,
      },
      // 美团外卖数据分析路由
      {
        path: 'meituan/brand',
        element: <MeituanBrand />,
      },
      {
        path: 'meituan/store',
        element: <MeituanStore />,
      },
      {
        path: 'meituan/order',
        element: <MeituanOrder />,
      },
      {
        path: 'meituan/product',
        element: <MeituanProduct />,
      },
      {
        path: 'meituan/review',
        element: <MeituanReview />,
      },
      {
        path: 'meituan/fans',
        element: <MeituanFans />,
      },
    ],
  },
]);

export default router;

