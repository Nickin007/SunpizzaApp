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
// 饿了么页面（新架构）
import ElemeDataBoard from '../pages/Delivery/Eleme/DataBoard';
import ElemeDiagnosis from '../pages/Delivery/Eleme/Diagnosis';
import ElemeCostMapping from '../pages/Delivery/Eleme/CostMapping';
import ElemeDataUpload from '../pages/Delivery/Eleme/DataUpload';
// 美团外卖页面（新架构）
import MeituanDataBoard from '../pages/Delivery/Meituan/DataBoard';
import MeituanDiagnosis from '../pages/Delivery/Meituan/Diagnosis';
import MeituanCostMapping from '../pages/Delivery/Meituan/CostMapping';
import MeituanDataUpload from '../pages/Delivery/Meituan/DataUpload';
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
      // 饿了么路由（新架构）
      {
        path: 'eleme/databoard',
        element: <ElemeDataBoard />,
      },
      {
        path: 'eleme/diagnosis',
        element: <ElemeDiagnosis />,
      },
      {
        path: 'eleme/cost-mapping',
        element: <ElemeCostMapping />,
      },
      {
        path: 'eleme/upload',
        element: <ElemeDataUpload />,
      },
      // 美团外卖路由（新架构）
      {
        path: 'meituan/databoard',
        element: <MeituanDataBoard />,
      },
      {
        path: 'meituan/diagnosis',
        element: <MeituanDiagnosis />,
      },
      {
        path: 'meituan/cost-mapping',
        element: <MeituanCostMapping />,
      },
      {
        path: 'meituan/upload',
        element: <MeituanDataUpload />,
      },
    ],
  },
]);

export default router;

