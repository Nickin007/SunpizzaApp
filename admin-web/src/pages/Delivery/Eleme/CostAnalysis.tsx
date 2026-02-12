import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Upload,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Select,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
  Empty,
  Collapse,
  Typography,
  Steps,
  Divider,
  Progress,
} from 'antd';
import {
  DollarOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ShopOutlined,
  ExperimentOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  SwapOutlined,
  SettingOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  FileExcelOutlined,
  FilterOutlined,
  SplitCellsOutlined,
  LinkOutlined,
  CalculatorOutlined,
  FileSearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import * as costAnalysisApi from '../../../api/costAnalysis';
import type {
  AnalyzableStore,
  ProductRecipeCard,
  IngredientCost,
  ProductNameMapping,
  UnmappedProduct,
  UnmappedDetail,
  ParserInfo,
  PreviewResult,
  MatrixAnalysisResult,
  ImportConfigResult,
} from '../../../api/costAnalysis';
import './CostAnalysis.css';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;
const { Step } = Steps;

const ElemeCostAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('analysis');
  const [configSubTab, setConfigSubTab] = useState('stores');

  // 解析算法状态
  const [parsers, setParsers] = useState<ParserInfo[]>([]);
  const [selectedParser, setSelectedParser] = useState<string>('order_parser');

  // 可分析门店状态
  const [stores, setStores] = useState<AnalyzableStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [addStoreModalVisible, setAddStoreModalVisible] = useState(false);
  const [batchAddModalVisible, setBatchAddModalVisible] = useState(false);
  const [storeForm] = Form.useForm();
  const [batchStoreForm] = Form.useForm();
  const [selectedStoreKeys, setSelectedStoreKeys] = useState<React.Key[]>([]);

  // 源商品原料卡状态
  const [recipes, setRecipes] = useState<ProductRecipeCard[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [addRecipeModalVisible, setAddRecipeModalVisible] = useState(false);
  const [batchRecipeModalVisible, setBatchRecipeModalVisible] = useState(false);
  const [recipeForm] = Form.useForm();
  const [batchRecipeForm] = Form.useForm();
  const [recipeProducts, setRecipeProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedRecipeKeys, setSelectedRecipeKeys] = useState<React.Key[]>([]);

  // 原料成本状态
  const [ingredients, setIngredients] = useState<IngredientCost[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [addIngredientModalVisible, setAddIngredientModalVisible] = useState(false);
  const [batchIngredientModalVisible, setBatchIngredientModalVisible] = useState(false);
  const [ingredientForm] = Form.useForm();
  const [batchIngredientForm] = Form.useForm();
  const [selectedIngredientKeys, setSelectedIngredientKeys] = useState<React.Key[]>([]);

  // 分析结果状态
  const [analysisResult, setAnalysisResult] = useState<MatrixAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 预览状态
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 源商品名称映射状态
  const [mappings, setMappings] = useState<ProductNameMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [addMappingModalVisible, setAddMappingModalVisible] = useState(false);
  const [batchMappingModalVisible, setBatchMappingModalVisible] = useState(false);
  const [mappingForm] = Form.useForm();
  const [batchMappingForm] = Form.useForm();
  const [sourceNames, setSourceNames] = useState<string[]>([]);
  const [selectedSourceName, setSelectedSourceName] = useState<string>('');
  const [unmappedProducts, setUnmappedProducts] = useState<UnmappedProduct[]>([]);
  const [unmappedLoading, setUnmappedLoading] = useState(false);
  const [mappingFileList, setMappingFileList] = useState<UploadFile[]>([]);
  const [selectedMappingKeys, setSelectedMappingKeys] = useState<React.Key[]>([]);
  const [unmappedDetailVisible, setUnmappedDetailVisible] = useState(false);
  const [unmappedDetailProduct, setUnmappedDetailProduct] = useState<UnmappedProduct | null>(null);
  const [unmappedStats, setUnmappedStats] = useState<{ total: number; mapped: number; unmapped: number } | null>(null);

  // 一站式导入状态
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportConfigResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 订单解析进度状态
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const analysisTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载解析算法
  useEffect(() => {
    loadParsers();
  }, []);

  // 加载配置数据
  useEffect(() => {
    if (activeTab === 'config') {
      if (configSubTab === 'stores') {
        loadStores();
      } else if (configSubTab === 'mappings') {
        loadMappings();
        loadSourceNames();
      } else if (configSubTab === 'recipes') {
        loadRecipes();
        loadRecipeProducts();
      } else if (configSubTab === 'ingredients') {
        loadIngredients();
      }
    }
  }, [activeTab, configSubTab]);

  // ==================== 解析算法功能 ====================

  // ==================== 一站式导入功能 ====================

  const handleImportConfig = async () => {
    if (!importFile) {
      message.error('请先选择配置文件');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await costAnalysisApi.importConfig(importFile, importMode);
      if (response.data.code === 200) {
        setImportResult(response.data.data);
        message.success(response.data.message || '导入成功');
        // 刷新所有配置数据
        loadStores();
        loadMappings();
        loadRecipes();
        loadIngredients();
      } else {
        message.error(response.data.message || '导入失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const loadParsers = async () => {
    try {
      const response = await costAnalysisApi.getParsers();
      if (response.data.code === 200) {
        setParsers(response.data.data);
        if (response.data.data.length > 0 && !selectedParser) {
          setSelectedParser(response.data.data[0].name);
        }
      }
    } catch (error) {
      console.error('加载解析算法失败');
    }
  };

  // ==================== 可分析门店功能 ====================

  const loadStores = async () => {
    setStoresLoading(true);
    try {
      const response = await costAnalysisApi.getStores();
      if (response.data.code === 200) {
        setStores(response.data.data);
      }
    } catch (error) {
      message.error('加载门店列表失败');
    } finally {
      setStoresLoading(false);
    }
  };

  const handleAddStore = async () => {
    try {
      const values = await storeForm.validateFields();
      const response = await costAnalysisApi.addStore(values.store_name);
      if (response.data.code === 200) {
        message.success(response.data.message || '添加成功');
        setAddStoreModalVisible(false);
        storeForm.resetFields();
        loadStores();
      } else {
        message.error(response.data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleBatchAddStores = async () => {
    try {
      const values = await batchStoreForm.validateFields();
      const storeNames = values.store_names
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s);
      if (storeNames.length === 0) {
        message.warning('请输入至少一个门店名称');
        return;
      }
      const response = await costAnalysisApi.batchAddStores(storeNames);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量添加成功');
        setBatchAddModalVisible(false);
        batchStoreForm.resetFields();
        loadStores();
      } else {
        message.error(response.data.message || '批量添加失败');
      }
    } catch (error) {
      message.error('批量添加失败');
    }
  };

  const handleDeleteStore = async (storeId: number) => {
    try {
      const response = await costAnalysisApi.deleteStore(storeId);
      if (response.data.code === 200) {
        message.success('删除成功');
        loadStores();
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteStores = async () => {
    if (selectedStoreKeys.length === 0) {
      message.warning('请选择要删除的门店');
      return;
    }
    try {
      const response = await costAnalysisApi.batchDeleteStores(selectedStoreKeys as number[]);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量删除成功');
        setSelectedStoreKeys([]);
        loadStores();
      } else {
        message.error(response.data.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const storeColumns: ColumnsType<AnalyzableStore> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: unknown, __: AnalyzableStore, index: number) => index + 1,
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AnalyzableStore) => (
        <Popconfirm
          title="确定要删除此门店吗？"
          onConfirm={() => handleDeleteStore(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // ==================== 源商品原料卡功能 ====================

  const loadRecipes = async () => {
    setRecipesLoading(true);
    try {
      const response = await costAnalysisApi.getRecipes(selectedProduct || undefined);
      if (response.data.code === 200) {
        setRecipes(response.data.data);
      }
    } catch (error) {
      message.error('加载原料卡失败');
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadRecipeProducts = async () => {
    try {
      const response = await costAnalysisApi.getRecipeProducts();
      if (response.data.code === 200) {
        setRecipeProducts(response.data.data);
      }
    } catch (error) {
      console.error('加载源商品列表失败');
    }
  };

  const handleAddRecipe = async () => {
    try {
      const values = await recipeForm.validateFields();
      const response = await costAnalysisApi.addRecipe(values);
      if (response.data.code === 200) {
        message.success(response.data.message || '添加成功');
        setAddRecipeModalVisible(false);
        recipeForm.resetFields();
        loadRecipes();
        loadRecipeProducts();
      } else {
        message.error(response.data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    try {
      const response = await costAnalysisApi.deleteRecipe(recipeId);
      if (response.data.code === 200) {
        message.success('删除成功');
        loadRecipes();
        loadRecipeProducts();
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteRecipes = async () => {
    if (selectedRecipeKeys.length === 0) {
      message.warning('请选择要删除的原料卡');
      return;
    }
    try {
      const response = await costAnalysisApi.batchDeleteRecipes(selectedRecipeKeys as number[]);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量删除成功');
        setSelectedRecipeKeys([]);
        loadRecipes();
        loadRecipeProducts();
      } else {
        message.error(response.data.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchAddRecipes = async () => {
    try {
      const values = await batchRecipeForm.validateFields();
      const lines = values.recipes
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s);

      const allRecipes: Array<{
        product_name: string;
        ingredient_name: string;
        ingredient_unit: string;
        quantity: number;
      }> = [];

      const errors: string[] = [];

      lines.forEach((line: string, lineIndex: number) => {
        // 分割字段，支持逗号结尾
        const parts = line.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        
        if (parts.length < 4) {
          errors.push(`第${lineIndex + 1}行：至少需要源商品名称和一组原料信息（原料名称、用量、计量单位）`);
          return;
        }

        const productName = parts[0];
        const ingredientParts = parts.slice(1);

        // 检查原料信息是否为3的倍数
        if (ingredientParts.length % 3 !== 0) {
          errors.push(`第${lineIndex + 1}行：原料信息格式不正确，每组原料需要3个字段（名称、用量、计量单位），当前剩余${ingredientParts.length}个字段，不是3的倍数`);
          return;
        }

        // 解析每组原料
        for (let i = 0; i < ingredientParts.length; i += 3) {
          const ingredientName = ingredientParts[i];
          const quantityStr = ingredientParts[i + 1];
          const ingredientUnit = ingredientParts[i + 2];

          const quantity = parseFloat(quantityStr);
          if (isNaN(quantity)) {
            errors.push(`第${lineIndex + 1}行：原料"${ingredientName}"的用量"${quantityStr}"不是有效数字`);
            return;
          }

          allRecipes.push({
            product_name: productName,
            ingredient_name: ingredientName,
            ingredient_unit: ingredientUnit,
            quantity: quantity,
          });
        }
      });

      if (errors.length > 0) {
        Modal.error({
          title: '格式错误',
          content: (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {errors.map((err, idx) => (
                <div key={idx} style={{ color: 'red', marginBottom: 4 }}>{err}</div>
              ))}
            </div>
          ),
        });
        return;
      }

      if (allRecipes.length === 0) {
        message.warning('请输入有效的原料卡数据');
        return;
      }

      const response = await costAnalysisApi.batchAddRecipes(allRecipes);
      if (response.data.code === 200) {
        message.success(response.data.message || `批量添加成功：${allRecipes.length}条记录`);
        setBatchRecipeModalVisible(false);
        batchRecipeForm.resetFields();
        loadRecipes();
        loadRecipeProducts();
      } else {
        message.error(response.data.message || '批量添加失败');
      }
    } catch (error) {
      message.error('批量添加失败');
    }
  };

  const recipeColumns: ColumnsType<ProductRecipeCard> = [
    {
      title: '源商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 250,
    },
    {
      title: '原料名称',
      dataIndex: 'ingredient_name',
      key: 'ingredient_name',
      width: 150,
    },
    {
      title: '计量单位',
      dataIndex: 'ingredient_unit',
      key: 'ingredient_unit',
      width: 100,
    },
    {
      title: '用量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (text: number) => text.toFixed(4),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ProductRecipeCard) => (
        <Popconfirm
          title="确定要删除此原料卡记录吗？"
          onConfirm={() => handleDeleteRecipe(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // ==================== 原料成本功能 ====================

  const loadIngredients = async () => {
    setIngredientsLoading(true);
    try {
      const response = await costAnalysisApi.getIngredients();
      if (response.data.code === 200) {
        setIngredients(response.data.data);
      }
    } catch (error) {
      message.error('加载原料成本失败');
    } finally {
      setIngredientsLoading(false);
    }
  };

  const handleAddIngredient = async () => {
    try {
      const values = await ingredientForm.validateFields();
      const response = await costAnalysisApi.addIngredient(values);
      if (response.data.code === 200) {
        message.success(response.data.message || '添加成功');
        setAddIngredientModalVisible(false);
        ingredientForm.resetFields();
        loadIngredients();
      } else {
        message.error(response.data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleDeleteIngredient = async (ingredientId: number) => {
    try {
      const response = await costAnalysisApi.deleteIngredient(ingredientId);
      if (response.data.code === 200) {
        message.success('删除成功');
        loadIngredients();
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteIngredients = async () => {
    if (selectedIngredientKeys.length === 0) {
      message.warning('请选择要删除的原料');
      return;
    }
    try {
      const response = await costAnalysisApi.batchDeleteIngredients(selectedIngredientKeys as number[]);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量删除成功');
        setSelectedIngredientKeys([]);
        loadIngredients();
      } else {
        message.error(response.data.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchAddIngredients = async () => {
    try {
      const values = await batchIngredientForm.validateFields();
      const lines = values.ingredients
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s);

      const allIngredients: Array<{
        ingredient_name: string;
        unit: string;
        unit_cost: number;
      }> = [];

      const errors: string[] = [];

      lines.forEach((line: string, lineIndex: number) => {
        const parts = line.split(',').map((p: string) => p.trim()).filter((p: string) => p);

        if (parts.length !== 3) {
          errors.push(`第${lineIndex + 1}行：格式不正确，需要3个字段（原料名称、计量单位、单位成本），当前有${parts.length}个字段`);
          return;
        }

        const [ingredientName, unit, costStr] = parts;
        const unitCost = parseFloat(costStr);

        if (isNaN(unitCost)) {
          errors.push(`第${lineIndex + 1}行：单位成本"${costStr}"不是有效数字`);
          return;
        }

        allIngredients.push({
          ingredient_name: ingredientName,
          unit: unit,
          unit_cost: unitCost,
        });
      });

      if (errors.length > 0) {
        Modal.error({
          title: '格式错误',
          content: (
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              {errors.map((err, idx) => (
                <div key={idx} style={{ color: 'red', marginBottom: 4 }}>{err}</div>
              ))}
            </div>
          ),
        });
        return;
      }

      if (allIngredients.length === 0) {
        message.warning('请输入有效的原料成本数据');
        return;
      }

      const response = await costAnalysisApi.batchAddIngredients(allIngredients);
      if (response.data.code === 200) {
        message.success(response.data.message || `批量添加成功：${allIngredients.length}条记录`);
        setBatchIngredientModalVisible(false);
        batchIngredientForm.resetFields();
        loadIngredients();
      } else {
        message.error(response.data.message || '批量添加失败');
      }
    } catch (error) {
      message.error('批量添加失败');
    }
  };

  const ingredientColumns: ColumnsType<IngredientCost> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: unknown, __: IngredientCost, index: number) => index + 1,
    },
    {
      title: '原料名称',
      dataIndex: 'ingredient_name',
      key: 'ingredient_name',
    },
    {
      title: '计量单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 120,
    },
    {
      title: '单位成本',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      width: 120,
      render: (text: number) => `¥${text.toFixed(4)}`,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: IngredientCost) => (
        <Popconfirm
          title="确定要删除此原料吗？"
          onConfirm={() => handleDeleteIngredient(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // ==================== 源商品名称映射功能 ====================

  const loadMappings = async () => {
    setMappingsLoading(true);
    try {
      const response = await costAnalysisApi.getMappings(selectedSourceName || undefined);
      if (response.data.code === 200) {
        setMappings(response.data.data);
      }
    } catch (error) {
      message.error('加载映射列表失败');
    } finally {
      setMappingsLoading(false);
    }
  };

  const loadSourceNames = async () => {
    try {
      const response = await costAnalysisApi.getSourceNames();
      if (response.data.code === 200) {
        setSourceNames(response.data.data);
      }
    } catch (error) {
      console.error('加载源商品列表失败');
    }
  };

  const handleAddMapping = async () => {
    try {
      const values = await mappingForm.validateFields();
      const response = await costAnalysisApi.addMapping(values);
      if (response.data.code === 200) {
        message.success(response.data.message || '添加成功');
        setAddMappingModalVisible(false);
        mappingForm.resetFields();
        loadMappings();
        loadSourceNames();
      } else {
        message.error(response.data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleBatchAddMappings = async () => {
    try {
      const values = await batchMappingForm.validateFields();
      const lines = values.mappings
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s);

      const mappingsData = lines
        .map((line: string) => {
          const parts = line.split(/[,，\t]/).map((p: string) => p.trim());
          return {
            parsed_name: parts[0] || '',
            source_name: parts[1] || parts[0] || '',
          };
        })
        .filter((m: { parsed_name: string; source_name: string }) => m.parsed_name);

      if (mappingsData.length === 0) {
        message.warning('请输入有效的映射数据');
        return;
      }

      const response = await costAnalysisApi.batchAddMappings(mappingsData);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量添加成功');
        setBatchMappingModalVisible(false);
        batchMappingForm.resetFields();
        loadMappings();
        loadSourceNames();
      } else {
        message.error(response.data.message || '批量添加失败');
      }
    } catch (error) {
      message.error('批量添加失败');
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    try {
      const response = await costAnalysisApi.deleteMapping(mappingId);
      if (response.data.code === 200) {
        message.success('删除成功');
        loadMappings();
        loadSourceNames();
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteMappings = async () => {
    if (selectedMappingKeys.length === 0) {
      message.warning('请选择要删除的映射');
      return;
    }
    try {
      const response = await costAnalysisApi.batchDeleteMappings(selectedMappingKeys as number[]);
      if (response.data.code === 200) {
        message.success(response.data.message || '批量删除成功');
        setSelectedMappingKeys([]);
        loadMappings();
        loadSourceNames();
      } else {
        message.error(response.data.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleGetUnmapped = async (file: File) => {
    setUnmappedLoading(true);
    try {
      const response = await costAnalysisApi.getUnmappedProducts(file);
      if (response.data.code === 200) {
        setUnmappedProducts(response.data.data.unmapped);
        setUnmappedStats({
          total: response.data.data.total_products,
          mapped: response.data.data.mapped_count,
          unmapped: response.data.data.unmapped_count,
        });
        message.success(`找到 ${response.data.data.unmapped_count} 个未映射的单品（共 ${response.data.data.total_products} 种单品）`);
      } else {
        message.error(response.data.message || '获取未映射单品失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '获取未映射单品失败');
    } finally {
      setUnmappedLoading(false);
    }
    return false;
  };

  const handleQuickAddMapping = async (parsedName: string) => {
    try {
      const response = await costAnalysisApi.addMapping({
        parsed_name: parsedName,
        source_name: parsedName,
      });
      if (response.data.code === 200) {
        message.success('添加成功');
        setUnmappedProducts((prev) => prev.filter((p) => p.parsed_name !== parsedName));
        loadMappings();
        loadSourceNames();
      } else {
        message.error(response.data.message || '添加失败');
      }
    } catch (error) {
      message.error('添加失败');
    }
  };

  const mappingColumns: ColumnsType<ProductNameMapping> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: unknown, __: ProductNameMapping, index: number) => index + 1,
    },
    {
      title: '解析单品名称',
      dataIndex: 'parsed_name',
      key: 'parsed_name',
    },
    {
      title: '源商品名称',
      dataIndex: 'source_name',
      key: 'source_name',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ProductNameMapping) => (
        <Popconfirm
          title="确定要删除此映射吗？"
          onConfirm={() => handleDeleteMapping(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const unmappedColumns: ColumnsType<UnmappedProduct> = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: unknown, __: UnmappedProduct, index: number) => index + 1,
    },
    {
      title: '解析单品名称',
      dataIndex: 'parsed_name',
      key: 'parsed_name',
      ellipsis: true,
    },
    {
      title: '出现次数',
      dataIndex: 'count',
      key: 'count',
      width: 90,
      sorter: (a, b) => a.count - b.count,
      render: (count: number) => <Tag color="red">{count}</Tag>,
    },
    {
      title: '涉及门店数',
      dataIndex: 'store_count',
      key: 'store_count',
      width: 100,
      sorter: (a, b) => a.store_count - b.store_count,
      render: (cnt: number) => <Tag color="blue">{cnt} 家</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: UnmappedProduct) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setUnmappedDetailProduct(record);
              setUnmappedDetailVisible(true);
            }}
          >
            溯源详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              mappingForm.setFieldsValue({ parsed_name: record.parsed_name });
              setAddMappingModalVisible(true);
            }}
          >
            添加映射
          </Button>
          <Button type="link" size="small" onClick={() => handleQuickAddMapping(record.parsed_name)}>
            快速添加
          </Button>
        </Space>
      ),
    },
  ];

  // ==================== 订单解析功能 ====================

  // 上传并预览Excel
  const handleUploadPreview = async (file: File) => {
    setPreviewLoading(true);
    setUploadedFile(file);
    try {
      const response = await costAnalysisApi.previewOrders(file);
      if (response.data.code === 200) {
        setPreviewData(response.data.data);
        setPreviewModalVisible(true);
      } else {
        message.error(response.data.message || '预览失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
    return false;
  };

  // 确认解析并导出Excel
  const handleConfirmAnalyze = async () => {
    if (!uploadedFile) {
      message.error('请先上传文件');
      return;
    }

    setAnalysisLoading(true);
    setPreviewModalVisible(false);
    setAnalysisResult(null);
    setAnalysisProgress(0);

    // 启动模拟进度条（逐步增长到90%，实际完成时跳到100%）
    let progress = 0;
    analysisTimerRef.current = setInterval(() => {
      progress += Math.random() * 8 + 2; // 每次增2~10%
      if (progress > 90) progress = 90;
      setAnalysisProgress(Math.round(progress));
    }, 500);

    try {
      const response = await costAnalysisApi.analyzeOrders(uploadedFile);

      // 清除定时器，跳到95%
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
      setAnalysisProgress(95);

      if (response.data.code === 200) {
        const result = response.data.data;
        setAnalysisResult(result);
        message.success('解析完成，正在生成Excel文件...');

        // 自动下载两个Excel文件
        await downloadSourceProductExcel(result);
        await downloadIngredientExcel(result);

        setAnalysisProgress(100);
        message.success('两个Excel文件已生成并下载');
      } else {
        message.error(response.data.message || '解析失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '解析失败');
    } finally {
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
      setAnalysisLoading(false);
    }
  };

  // 下载源商品Excel
  const downloadSourceProductExcel = async (result: MatrixAnalysisResult) => {
    try {
      const response = await costAnalysisApi.exportSourceProduct({
        stores: result.stores,
        source_products: result.source_products,
        source_product_quantity_matrix: result.source_product_quantity_matrix,
        source_product_cost_matrix: result.source_product_cost_matrix,
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '源商品数据.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('源商品数据导出失败');
    }
  };

  // 下载原料Excel
  const downloadIngredientExcel = async (result: MatrixAnalysisResult) => {
    try {
      const response = await costAnalysisApi.exportIngredient({
        stores: result.stores,
        ingredients: result.ingredients,
        ingredient_quantity_matrix: result.ingredient_quantity_matrix,
        ingredient_cost_matrix: result.ingredient_cost_matrix,
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '原料数据.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('原料数据导出失败');
    }
  };

  // 手动导出按钮
  const handleExportSourceProduct = async () => {
    if (!analysisResult) return;
    await downloadSourceProductExcel(analysisResult);
    message.success('源商品数据导出成功');
  };

  const handleExportIngredient = async () => {
    if (!analysisResult) return;
    await downloadIngredientExcel(analysisResult);
    message.success('原料数据导出成功');
  };

  // 预览表格的列定义
  const getPreviewColumns = () => {
    if (!previewData || !previewData.columns) return [];
    return previewData.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      width: 150,
      ellipsis: true,
      render: (text: unknown) => (text !== null && text !== undefined ? String(text) : '-'),
    }));
  };

  return (
    <div className="cost-analysis">
      <Card className="cost-analysis-container">
        <div className="page-header">
          <h2>
            <DollarOutlined style={{ marginRight: 8 }} />
            饿了么 - 成本分析
          </h2>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 订单解析 Tab */}
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                订单解析
              </span>
            }
            key="analysis"
          >
            <div className="analysis-tab">
              <div className="upload-section">
                <Space size="large" wrap>
                  <div className="parser-select">
                    <span style={{ marginRight: 8 }}>解析算法：</span>
                    <Select
                      style={{ width: 200 }}
                      value={selectedParser}
                      onChange={setSelectedParser}
                      options={parsers.map((p) => ({
                        label: p.filename,
                        value: p.name,
                      }))}
                      placeholder="选择解析算法"
                    />
                  </div>
                  <Upload
                    accept=".xlsx,.csv"
                    fileList={fileList}
                    beforeUpload={(file) => {
                      handleUploadPreview(file);
                      setFileList([file]);
                      return false;
                    }}
                    onRemove={() => {
                      setFileList([]);
                      setAnalysisResult(null);
                      setUploadedFile(null);
                    }}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} type="primary" loading={previewLoading}>
                      上传订单Excel
                    </Button>
                  </Upload>
                </Space>
                <span className="upload-tip">支持 .xlsx / .csv 格式，文件需包含"门店名称"和"商品信息"列</span>
              </div>

              {analysisLoading && (
                <Card style={{ marginTop: 20, marginBottom: 20, borderRadius: 12, textAlign: 'center' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>正在解析订单数据并生成报表...</Text>
                  </div>
                  <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <Progress
                      percent={analysisProgress}
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    {analysisProgress < 30 && '读取订单文件并过滤门店...'}
                    {analysisProgress >= 30 && analysisProgress < 60 && '解析商品信息并映射源商品...'}
                    {analysisProgress >= 60 && analysisProgress < 90 && '计算原料消耗并生成矩阵...'}
                    {analysisProgress >= 90 && '生成Excel文件中...'}
                  </Text>
                </Card>
              )}

              {analysisResult && (
                <>
                  <div className="summary-section">
                    <Row gutter={16}>
                      <Col span={4}>
                        <Statistic title="总订单数" value={analysisResult.summary.total_orders} />
                      </Col>
                      <Col span={4}>
                        <Statistic title="解析门店数" value={analysisResult.summary.total_stores} />
                      </Col>
                      <Col span={4}>
                        <Statistic title="源商品种类" value={analysisResult.summary.total_source_products} />
                      </Col>
                      <Col span={4}>
                        <Statistic title="原料种类" value={analysisResult.summary.total_ingredients} />
                      </Col>
                      <Col span={8}>
                        <Space>
                          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportSourceProduct}>
                            下载源商品数据
                          </Button>
                          <Button icon={<DownloadOutlined />} onClick={handleExportIngredient}>
                            下载原料数据
                          </Button>
                        </Space>
                      </Col>
                    </Row>

                    {analysisResult.summary.unmapped_products.length > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                        message={`以下 ${analysisResult.summary.unmapped_products.length} 个单品未配置源商品映射`}
                        description={
                          <div className="unmapped-products">
                            {analysisResult.summary.unmapped_products.slice(0, 20).map((p) => (
                              <Tag key={p} color="orange">
                                {p}
                              </Tag>
                            ))}
                            {analysisResult.summary.unmapped_products.length > 20 && (
                              <Tag>...还有 {analysisResult.summary.unmapped_products.length - 20} 个</Tag>
                            )}
                          </div>
                        }
                      />
                    )}

                    {analysisResult.summary.unmapped_source_products.length > 0 && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
                        message={`以下 ${analysisResult.summary.unmapped_source_products.length} 个源商品未配置原料卡`}
                        description={
                          <div className="unmapped-products">
                            {analysisResult.summary.unmapped_source_products.slice(0, 20).map((p) => (
                              <Tag key={p} color="blue">
                                {p}
                              </Tag>
                            ))}
                            {analysisResult.summary.unmapped_source_products.length > 20 && (
                              <Tag>...还有 {analysisResult.summary.unmapped_source_products.length - 20} 个</Tag>
                            )}
                          </div>
                        }
                      />
                    )}
                  </div>

                  <div className="result-section" style={{ marginTop: 24 }}>
                    <Alert
                      type="success"
                      showIcon
                      message="解析完成"
                      description={
                        <div>
                          <p>已成功解析 {analysisResult.summary.total_orders} 条订单数据。</p>
                          <p>生成的两个Excel文件说明：</p>
                          <ul>
                            <li><strong>源商品数据.xlsx</strong>：包含两个子表</li>
                            <ul>
                              <li>Sheet1 (源商品销量)：行为源商品，列为门店，数据为销量</li>
                              <li>Sheet2 (源商品成本)：行为源商品，列为门店，数据为成本</li>
                            </ul>
                            <li><strong>原料数据.xlsx</strong>：包含两个子表</li>
                            <ul>
                              <li>Sheet1 (原料消耗量)：行为原料，列为门店，数据为消耗量</li>
                              <li>Sheet2 (原料成本)：行为原料，列为门店，数据为成本</li>
                            </ul>
                          </ul>
                        </div>
                      }
                    />
                  </div>
                </>
              )}

              {!analysisLoading && !analysisResult && (
                <Empty description="请上传订单Excel文件进行解析" style={{ marginTop: 60, marginBottom: 40 }} />
              )}

              {/* 成本分析功能使用说明书 */}
              <div className="tutorial-section" style={{ marginTop: 32 }}>
                <Card
                  className="tutorial-card"
                  title={
                    <span className="tutorial-header">
                      <InfoCircleOutlined style={{ marginRight: 8 }} />
                      成本分析功能 - 完整使用说明书
                    </span>
                  }
                >
                  <div className="tutorial-content">
                      <Title level={5}>一、功能概述</Title>
                      <Paragraph>
                        成本分析模块是一套完整的<Text strong>外卖订单成本核算系统</Text>。
                        它能够将饿了么后台导出的原始订单数据，经过<Text strong>门店过滤、商品解析、名称映射、原料换算、成本计算</Text>五个步骤，
                        最终生成每个门店的源商品销量报表和原料消耗/成本报表。
                      </Paragraph>
                      <Paragraph>
                        整个系统由两大部分组成：
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li><Text strong>订单解析</Text>（当前页面）：上传订单Excel，选择解析算法，执行解析并下载结果</li>
                        <li><Text strong>解析配置</Text>（第二个Tab）：维护解析所需的四个配置数据库</li>
                      </ul>

                      <Divider dashed />

                      <Title level={5}>二、核心概念说明</Title>

                      <Paragraph>
                        <Text strong>2.1 数据处理流程</Text>
                      </Paragraph>
                      <Paragraph>
                        系统的数据处理遵循以下流程（每一步都依赖上一步的结果）：
                      </Paragraph>
                      <Steps direction="vertical" size="small" current={-1} className="tutorial-steps">
                        <Step
                          title="第1步：上传订单Excel并过滤门店"
                          icon={<FilterOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                从饿了么后台导出的订单Excel中，通常包含你所有门店的订单数据。
                                系统会根据<Text strong>「可分析门店数据库」</Text>中配置的门店名称，
                                自动筛选出这些门店的订单，过滤掉不需要分析的门店。
                              </Paragraph>
                              <Paragraph>
                                <Text type="secondary">
                                  例如：Excel中有60家门店的数据，但「可分析门店数据库」中只配置了18家门店，
                                  那么系统只会处理这18家门店的订单。
                                </Text>
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="第2步：解析商品信息为单品"
                          icon={<SplitCellsOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                饿了么订单中的「商品信息」列包含复杂的商品描述字符串（如套餐、组合商品等）。
                                系统使用你选择的<Text strong>解析算法</Text>（.py文件），
                                将每条订单的商品信息拆解为一个个独立的<Text strong>「单品」</Text>及其数量。
                              </Paragraph>
                              <Paragraph>
                                <Text type="secondary">
                                  例如：「9英寸经典夏威夷披萨_1*29.9+可乐_2*6.0」会被拆解为：
                                  9英寸经典夏威夷披萨 x1、可乐 x2。
                                  系统还能处理「爆品团商品」等特殊格式。
                                </Text>
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="第3步：将单品映射为源商品"
                          icon={<LinkOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                拆解出来的单品名称可能有多种不同的写法（如「9英寸经典夏威夷」「9寸夏威夷披萨」），
                                但它们本质上是同一个产品。<Text strong>「源商品映射数据库」</Text>就是用来将这些不同名称
                                统一映射到一个<Text strong>「源商品」</Text>名称。
                              </Paragraph>
                              <Paragraph>
                                <Text type="secondary">
                                  例如：「9英寸经典夏威夷」「9寸夏威夷」「夏威夷披萨9英寸」都映射到源商品「9寸经典夏威夷披萨」。
                                  如果某个单品没有配置映射，解析结果中会以橙色标签警告提示。
                                </Text>
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="第4步：根据原料卡计算原料消耗"
                          icon={<ExperimentOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                每个源商品在<Text strong>「源商品原料卡」</Text>中配置了其制作所需的各项原料及用量。
                                系统会根据每个门店卖出的源商品数量，乘以原料卡中的用量，
                                计算出每个门店每种原料的总消耗量。
                              </Paragraph>
                              <Paragraph>
                                <Text type="secondary">
                                  例如：源商品「9寸经典夏威夷披萨」的原料卡配置了：面团200g、芝士80g、菠萝50g、火腿40g。
                                  如果某门店卖了10个，那么面团消耗 = 200g x 10 = 2000g。
                                  如果某个源商品没有配置原料卡，解析结果中会以蓝色标签警告提示。
                                </Text>
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="第5步：计算原料成本"
                          icon={<CalculatorOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                <Text strong>「原料成本数据库」</Text>中配置了每种原料的单位成本。
                                系统将每种原料的消耗量乘以单位成本，得到每个门店每种原料的消耗成本，
                                以及每个源商品的单位成本。
                              </Paragraph>
                              <Paragraph>
                                <Text type="secondary">
                                  例如：面团单价 0.008元/g，某门店面团消耗 2000g，则面团成本 = 0.008 x 2000 = 16元。
                                </Text>
                              </Paragraph>
                            </div>
                          }
                        />
                      </Steps>

                      <Divider dashed />

                      <Title level={5}>三、解析配置 - 四个数据库详解</Title>

                      <Paragraph>
                        在进行订单解析之前，你需要在「解析配置」Tab中维护以下四个数据库。
                        这些数据会<Text strong>持久化存储在服务器</Text>中，配置一次后可反复使用。
                      </Paragraph>

                      <Paragraph>
                        <Text strong>3.1 可分析门店数据库</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>必配</Tag>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li><Text strong>作用</Text>：定义哪些门店参与成本分析。只有在此数据库中的门店，其订单才会被处理</li>
                        <li><Text strong>字段</Text>：门店名称（必须与Excel中的「门店名称」列<Text type="danger">完全一致</Text>）</li>
                        <li><Text strong>操作</Text>：支持单个添加、批量添加（每行一个门店名称）、单个删除、批量删除</li>
                        <li><Text type="secondary">提示：门店名称一定要和饿了么后台的门店名称完全匹配，包括标点符号和括号类型（中文/英文括号）</Text></li>
                      </ul>

                      <Paragraph>
                        <Text strong>3.2 源商品映射数据库</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>必配</Tag>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li><Text strong>作用</Text>：将解析出来的各种单品名称统一映射到标准的「源商品」名称</li>
                        <li><Text strong>字段</Text>：单品名称（原始名称） → 源商品名称（标准名称）</li>
                        <li><Text strong>操作</Text>：支持单个添加、批量添加（每行格式：单品名称,源商品名称）、单个删除、批量删除</li>
                        <li><Text type="secondary">提示：可以先上传一次订单Excel进行试解析，系统会在结果中用橙色标签列出所有「未映射的单品」，根据这些提示来添加映射关系</Text></li>
                      </ul>

                      <Paragraph>
                        <Text strong>3.3 源商品原料卡</Text>
                        <Tag color="green" style={{ marginLeft: 8 }}>按需配置</Tag>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li><Text strong>作用</Text>：定义每个源商品的制作原料清单，包括每种原料的名称、用量和计量单位</li>
                        <li><Text strong>字段</Text>：源商品名称、原料名称、原料用量、原料计量单位</li>
                        <li><Text strong>操作</Text>：
                          <ul>
                            <li>单个添加：逐条添加原料记录</li>
                            <li>批量添加：格式为「源商品名称,原料1名称,原料1用量,原料1单位,原料2名称,原料2用量,原料2单位,...」。字段数必须满足 3n+1（1个商品名 + n组原料，每组3个字段）</li>
                            <li>支持单个删除和批量删除</li>
                          </ul>
                        </li>
                        <li><Text type="secondary">提示：如果不配置某个源商品的原料卡，该商品在「原料数据」报表中不会体现，但仍会出现在「源商品数据」报表中。系统会以蓝色标签提示未配置原料卡的源商品</Text></li>
                      </ul>

                      <Paragraph>
                        <Text strong>3.4 原料成本数据库</Text>
                        <Tag color="green" style={{ marginLeft: 8 }}>按需配置</Tag>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li><Text strong>作用</Text>：定义每种原料的单位成本，用于计算原料消耗的金额</li>
                        <li><Text strong>字段</Text>：原料名称、原料计量单位、原料单位成本</li>
                        <li><Text strong>操作</Text>：支持单个添加、批量添加（每行格式：原料名称,计量单位,单位成本）、单个删除、批量删除</li>
                        <li><Text type="secondary">提示：原料名称和计量单位需要与「源商品原料卡」中的保持一致</Text></li>
                      </ul>

                      <Divider dashed />

                      <Title level={5}>四、操作步骤（快速上手）</Title>

                      <Paragraph>
                        <Text strong>首次使用时</Text>，按以下顺序配置（后续只需要在新增商品时更新即可）：
                      </Paragraph>
                      <Steps direction="vertical" size="small" current={-1} className="tutorial-steps">
                        <Step
                          title="步骤1：配置可分析门店"
                          icon={<ShopOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                进入「解析配置」→「可分析门店数据库」，将你需要做成本分析的门店名称逐个或批量添加。
                                门店名称必须与饿了么后台导出的Excel中的名称<Text type="danger">完全一致</Text>。
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="步骤2：试运行一次订单解析"
                          icon={<FileSearchOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                回到「订单解析」页面，选择解析算法，上传一份订单Excel，点击确认解析。
                                查看结果中橙色和蓝色的警告标签，这些标签会告诉你哪些单品还没有配置映射、哪些源商品还没有配置原料卡。
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="步骤3：配置源商品映射"
                          icon={<SwapOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                根据步骤2的橙色警告，进入「解析配置」→「源商品映射数据库」，
                                将所有未映射的单品名称映射到对应的源商品名称。同一个源商品可能对应多个不同的单品名称。
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="步骤4：配置源商品原料卡"
                          icon={<AccountBookOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                进入「解析配置」→「源商品原料卡」，为每个源商品配置其制作所需的原料清单。
                                可以使用批量添加功能，格式为：源商品名称,原料1名称,原料1用量,原料1单位,...
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="步骤5：配置原料成本"
                          icon={<DollarOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                进入「解析配置」→「原料成本数据库」，为每种原料设置单位成本。
                                可以使用批量添加功能，格式为：原料名称,计量单位,单位成本。
                              </Paragraph>
                            </div>
                          }
                        />
                        <Step
                          title="步骤6：正式解析并下载报表"
                          icon={<DownloadOutlined />}
                          description={
                            <div className="step-detail">
                              <Paragraph>
                                回到「订单解析」页面，重新上传订单Excel并确认解析。
                                解析完成后，点击「下载源商品数据」和「下载原料数据」获取报表。
                              </Paragraph>
                            </div>
                          }
                        />
                      </Steps>

                      <Divider dashed />

                      <Title level={5}>五、输出报表说明</Title>

                      <Paragraph>
                        解析完成后可以下载两个Excel报表，共包含四个子表：
                      </Paragraph>

                      <Paragraph>
                        <Text strong>5.1 源商品数据.xlsx</Text>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li>
                          <Tag color="purple">Sheet1: 源商品销量</Tag> — 矩阵表格，行为各源商品名称，列为各门店名称。
                          单元格数值表示该门店在上传周期内卖出了多少份该源商品
                        </li>
                        <li>
                          <Tag color="purple">Sheet2: 源商品成本</Tag> — 同样的矩阵结构。
                          单元格数值表示该门店在该源商品上消耗的原料总成本（元）。
                          计算方式：源商品数量 x 该源商品所有原料的（单位用量 x 原料单位成本）之和
                        </li>
                      </ul>

                      <Paragraph>
                        <Text strong>5.2 原料数据.xlsx</Text>
                      </Paragraph>
                      <ul className="tutorial-list">
                        <li>
                          <Tag color="cyan">Sheet1: 原料消耗量</Tag> — 矩阵表格，行为各原料名称，列为各门店名称。
                          单元格数值表示该门店在上传周期内消耗了多少该原料（按原料卡中的计量单位）
                        </li>
                        <li>
                          <Tag color="cyan">Sheet2: 原料成本</Tag> — 同样的矩阵结构。
                          单元格数值表示该门店在该原料上的成本花费（元）。
                          计算方式：原料消耗量 x 原料单位成本
                        </li>
                      </ul>

                      <Divider dashed />

                      <Title level={5}>六、常见问题与注意事项</Title>
                      <ul className="tutorial-list">
                        <li>
                          <Text strong>Q: 上传的Excel文件有什么要求？</Text><br />
                          <Text type="secondary">A: 必须是饿了么后台导出的 .xlsx 或 .csv 格式订单文件，至少包含「门店名称」和「商品信息」两列。</Text>
                        </li>
                        <li>
                          <Text strong>Q: 为什么解析后出现很多橙色/蓝色警告标签？</Text><br />
                          <Text type="secondary">A: 橙色标签表示有单品尚未配置「源商品映射」，蓝色标签表示有源商品尚未配置「原料卡」。这属于正常现象，根据提示逐步完善配置数据库即可。随着配置越来越完整，警告会越来越少。</Text>
                        </li>
                        <li>
                          <Text strong>Q: 修改了配置数据库后需要重新上传Excel吗？</Text><br />
                          <Text type="secondary">A: 是的。每次修改了映射、原料卡或原料成本后，需要重新上传Excel文件进行解析，才能看到更新后的结果。配置数据库的修改是即时生效的。</Text>
                        </li>
                        <li>
                          <Text strong>Q: 解析算法可以自定义吗？</Text><br />
                          <Text type="secondary">A: 可以。解析算法是后端 backend/app/utils/ 目录下包含 parse_order_items 函数的 .py 文件。新增一个符合规范的 .py 文件后，前端下拉菜单会自动显示新的算法选项。</Text>
                        </li>
                        <li>
                          <Text strong>Q: 数据会一直保存吗？</Text><br />
                          <Text type="secondary">A: 四个配置数据库（可分析门店、源商品映射、源商品原料卡、原料成本）的数据持久存储在服务器数据库中，不会丢失。但上传的订单Excel文件和解析结果不会存储，刷新页面后需要重新上传。</Text>
                        </li>
                        <li>
                          <Text strong>Q: 支持批量操作吗？</Text><br />
                          <Text type="secondary">A: 四个配置数据库均支持批量添加和批量删除。批量添加时在文本框中按指定格式粘贴多行数据；批量删除时先勾选表格行再点击「批量删除」按钮。</Text>
                        </li>
                      </ul>
                    </div>
                </Card>
              </div>
            </div>
          </TabPane>

          {/* 解析配置 Tab */}
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                解析配置
              </span>
            }
            key="config"
          >
            {/* 一站式导入配置卡片 */}
            <Card
              style={{
                marginBottom: 20,
                borderRadius: 12,
                border: '1px solid #fa8c16',
                background: 'linear-gradient(135deg, #fff7e6 0%, #fff2e8 100%)',
              }}
            >
              <Row gutter={24} align="middle">
                <Col flex="auto">
                  <Title level={5} style={{ margin: 0, color: '#d46b08' }}>
                    <FileExcelOutlined style={{ marginRight: 8 }} />
                    一站式导入配置
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    上传 .xlsx 配置文件，一次性导入全部四项配置（可分析门店、源商品映射、源商品原料卡、原料成本）
                  </Text>
                </Col>
                <Col>
                  <Space size="middle">
                    <Select
                      value={importMode}
                      onChange={(v) => setImportMode(v)}
                      style={{ width: 200 }}
                      options={[
                        { value: 'upsert', label: '智能合并（保留旧数据）' },
                        { value: 'replace', label: '完全替换（清空后导入）' },
                      ]}
                    />
                    <Upload
                      accept=".xlsx"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        setImportFile(file);
                        setImportResult(null);
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />}>
                        选择配置文件
                      </Button>
                    </Upload>
                    <Button
                      type="primary"
                      onClick={handleImportConfig}
                      loading={importLoading}
                      disabled={!importFile}
                      style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                    >
                      {importLoading ? '导入中...' : '确认导入'}
                    </Button>
                  </Space>
                </Col>
              </Row>
              {importFile && !importResult && !importLoading && (
                <div style={{ marginTop: 12 }}>
                  <Tag icon={<FileExcelOutlined />} color="orange" closable onClose={() => setImportFile(null)}>
                    {importFile.name}（{(importFile.size / 1024).toFixed(1)} KB）
                  </Tag>
                </div>
              )}

              {importResult && (
                <div style={{ marginTop: 16, padding: 16, background: '#fff', borderRadius: 8 }}>
                  <Alert
                    message={`导入完成（${importResult.mode_label}模式）`}
                    description={`已处理 ${importResult.processed_sheets.length} 个工作表: ${importResult.processed_sheets.join('、')}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                  <Row gutter={16}>
                    <Col span={6}>
                      <Card size="small" style={{ textAlign: 'center', borderColor: '#91d5ff' }}>
                        <Statistic
                          title="可分析门店"
                          value={importResult.stats.stores.added}
                          suffix={importResult.mode === 'upsert'
                            ? `新增 / ${importResult.stats.stores.skipped} 跳过`
                            : '条'}
                          valueStyle={{ color: '#1890ff', fontSize: 20 }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" style={{ textAlign: 'center', borderColor: '#b7eb8f' }}>
                        <Statistic
                          title="源商品映射"
                          value={importResult.stats.mappings.added}
                          suffix={importResult.mode === 'upsert'
                            ? `新增 / ${importResult.stats.mappings.updated} 更新`
                            : '条'}
                          valueStyle={{ color: '#52c41a', fontSize: 20 }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" style={{ textAlign: 'center', borderColor: '#ffd591' }}>
                        <Statistic
                          title="源商品原料卡"
                          value={importResult.stats.recipes.added}
                          suffix={importResult.mode === 'upsert'
                            ? `新增 / ${importResult.stats.recipes.updated} 更新`
                            : '条'}
                          valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small" style={{ textAlign: 'center', borderColor: '#ffccc7' }}>
                        <Statistic
                          title="原料成本"
                          value={importResult.stats.ingredients.added}
                          suffix={importResult.mode === 'upsert'
                            ? `新增 / ${importResult.stats.ingredients.updated} 更新`
                            : '条'}
                          valueStyle={{ color: '#f5222d', fontSize: 20 }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
            </Card>

            <Tabs activeKey={configSubTab} onChange={setConfigSubTab} type="card" className="config-sub-tabs">
              {/* 可分析门店数据库 */}
              <TabPane
                tab={
                  <span>
                    <ShopOutlined />
                    可分析门店数据库
                  </span>
                }
                key="stores"
              >
                <div className="stores-tab">
                  <div className="tab-toolbar">
                    <Space>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddStoreModalVisible(true)}>
                        添加门店
                      </Button>
                      <Button icon={<PlusOutlined />} onClick={() => setBatchAddModalVisible(true)}>
                        批量添加
                      </Button>
                      <Popconfirm
                        title={`确定要删除选中的 ${selectedStoreKeys.length} 家门店吗？`}
                        onConfirm={handleBatchDeleteStores}
                        okText="确定"
                        cancelText="取消"
                        disabled={selectedStoreKeys.length === 0}
                      >
                        <Button danger icon={<DeleteOutlined />} disabled={selectedStoreKeys.length === 0}>
                          批量删除 {selectedStoreKeys.length > 0 && `(${selectedStoreKeys.length})`}
                        </Button>
                      </Popconfirm>
                    </Space>
                    <span className="store-count">共 {stores.length} 家门店</span>
                  </div>
                  <Table
                    columns={storeColumns}
                    dataSource={stores}
                    rowKey="id"
                    loading={storesLoading}
                    pagination={{ pageSize: 20 }}
                    rowSelection={{
                      selectedRowKeys: selectedStoreKeys,
                      onChange: (keys) => setSelectedStoreKeys(keys),
                    }}
                  />
                </div>
              </TabPane>

              {/* 源商品映射数据库 */}
              <TabPane
                tab={
                  <span>
                    <SwapOutlined />
                    源商品映射数据库
                  </span>
                }
                key="mappings"
              >
                <div className="mappings-tab">
                  <Alert
                    message="源商品名称映射说明"
                    description="将解析出的各种单品名称变体统一映射到标准的源商品名称，便于后续统计分析。例如：'夏威夷风情披萨9英寸' 和 '夏威夷风味披萨' 可以统一映射到 '夏威夷披萨9寸'。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card title="映射列表" size="small">
                        <div className="tab-toolbar">
                          <Space>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => setAddMappingModalVisible(true)}
                            >
                              添加映射
                            </Button>
                            <Button icon={<PlusOutlined />} onClick={() => setBatchMappingModalVisible(true)}>
                              批量添加
                            </Button>
                            <Popconfirm
                              title={`确定要删除选中的 ${selectedMappingKeys.length} 条映射吗？`}
                              onConfirm={handleBatchDeleteMappings}
                              okText="确定"
                              cancelText="取消"
                              disabled={selectedMappingKeys.length === 0}
                            >
                              <Button danger icon={<DeleteOutlined />} disabled={selectedMappingKeys.length === 0}>
                                批量删除 {selectedMappingKeys.length > 0 && `(${selectedMappingKeys.length})`}
                              </Button>
                            </Popconfirm>
                            <Select
                              style={{ width: 200 }}
                              placeholder="按源商品筛选"
                              allowClear
                              value={selectedSourceName || undefined}
                              onChange={(v) => {
                                setSelectedSourceName(v || '');
                                setTimeout(loadMappings, 0);
                              }}
                              options={sourceNames.map((s) => ({ label: s, value: s }))}
                            />
                          </Space>
                          <span className="mapping-count">共 {mappings.length} 条映射</span>
                        </div>
                        <Table
                          columns={mappingColumns}
                          dataSource={mappings}
                          rowKey="id"
                          loading={mappingsLoading}
                          pagination={{ pageSize: 15 }}
                          size="small"
                          rowSelection={{
                            selectedRowKeys: selectedMappingKeys,
                            onChange: (keys) => setSelectedMappingKeys(keys),
                          }}
                        />
                      </Card>

                    <Card title="未映射单品" size="small">
                        <div className="upload-section" style={{ marginBottom: 16 }}>
                          <Upload
                            accept=".xlsx,.csv"
                            fileList={mappingFileList}
                            beforeUpload={(file) => {
                              handleGetUnmapped(file);
                              setMappingFileList([file]);
                              return false;
                            }}
                            onRemove={() => {
                              setMappingFileList([]);
                              setUnmappedProducts([]);
                            }}
                            maxCount={1}
                          >
                            <Button icon={<UploadOutlined />} loading={unmappedLoading}>
                              上传订单查找未映射
                            </Button>
                          </Upload>
                        </div>
                        {unmappedStats && (
                          <div style={{
                            display: 'flex',
                            gap: 16,
                            marginBottom: 12,
                            padding: '10px 16px',
                            background: '#fafafa',
                            borderRadius: 8,
                          }}>
                            <Statistic title="解析单品总数" value={unmappedStats.total} valueStyle={{ fontSize: 18 }} />
                            <Statistic title="已映射" value={unmappedStats.mapped} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
                            <Statistic title="未映射" value={unmappedStats.unmapped} valueStyle={{ fontSize: 18, color: '#cf1322' }} />
                            <Statistic
                              title="映射覆盖率"
                              value={unmappedStats.total > 0 ? ((unmappedStats.mapped / unmappedStats.total) * 100).toFixed(1) : 0}
                              suffix="%"
                              valueStyle={{
                                fontSize: 18,
                                color: unmappedStats.total > 0 && (unmappedStats.mapped / unmappedStats.total) >= 0.9 ? '#52c41a' : '#fa8c16',
                              }}
                            />
                          </div>
                        )}
                        {unmappedProducts.length > 0 ? (
                          <Table
                            columns={unmappedColumns}
                            dataSource={unmappedProducts}
                            rowKey="parsed_name"
                            pagination={{ pageSize: 10 }}
                            size="small"
                            scroll={{ x: 900, y: 400 }}
                          />
                        ) : (
                          <Empty description="上传订单Excel以查找未映射的单品" />
                        )}
                      </Card>
                  </div>
                </div>
              </TabPane>

              {/* 源商品原料卡 */}
              <TabPane
                tab={
                  <span>
                    <ExperimentOutlined />
                    源商品原料卡
                  </span>
                }
                key="recipes"
              >
                <div className="recipes-tab">
                  <div className="tab-toolbar">
                    <Space>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddRecipeModalVisible(true)}>
                        添加原料卡
                      </Button>
                      <Button icon={<PlusOutlined />} onClick={() => setBatchRecipeModalVisible(true)}>
                        批量添加
                      </Button>
                      <Popconfirm
                        title={`确定要删除选中的 ${selectedRecipeKeys.length} 条原料卡吗？`}
                        onConfirm={handleBatchDeleteRecipes}
                        okText="确定"
                        cancelText="取消"
                        disabled={selectedRecipeKeys.length === 0}
                      >
                        <Button danger icon={<DeleteOutlined />} disabled={selectedRecipeKeys.length === 0}>
                          批量删除 {selectedRecipeKeys.length > 0 && `(${selectedRecipeKeys.length})`}
                        </Button>
                      </Popconfirm>
                      <Select
                        style={{ width: 300 }}
                        placeholder="按源商品筛选"
                        allowClear
                        value={selectedProduct || undefined}
                        onChange={(v) => {
                          setSelectedProduct(v || '');
                          setTimeout(loadRecipes, 0);
                        }}
                        options={recipeProducts.map((p) => ({ label: p, value: p }))}
                      />
                    </Space>
                    <span className="recipe-count">共 {recipes.length} 条记录</span>
                  </div>
                  <Table
                    columns={recipeColumns}
                    dataSource={recipes}
                    rowKey="id"
                    loading={recipesLoading}
                    pagination={{ pageSize: 20 }}
                    rowSelection={{
                      selectedRowKeys: selectedRecipeKeys,
                      onChange: (keys) => setSelectedRecipeKeys(keys),
                    }}
                  />
                </div>
              </TabPane>

              {/* 原料成本数据库 */}
              <TabPane
                tab={
                  <span>
                    <AccountBookOutlined />
                    原料成本数据库
                  </span>
                }
                key="ingredients"
              >
                <div className="ingredients-tab">
                  <div className="tab-toolbar">
                    <Space>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddIngredientModalVisible(true)}>
                        添加原料
                      </Button>
                      <Button icon={<PlusOutlined />} onClick={() => setBatchIngredientModalVisible(true)}>
                        批量添加
                      </Button>
                      <Popconfirm
                        title={`确定要删除选中的 ${selectedIngredientKeys.length} 种原料吗？`}
                        onConfirm={handleBatchDeleteIngredients}
                        okText="确定"
                        cancelText="取消"
                        disabled={selectedIngredientKeys.length === 0}
                      >
                        <Button danger icon={<DeleteOutlined />} disabled={selectedIngredientKeys.length === 0}>
                          批量删除 {selectedIngredientKeys.length > 0 && `(${selectedIngredientKeys.length})`}
                        </Button>
                      </Popconfirm>
                    </Space>
                    <span className="ingredient-count">共 {ingredients.length} 种原料</span>
                  </div>
                  <Table
                    columns={ingredientColumns}
                    dataSource={ingredients}
                    rowKey="id"
                    loading={ingredientsLoading}
                    pagination={{ pageSize: 20 }}
                    rowSelection={{
                      selectedRowKeys: selectedIngredientKeys,
                      onChange: (keys) => setSelectedIngredientKeys(keys),
                    }}
                  />
                </div>
              </TabPane>
            </Tabs>
          </TabPane>
        </Tabs>

        {/* 添加门店弹窗 */}
        <Modal
          title="添加可分析门店"
          open={addStoreModalVisible}
          onOk={handleAddStore}
          onCancel={() => {
            setAddStoreModalVisible(false);
            storeForm.resetFields();
          }}
        >
          <Form form={storeForm} layout="vertical">
            <Form.Item name="store_name" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
              <Input placeholder="请输入门店名称（需与Excel中一致）" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 批量添加门店弹窗 */}
        <Modal
          title="批量添加门店"
          open={batchAddModalVisible}
          onOk={handleBatchAddStores}
          onCancel={() => {
            setBatchAddModalVisible(false);
            batchStoreForm.resetFields();
          }}
          width={600}
        >
          <Form form={batchStoreForm} layout="vertical">
            <Form.Item
              name="store_names"
              label="门店名称列表"
              rules={[{ required: true, message: '请输入门店名称' }]}
              extra="每行一个门店名称"
            >
              <TextArea rows={10} placeholder="每行输入一个门店名称" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 添加原料卡弹窗 */}
        <Modal
          title="添加源商品原料卡"
          open={addRecipeModalVisible}
          onOk={handleAddRecipe}
          onCancel={() => {
            setAddRecipeModalVisible(false);
            recipeForm.resetFields();
          }}
        >
          <Form form={recipeForm} layout="vertical">
            <Form.Item name="product_name" label="源商品名称" rules={[{ required: true, message: '请输入源商品名称' }]}>
              <Input placeholder="如: 夏威夷风情披萨9英寸" />
            </Form.Item>
            <Form.Item name="ingredient_name" label="原料名称" rules={[{ required: true, message: '请输入原料名称' }]}>
              <Input placeholder="如: 面团" />
            </Form.Item>
            <Form.Item name="ingredient_unit" label="计量单位" rules={[{ required: true, message: '请输入计量单位' }]}>
              <Input placeholder="如: 克" />
            </Form.Item>
            <Form.Item name="quantity" label="用量" rules={[{ required: true, message: '请输入用量' }]}>
              <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }} placeholder="如: 150" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 批量添加原料卡弹窗 */}
        <Modal
          title="批量添加源商品原料卡"
          open={batchRecipeModalVisible}
          onOk={handleBatchAddRecipes}
          onCancel={() => {
            setBatchRecipeModalVisible(false);
            batchRecipeForm.resetFields();
          }}
          width={800}
        >
          <Form form={batchRecipeForm} layout="vertical">
            <Form.Item
              name="recipes"
              label="原料卡数据"
              rules={[{ required: true, message: '请输入原料卡数据' }]}
              extra={
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                  <div><strong>格式说明：</strong>每行一个源商品，格式为：</div>
                  <div style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: 8, marginTop: 4, borderRadius: 4 }}>
                    源商品名称,原料1名称,原料1用量,原料1单位,原料2名称,原料2用量,原料2单位,...
                  </div>
                  <div style={{ marginTop: 8 }}><strong>校验规则：</strong>除去源商品名称后，剩余字段数必须是3的倍数（每组原料包含：名称、用量、单位）</div>
                </div>
              }
            >
              <TextArea
                rows={12}
                placeholder={`夏威夷披萨9寸,面团,200,克,番茄酱,50,克,芝士,100,克,菠萝,80,克,火腿,60,克
培根披萨9寸,面团,200,克,番茄酱,50,克,芝士,100,克,培根,80,克
可乐,可乐原浆,1,罐`}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 添加原料成本弹窗 */}
        <Modal
          title="添加原料成本"
          open={addIngredientModalVisible}
          onOk={handleAddIngredient}
          onCancel={() => {
            setAddIngredientModalVisible(false);
            ingredientForm.resetFields();
          }}
        >
          <Form form={ingredientForm} layout="vertical">
            <Form.Item
              name="ingredient_name"
              label="原料名称"
              rules={[{ required: true, message: '请输入原料名称' }]}
            >
              <Input placeholder="如: 面团" />
            </Form.Item>
            <Form.Item name="unit" label="计量单位" rules={[{ required: true, message: '请输入计量单位' }]}>
              <Input placeholder="如: 克" />
            </Form.Item>
            <Form.Item name="unit_cost" label="单位成本" rules={[{ required: true, message: '请输入单位成本' }]}>
              <InputNumber
                min={0}
                step={0.0001}
                precision={4}
                style={{ width: '100%' }}
                prefix="¥"
                placeholder="如: 0.01"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 批量添加原料成本弹窗 */}
        <Modal
          title="批量添加原料成本"
          open={batchIngredientModalVisible}
          onOk={handleBatchAddIngredients}
          onCancel={() => {
            setBatchIngredientModalVisible(false);
            batchIngredientForm.resetFields();
          }}
          width={700}
        >
          <Form form={batchIngredientForm} layout="vertical">
            <Form.Item
              name="ingredients"
              label="原料成本数据"
              rules={[{ required: true, message: '请输入原料成本数据' }]}
              extra={
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                  <div><strong>格式说明：</strong>每行一条原料，格式为：</div>
                  <div style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: 8, marginTop: 4, borderRadius: 4 }}>
                    原料名称,计量单位,单位成本
                  </div>
                </div>
              }
            >
              <TextArea
                rows={12}
                placeholder={`面团,克,0.005
番茄酱,克,0.008
芝士,克,0.015
菠萝,克,0.006
火腿,克,0.012
可乐原浆,罐,2.5`}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 添加映射弹窗 */}
        <Modal
          title="添加源商品映射"
          open={addMappingModalVisible}
          onOk={handleAddMapping}
          onCancel={() => {
            setAddMappingModalVisible(false);
            mappingForm.resetFields();
          }}
        >
          <Form form={mappingForm} layout="vertical">
            <Form.Item
              name="parsed_name"
              label="解析单品名称"
              rules={[{ required: true, message: '请输入解析单品名称' }]}
              extra="从订单中解析出的原始单品名称"
            >
              <Input placeholder="如: 夏威夷风情披萨9英寸" />
            </Form.Item>
            <Form.Item
              name="source_name"
              label="源商品名称"
              rules={[{ required: true, message: '请输入源商品名称' }]}
              extra="标准化后的统一名称"
            >
              <Input placeholder="如: 夏威夷披萨9寸" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 批量添加映射弹窗 */}
        <Modal
          title="批量添加映射"
          open={batchMappingModalVisible}
          onOk={handleBatchAddMappings}
          onCancel={() => {
            setBatchMappingModalVisible(false);
            batchMappingForm.resetFields();
          }}
          width={700}
        >
          <Form form={batchMappingForm} layout="vertical">
            <Form.Item
              name="mappings"
              label="映射数据"
              rules={[{ required: true, message: '请输入映射数据' }]}
              extra="每行一条映射，格式：解析名称,源商品名称 (用逗号、Tab分隔)。如果只填写一个名称，则源商品名称与解析名称相同。"
            >
              <TextArea
                rows={12}
                placeholder={`夏威夷风情披萨9英寸,夏威夷披萨9寸
夏威夷风味披萨,夏威夷披萨9寸
新奥尔良烤翅,新奥尔良鸡翅
可乐听装
雪碧听装`}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Excel预览弹窗 */}
        <Modal
          title="Excel文件预览"
          open={previewModalVisible}
          onCancel={() => {
            setPreviewModalVisible(false);
            setPreviewData(null);
          }}
          width={1200}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setPreviewModalVisible(false);
                setPreviewData(null);
              }}
            >
              取消
            </Button>,
            <Button
              key="confirm"
              type="primary"
              onClick={handleConfirmAnalyze}
              disabled={!previewData?.has_store_col || !previewData?.has_product_col}
            >
              确认解析
            </Button>,
          ]}
        >
          {previewData && (
            <div className="preview-content">
              <div className="preview-summary" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="总行数" value={previewData.total_rows} />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="文件中门店数"
                      value={previewData.stores_in_file.length}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="匹配可分析门店"
                      value={previewData.matched_stores.length}
                      valueStyle={{ color: previewData.matched_stores.length > 0 ? '#52c41a' : '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="未匹配门店"
                      value={previewData.unmatched_stores.length}
                      valueStyle={{ color: previewData.unmatched_stores.length > 0 ? '#faad14' : '#52c41a' }}
                    />
                  </Col>
                </Row>
              </div>

              {!previewData.has_store_col && (
                <Alert
                  type="error"
                  showIcon
                  message='未找到"门店名称"列'
                  description='请确保Excel文件包含"门店名称"列'
                  style={{ marginBottom: 16 }}
                />
              )}

              {!previewData.has_product_col && (
                <Alert
                  type="error"
                  showIcon
                  message='未找到"商品信息"列'
                  description='请确保Excel文件包含"商品信息"列'
                  style={{ marginBottom: 16 }}
                />
              )}

              {previewData.matched_stores.length === 0 && previewData.has_store_col && (
                <Alert
                  type="warning"
                  showIcon
                  message="没有匹配的可分析门店"
                  description={
                    <div>
                      <p>文件中的门店都未在"可分析门店数据库"中配置。</p>
                      <p>文件中的门店列表：</p>
                      <div style={{ maxHeight: 100, overflow: 'auto' }}>
                        {previewData.stores_in_file.slice(0, 20).map((s) => (
                          <Tag key={s} style={{ marginBottom: 4 }}>
                            {s}
                          </Tag>
                        ))}
                        {previewData.stores_in_file.length > 20 && (
                          <Tag>...还有 {previewData.stores_in_file.length - 20} 个</Tag>
                        )}
                      </div>
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {previewData.matched_stores.length > 0 && (
                <Alert
                  type="success"
                  showIcon
                  message={`将解析 ${previewData.matched_stores.length} 家门店的订单`}
                  description={
                    <div style={{ maxHeight: 100, overflow: 'auto' }}>
                      {previewData.matched_stores.map((s) => (
                        <Tag key={s} color="green" style={{ marginBottom: 4 }}>
                          {s}
                        </Tag>
                      ))}
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              <div style={{ marginBottom: 8 }}>
                <strong>数据预览（前20行）：</strong>
              </div>
              <Table
                columns={getPreviewColumns()}
                dataSource={previewData.preview_rows.map((row, index) => ({ ...row, _key: index }))}
                rowKey="_key"
                size="small"
                scroll={{ x: 'max-content', y: 300 }}
                pagination={false}
              />
            </div>
          )}
        </Modal>

        {/* 未映射单品溯源详情弹窗 */}
        <Modal
          title={null}
          open={unmappedDetailVisible}
          onCancel={() => { setUnmappedDetailVisible(false); setUnmappedDetailProduct(null); }}
          width={1100}
          footer={[
            <Button key="add" type="primary" onClick={() => {
              if (unmappedDetailProduct) {
                mappingForm.setFieldsValue({ parsed_name: unmappedDetailProduct.parsed_name });
                setAddMappingModalVisible(true);
              }
            }}>
              添加映射
            </Button>,
            <Button key="quick" onClick={() => {
              if (unmappedDetailProduct) {
                handleQuickAddMapping(unmappedDetailProduct.parsed_name);
                setUnmappedDetailVisible(false);
                setUnmappedDetailProduct(null);
              }
            }}>
              快速添加（同名映射）
            </Button>,
            <Button key="close" onClick={() => { setUnmappedDetailVisible(false); setUnmappedDetailProduct(null); }}>
              关闭
            </Button>,
          ]}
        >
          {unmappedDetailProduct && (
            <div>
              {/* 顶部汇总卡片 */}
              <div style={{
                background: 'linear-gradient(135deg, #fff1f0, #fff7e6)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Tag color="red" style={{ fontSize: 16, padding: '4px 12px', lineHeight: '24px' }}>未映射</Tag>
                  <Text strong style={{ fontSize: 20 }}>{unmappedDetailProduct.parsed_name}</Text>
                </div>
                <Row gutter={24}>
                  <Col span={8}>
                    <Statistic title="总出现次数" value={unmappedDetailProduct.count} valueStyle={{ color: '#cf1322' }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="涉及门店数" value={unmappedDetailProduct.store_count} suffix="家" valueStyle={{ color: '#1890ff' }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="订单样本数" value={unmappedDetailProduct.details.length} suffix={`条${unmappedDetailProduct.details.length >= 10 ? '（上限）' : ''}`} valueStyle={{ color: '#722ed1' }} />
                  </Col>
                </Row>
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">涉及门店：</Text>
                  <div style={{ marginTop: 4 }}>
                    {unmappedDetailProduct.stores.map((s, i) => (
                      <Tag key={i} color="blue" style={{ marginBottom: 4 }}>{s}</Tag>
                    ))}
                  </div>
                </div>
              </div>

              {/* 订单级详情列表 */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {unmappedDetailProduct.details.map((detail: UnmappedDetail, idx: number) => (
                  <Card
                    key={idx}
                    size="small"
                    style={{ marginBottom: 12, borderRadius: 8, borderLeft: '4px solid #1890ff' }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color="blue">{detail.store_name}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          订单拆解为 <Text strong style={{ color: '#fa8c16' }}>{detail.total_parsed}</Text> 项
                        </Text>
                      </div>
                    }
                  >
                    {/* 原始订单文本 */}
                    <div style={{
                      background: '#fafafa',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 10,
                      fontSize: 12,
                      color: '#595959',
                      wordBreak: 'break-all',
                      maxHeight: 60,
                      overflowY: 'auto',
                      border: '1px dashed #d9d9d9',
                    }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>原始商品信息：</Text>
                      <br />
                      {detail.order_text}
                    </div>

                    {/* 拆解结果 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {detail.all_items.map((item, iIdx) => (
                        <Tag
                          key={iIdx}
                          color={item.is_unmapped ? 'red' : 'green'}
                          style={{
                            fontSize: 13,
                            padding: '2px 10px',
                            borderStyle: item.name === unmappedDetailProduct.parsed_name ? 'solid' : undefined,
                            borderWidth: item.name === unmappedDetailProduct.parsed_name ? 2 : undefined,
                            borderColor: item.name === unmappedDetailProduct.parsed_name ? '#ff4d4f' : undefined,
                            fontWeight: item.name === unmappedDetailProduct.parsed_name ? 700 : 400,
                          }}
                        >
                          {item.is_unmapped ? '⚠ ' : '✓ '}
                          {item.name} ×{item.qty}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Modal>

      </Card>
    </div>
  );
};

export default ElemeCostAnalysis;
