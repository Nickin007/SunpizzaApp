import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import PortalSelect from '../pages/PortalSelect';
import DeliveryLayout from '../layouts/DeliveryLayout';
import PortalLayout, { THEMES } from '../layouts/PortalLayout';
import DeliveryWelcome from '../pages/Delivery/Welcome';
import PlaceholderPage from '../pages/Placeholder';
import UserManagement from '../pages/Admin/UserManagement';
// 饿了么页面
import ElemeSiteSelection from '../pages/Delivery/Eleme/SiteSelectionV2';
import ElemeCostAnalysis from '../pages/Delivery/Eleme/CostAnalysis';
import ElemeExcelToolkit from '../pages/Delivery/Eleme/ExcelToolkit';
// 美团外卖页面（占位）
import MeituanCostAnalysis from '../pages/Delivery/Meituan/CostAnalysis';
// 财务后台页面
import AccountingCostAnalysis from '../pages/Accounting/CostAnalysis';
import AccountingBooks from '../pages/Accounting/Books';
import AccountingSubjects from '../pages/Accounting/Subjects';
import AccountingVoucherForm from '../pages/Accounting/VoucherForm';
import AccountingVoucherList from '../pages/Accounting/VoucherList';
import AccountingWelcome from '../pages/Accounting/Welcome';
import AccountingItemManage from '../pages/Accounting/ItemManage';
import AccountingReports from '../pages/Accounting/Reports';
// AI Agent 后台页面
import AgentChat from '../pages/Agent/Chat';
import AgentLayout from '../layouts/AgentLayout';
// 模型压力测试页面
import CompanyModel from '../pages/ModelTest/CompanyModel';
import StoreModel from '../pages/ModelTest/StoreModel';
// 供应链页面
import SCDashboard from '../pages/SupplyChain/Dashboard';
import SCProductManage from '../pages/SupplyChain/ProductManage';
import SCStoreManage from '../pages/SupplyChain/StoreManage';
import SCWarehouseManage from '../pages/SupplyChain/WarehouseManage';
import SCShopOrder from '../pages/SupplyChain/ShopOrder';
import SCShopOrderHistory from '../pages/SupplyChain/ShopOrderHistory';
import SCOrderReview from '../pages/SupplyChain/OrderReview';
import SCWarehouseShip from '../pages/SupplyChain/WarehouseShip';
import SCInventoryManage from '../pages/SupplyChain/InventoryManage';
import SCReports from '../pages/SupplyChain/Reports';
import { useAuthStore } from '../store/authStore';
// 图标
import {
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  AppstoreOutlined,
  ShopOutlined,
  DollarOutlined,
  SettingOutlined,
  BookOutlined,
  FormOutlined,
  AuditOutlined,
  SearchOutlined,
  RobotOutlined,
  MessageOutlined,
  ExperimentOutlined,
  BankOutlined,
  InboxOutlined,
  SendOutlined,
  BarChartOutlined,
  HomeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

// 路由守卫 - 检查是否登录
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// 角色守卫 - 检查角色权限（支持多角色）
const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !user.roles?.some(r => allowedRoles.includes(r))) return <Navigate to="/portal-select" replace />;
  return <>{children}</>;
};

// 供应链布局 wrapper —— 根据用户角色动态生成菜单
const SupplyChainLayoutWrapper = () => {
  const user = useAuthStore(state => state.user);
  return <PortalLayout title="供应链数字化后台" theme={THEMES.green} menuItems={getSupplyChainMenu(user?.roles)} />;
};

// ========== 各门户侧边栏菜单配置 ==========
const getSupplyChainMenu = (roles?: string[]) => {
  const adminRoles = ['admin', 'SupplyChain_operation'];
  const isAdmin = roles?.some(r => adminRoles.includes(r));
  const isWarehouse = roles?.includes('warehouse_admin');
  const isStore = roles?.includes('store_manager');

  const menu: any[] = [
    { key: '/supply-chain/dashboard', icon: <DashboardOutlined />, label: '首页' },
  ];

  if (isStore) {
    menu.push(
      { key: '/supply-chain/shop-order', icon: <ShoppingCartOutlined />, label: '门店订货' },
      { key: '/supply-chain/shop-orders', icon: <HistoryOutlined />, label: '订单历史' },
    );
  }

  if (isAdmin) {
    menu.push(
      { key: '/supply-chain/products', icon: <AppstoreOutlined />, label: '货品管理' },
      { key: '/supply-chain/stores', icon: <ShopOutlined />, label: '门店管理' },
      { key: '/supply-chain/warehouses', icon: <HomeOutlined />, label: '仓库管理' },
      { key: '/supply-chain/order-review', icon: <AuditOutlined />, label: '订单审核' },
      { key: '/supply-chain/inventory', icon: <DatabaseOutlined />, label: '库存管理' },
      { key: '/supply-chain/reports', icon: <BarChartOutlined />, label: '报表统计' },
    );
  }

  if (isWarehouse) {
    menu.push(
      { key: '/supply-chain/warehouse-ship', icon: <SendOutlined />, label: '订单处理' },
      { key: '/supply-chain/inventory', icon: <DatabaseOutlined />, label: '库存管理' },
    );
  }

  return menu;
};

const accountingMenu = [
  {
    key: '/accounting/welcome',
    icon: <DashboardOutlined />,
    label: '首页',
  },
  {
    key: 'finance-module',
    icon: <BookOutlined />,
    label: '财务模块',
    children: [
      { key: '/accounting/books', icon: <BookOutlined />, label: '账套管理' },
      { key: '/accounting/subjects', icon: <DatabaseOutlined />, label: '科目管理' },
      { key: '/accounting/voucher/new', icon: <FormOutlined />, label: '凭证录入' },
      { key: '/accounting/vouchers', icon: <SearchOutlined />, label: '凭证查询' },
      { key: '/accounting/items', icon: <AppstoreOutlined />, label: '核算项目' },
      { key: '/accounting/reports', icon: <BarChartOutlined />, label: '财务报表' },
    ],
  },
  {
    key: '/accounting/cost-analysis',
    icon: <DollarOutlined />,
    label: '成本分析',
  },
];

const douyinMenu = [
  {
    key: '/douyin/welcome',
    icon: <DashboardOutlined />,
    label: '首页',
  },
  {
    key: '/douyin/operation',
    icon: <VideoCameraOutlined />,
    label: '抖音运营',
  },
  {
    key: '/douyin/miniapp',
    icon: <AppstoreOutlined />,
    label: '小程序管理',
  },
  {
    key: '/douyin/offline',
    icon: <ShopOutlined />,
    label: '线下门店',
  },
];

const adminMenu = [
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: '账号管理',
  },
];


const modelTestMenu = [
  {
    key: '/model-test/company',
    icon: <BankOutlined />,
    label: '公司模型',
  },
  {
    key: '/model-test/store',
    icon: <ShopOutlined />,
    label: '单店模型',
  },
];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Navigate to="/portal-select" replace />,
  },
  // 门户选择页
  {
    path: '/portal-select',
    element: <PrivateRoute><PortalSelect /></PrivateRoute>,
  },
  // ========== 外卖运营路由 ==========
  {
    path: '/delivery',
    element: (
      <RoleRoute allowedRoles={['admin', 'delivery_operation']}>
        <DeliveryLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/delivery/welcome" replace /> },
      { path: 'welcome', element: <DeliveryWelcome /> },
      { path: 'site-selection', element: <ElemeSiteSelection /> },
      { path: 'eleme/excel-toolkit', element: <ElemeExcelToolkit /> },
    ],
  },
  // ========== 供应链后台 ==========
  {
    path: '/supply-chain',
    element: (
      <RoleRoute allowedRoles={['admin', 'SupplyChain_operation', 'warehouse_admin', 'store_manager']}>
        <SupplyChainLayoutWrapper />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/supply-chain/dashboard" replace /> },
      { path: 'dashboard', element: <SCDashboard /> },
      { path: 'products', element: <SCProductManage /> },
      { path: 'stores', element: <SCStoreManage /> },
      { path: 'warehouses', element: <SCWarehouseManage /> },
      { path: 'shop-order', element: <SCShopOrder /> },
      { path: 'shop-orders', element: <SCShopOrderHistory /> },
      { path: 'order-review', element: <SCOrderReview /> },
      { path: 'warehouse-ship', element: <SCWarehouseShip /> },
      { path: 'inventory', element: <SCInventoryManage /> },
      { path: 'reports', element: <SCReports /> },
    ],
  },
  // ========== 财务后台 ==========
  {
    path: '/accounting',
    element: (
      <RoleRoute allowedRoles={['admin', 'Accouting_operation']}>
        <PortalLayout title="财务数字化后台" theme={THEMES.orange} menuItems={accountingMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/accounting/welcome" replace /> },
      {
        path: 'welcome',
        element: <AccountingWelcome />,
      },
      { path: 'books', element: <AccountingBooks /> },
      { path: 'subjects', element: <AccountingSubjects /> },
      { path: 'voucher/new', element: <AccountingVoucherForm /> },
      { path: 'voucher/edit/:id', element: <AccountingVoucherForm /> },
      { path: 'vouchers', element: <AccountingVoucherList /> },
      { path: 'cost-analysis', element: <AccountingCostAnalysis /> },
      { path: 'items', element: <AccountingItemManage /> },
      { path: 'reports', element: <AccountingReports /> },
    ],
  },
  // ========== 抖音/小程序后台 ==========
  {
    path: '/douyin',
    element: (
      <RoleRoute allowedRoles={['admin', 'DouyinANDOffline_operation']}>
        <PortalLayout title="抖音/小程序数字化后台" theme={THEMES.purple} menuItems={douyinMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/douyin/welcome" replace /> },
      {
        path: 'welcome',
        element: <PlaceholderPage title="抖音/小程序数字化后台" description="抖音运营、小程序管理、线下门店数据分析" color="#722ed1" />,
      },
      {
        path: 'operation',
        element: <PlaceholderPage title="抖音运营" description="短视频数据、直播管理、营销活动" color="#722ed1" />,
      },
      {
        path: 'miniapp',
        element: <PlaceholderPage title="小程序管理" description="小程序订单、用户分析、活动配置" color="#722ed1" />,
      },
      {
        path: 'offline',
        element: <PlaceholderPage title="线下门店" description="门店数据、堂食分析、运营报表" color="#722ed1" />,
      },
    ],
  },
  // ========== 账号权限管理后台 ==========
  {
    path: '/admin',
    element: (
      <RoleRoute allowedRoles={['admin']}>
        <PortalLayout title="账号权限管理后台" theme={THEMES.red} menuItems={adminMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', element: <UserManagement /> },
    ],
  },
  // ========== AI Agent 后台 ==========
  {
    path: '/agent',
    element: (
      <RoleRoute allowedRoles={['admin']}>
        <AgentLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/agent/chat" replace /> },
      { path: 'chat', element: <AgentChat /> },
    ],
  },
  // ========== 模型压力测试 ==========
  {
    path: '/model-test',
    element: (
      <RoleRoute allowedRoles={['admin', 'model_operation']}>
        <PortalLayout title="模型压力测试" theme={THEMES.geekblue} menuItems={modelTestMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/model-test/company" replace /> },
      { path: 'company', element: <CompanyModel /> },
      { path: 'store', element: <StoreModel /> },
    ],
  },
  // 404 处理
  {
    path: '*',
    element: <Navigate to="/portal-select" replace />,
  },
]);

export default router;
