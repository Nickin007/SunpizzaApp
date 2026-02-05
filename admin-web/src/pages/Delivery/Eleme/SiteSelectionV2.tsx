import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Select, Button, List, Tag, message, Space, 
  Spin, Checkbox, Row, Col, Empty, Tooltip,
  AutoComplete, Badge, Divider, Modal, Progress
} from 'antd';
import { 
  SearchOutlined, EnvironmentOutlined, 
  DownloadOutlined, ReloadOutlined,
  EyeOutlined, EyeInvisibleOutlined, SyncOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
  BorderOutlined, RadiusSettingOutlined, LineOutlined,
  DragOutlined, EnvironmentFilled, DeleteOutlined,
  ColumnWidthOutlined
} from '@ant-design/icons';
import { poiApi } from '../../../api/poi';
import type { POIStore, Brand, POITypeConfig, OtherPOIType } from '../../../api/poi';
import './SiteSelection.css';

const { Option } = Select;

// 品牌颜色预设
const BRAND_COLORS: Record<string, string> = {
  '必胜客': '#e74c3c', '尊宝': '#e67e22', '达美乐': '#c0392b',
  '肯德基': '#f39c12', 'KFC': '#f39c12', '麦当劳': '#d35400',
  '塔斯汀': '#f39c12', '华莱士': '#e67e22',
  '瑞幸咖啡': '#3498db', '古茗': '#5dade2', '霸王茶姬': '#2874a6',
  '茶百道': '#5dade2', '沪上阿姨': '#85c1e9', '一点点': '#3498db',
  '圣比萨': '#e74c3c', '罗嘟嘟': '#c0392b', '乐凯撒': '#e74c3c',
  '棒约翰': '#d35400',
};

// 默认颜色池
const DEFAULT_COLORS = [
  '#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60',
  '#2980b9', '#8e44ad', '#c0392b', '#d35400', '#2c3e50'
];

// 获取品牌颜色
const getBrandColor = (brandName: string): string => {
  if (BRAND_COLORS[brandName]) {
    return BRAND_COLORS[brandName];
  }
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
};

// 城市列表（带"市"后缀，与数据库保持一致）
// 按省份分组：浙江省、江苏省、上海市
const CITIES = [
  // 浙江省（11个地级市）
  '杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市',
  // 上海市（直辖市）
  '上海市',
  // 江苏省（13个地级市）
  '南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市',
];

const SiteSelectionV2: React.FC = () => {
  // 基础状态
  const [city, setCity] = useState('杭州市');
  const [loading, setLoading] = useState(false);
  
  // 品牌管理
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandVisibility, setBrandVisibility] = useState<Record<string, boolean>>({});
  const [brandsLoading, setBrandsLoading] = useState(false);
  
  // 门店数据
  const [stores, setStores] = useState<POIStore[]>([]);
  const [storesByBrand, setStoresByBrand] = useState<Record<string, POIStore[]>>({});
  
  // 数据库更新
  const [updateKeyword, setUpdateKeyword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMode, setUpdateMode] = useState<'brand' | 'other'>('brand');  // 更新模式
  
  // 进度提示
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  // 其他POI类型
  const [poiTypes, setPOITypes] = useState<POITypeConfig[]>([]);
  const [selectedPOIType, setSelectedPOIType] = useState<string>('');
  const [otherPOIs, setOtherPOIs] = useState<OtherPOIType[]>([]);
  const [selectedOtherPOIs, setSelectedOtherPOIs] = useState<string[]>([]);
  const [otherPOIStores, setOtherPOIStores] = useState<Record<string, POIStore[]>>({});
  const [otherPOIVisibility, setOtherPOIVisibility] = useState<Record<string, boolean>>({});
  
  // 地图相关
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any[]>>({});
  const isInitializingRef = useRef<boolean>(false);
  
  // 绘图工具相关
  const [drawingToolVisible, setDrawingToolVisible] = useState(false);
  const [drawingMode, setDrawingMode] = useState<string>('');
  const mouseToolRef = useRef<any>(null);
  const rangingToolRef = useRef<any>(null);
  const drawOverlaysRef = useRef<any[]>([]);

  // 加载高德地图API
  useEffect(() => {
    const loadAmapScript = () => {
      if ((window as any).AMap) {
        setMapLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src*="webapi.amap.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setMapLoaded(true));
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'amap-script';
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=03a638e9a905bb792a66d2bddc1f4ea0`;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => message.error('地图加载失败');
      document.head.appendChild(script);
    };

    loadAmapScript();

    return () => {
      // 清理地图
      Object.values(markersRef.current).forEach(markers => {
        markers.forEach(marker => {
          try { marker.setMap(null); } catch (e) {}
        });
      });
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.destroy(); } catch (e) {}
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
    };
  }, []);

  // 初始化地图
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current && !isInitializingRef.current) {
      isInitializingRef.current = true;
      
      try {
        const AMap = (window as any).AMap;
        const container = mapRef.current;
        
        mapInstanceRef.current = new AMap.Map(container, {
          zoom: 12,
          center: [120.15, 30.28],
        });

        setTimeout(() => {
          if (mapInstanceRef.current) {
            isInitializingRef.current = false;
            AMap.plugin([
              'AMap.Scale', 
              'AMap.ToolBar', 
              'AMap.MouseTool',
              'AMap.RangingTool'
            ], () => {
              if (mapInstanceRef.current) {
                try {
                  mapInstanceRef.current.addControl(new AMap.Scale());
                  mapInstanceRef.current.addControl(new AMap.ToolBar());
                  
                  // 初始化绘图工具
                  mouseToolRef.current = new AMap.MouseTool(mapInstanceRef.current);
                  rangingToolRef.current = new AMap.RangingTool(mapInstanceRef.current);
                  
                  // 绘制完成后的回调
                  mouseToolRef.current.on('draw', (e: any) => {
                    drawOverlaysRef.current.push(e.obj);
                    message.success('绘制完成');
                  });
                } catch (err) {
                  console.error('地图控件初始化失败:', err);
                }
              }
            });
          }
        }, 100);
      } catch (error) {
        console.error('地图初始化失败:', error);
        isInitializingRef.current = false;
      }
    }
  }, [mapLoaded]);

  // 加载品牌列表和POI类型
  useEffect(() => {
    loadBrands();
    loadPOITypes();
    loadOtherPOIs();
  }, [city]);

  // 加载品牌列表
  const loadBrands = async () => {
    setBrandsLoading(true);
    try {
      const response = await poiApi.getBrands({ city });
      if (response.data.code === 200) {
        const brands = response.data.data.brands || [];
        setAvailableBrands(brands);
        
        const visibility: Record<string, boolean> = {};
        brands.forEach((brand: Brand) => {
          visibility[brand.brand_name] = true;
        });
        setBrandVisibility(visibility);
      }
    } catch (error) {
      message.error('加载品牌列表失败');
    } finally {
      setBrandsLoading(false);
    }
  };

  // 加载POI类型配置
  const loadPOITypes = async () => {
    try {
      const response = await poiApi.getPOITypes();
      if (response.data.code === 200) {
        setPOITypes(response.data.data.types || []);
      }
    } catch (error) {
      console.error('加载POI类型失败:', error);
    }
  };

  // 加载其他POI列表
  const loadOtherPOIs = async () => {
    try {
      const response = await poiApi.getOtherPOIs({ city });
      if (response.data.code === 200) {
        const pois = response.data.data.poi_types || [];
        setOtherPOIs(pois);
        
        const visibility: Record<string, boolean> = {};
        pois.forEach((poi: OtherPOIType) => {
          visibility[poi.poi_type] = true;
        });
        setOtherPOIVisibility(visibility);
      }
    } catch (error) {
      console.error('加载其他POI失败:', error);
    }
  };

  // 更新品牌POI数据库
  const handleUpdateBrand = async () => {
    if (!updateKeyword.trim()) {
      message.warning('请输入品牌关键词');
      return;
    }

    setUpdating(true);
    setProgressVisible(true);
    setProgressPercent(0);
    setProgressText(`正在更新品牌: ${updateKeyword.trim()}`);
    
    // 模拟进度增长（预计1-2分钟完成120页）
    const progressInterval = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return prev; // 最多到90%，等待实际完成
        return prev + Math.random() * 10;
      });
    }, 1000);
    
    try {
      const response = await poiApi.searchPOI({
        keyword: updateKeyword.trim(),
        city,
        max_pages: 120,  // 最多120页，支持3000条数据（120 × 25）
        save_to_db: true,
        poi_category: 'brand',
      });

      clearInterval(progressInterval);
      setProgressPercent(100);
      setProgressText('更新完成！');
      
      setTimeout(() => {
        setProgressVisible(false);
      }, 1500);
      
      if (response.data.code === 200) {
        message.success(`✅ ${response.data.message}`, 3);
        await loadBrands();
        
        if (!selectedBrands.includes(updateKeyword.trim())) {
          setSelectedBrands([...selectedBrands, updateKeyword.trim()]);
        }
        setUpdateKeyword('');
      } else {
        message.error(response.data.message || '更新失败');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgressVisible(false);
      message.error('更新失败，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };

  // 更新其他POI数据库
  const handleUpdateOtherPOI = async () => {
    if (!selectedPOIType) {
      message.warning('请选择POI类型');
      return;
    }

    const typeConfig = poiTypes.find(t => t.type === selectedPOIType);
    if (!typeConfig) {
      message.warning('未找到该类型的配置');
      return;
    }

    setUpdating(true);
    setProgressVisible(true);
    setProgressPercent(0);
    
    // 检查是使用types（高德官方编码）还是keywords
    const useTypes = typeConfig.types && typeConfig.types.length > 0;
    
    if (useTypes) {
      // 使用高德官方POI分类编码（types）
      const types = typeConfig.types!.join('|');  // 多个编码用|分隔
      setProgressText(`正在更新${selectedPOIType}数据（官方分类 · 按区县查询）`);
      
      // 模拟进度增长
      const progressInterval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 2000);
      
      try {
        const response = await poiApi.searchPOI({
          types,  // 使用types参数
          city,
          max_pages: 2000,  // 最多2000页，50000条数据
          save_to_db: true,
          poi_category: selectedPOIType,
        });
        
        clearInterval(progressInterval);
        setProgressPercent(100);
        setProgressText('更新完成！');
        
        setTimeout(() => {
          setProgressVisible(false);
        }, 1500);
        
        if (response.data.code === 200) {
          message.success(`✅ ${response.data.message}`, 5);
          await loadOtherPOIs();
          setSelectedPOIType('');
        } else {
          message.error(response.data.message || '更新失败');
        }
      } catch (error) {
        clearInterval(progressInterval);
        setProgressVisible(false);
        message.error('更新失败，请稍后重试');
      } finally {
        setUpdating(false);
      }
    } else {
      // 使用关键词搜索（keywords）
      const keywords = typeConfig.keywords;
      if (!keywords || keywords.length === 0) {
        message.warning('未找到该类型的关键词配置');
        setUpdating(false);
        return;
      }
      
      setProgressText(`正在更新${selectedPOIType}数据（共${keywords.length}个关键词）`);
      
      // 模拟进度增长
      const progressInterval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 2;
        });
      }, 2000);
      
      try {
        let totalStores = 0;
        let successCount = 0;
        
        // 遍历所有关键词，分别查询
        for (let i = 0; i < keywords.length; i++) {
          const keyword = keywords[i];
          setProgressText(`正在更新${selectedPOIType}数据: ${keyword} (${i+1}/${keywords.length})`);
          
          try {
            const response = await poiApi.searchPOI({
              keyword,
              city,
              max_pages: 2000,
              save_to_db: true,
              poi_category: selectedPOIType,
            });
            
            if (response.data.code === 200) {
              successCount++;
              const match = response.data.message.match(/保存了(\d+)条/);
              if (match) {
                totalStores += parseInt(match[1]);
              }
            }
          } catch (err) {
            console.error(`查询关键词 ${keyword} 失败:`, err);
          }
        }

        clearInterval(progressInterval);
        setProgressPercent(100);
        setProgressText(`更新完成！共${successCount}/${keywords.length}个关键词成功`);
        
        setTimeout(() => {
          setProgressVisible(false);
        }, 2000);
        
        if (successCount > 0) {
          message.success(`✅ 成功更新 ${selectedPOIType}！共查询${keywords.length}个关键词，保存${totalStores}条数据`, 5);
          await loadOtherPOIs();
          setSelectedPOIType('');
        } else {
          message.error('所有关键词查询都失败了');
        }
      } catch (error) {
        clearInterval(progressInterval);
        setProgressVisible(false);
        message.error('更新失败，请稍后重试');
      } finally {
        setUpdating(false);
      }
    }
  };

  // 加载选中品牌的门店数据
  const handleLoadSelectedBrands = async () => {
    if (selectedBrands.length === 0) {
      message.warning('请先选择要显示的品牌');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await poiApi.getStores({
        city,
        brand_name: selectedBrands.join(','),
      });
      
      if (response.data.code === 200) {
        const allStores = response.data.data.stores || [];
        setStores(allStores);
        
        // 按品牌分组
        const grouped: Record<string, POIStore[]> = {};
        allStores.forEach((store: POIStore) => {
          if (!grouped[store.brand_name]) {
            grouped[store.brand_name] = [];
          }
          grouped[store.brand_name].push(store);
        });
        setStoresByBrand(grouped);
        
        // 更新地图
        updateMapMarkersMultiBrand(grouped);
        
        message.success(`加载了 ${selectedBrands.length} 个品牌共 ${allStores.length} 家门店`);
      }
    } catch (error) {
      message.error('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载选中的其他POI
  const handleLoadSelectedOtherPOIs = async () => {
    if (selectedOtherPOIs.length === 0) {
      message.warning('请先选择要显示的POI类型');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await poiApi.getStores({
        city,
        brand_name: selectedOtherPOIs.join(','),  // brand_name在这里存储的是POI类型
      });
      
      if (response.data.code === 200) {
        const allStores = response.data.data.stores || [];
        
        // 按类型分组
        const grouped: Record<string, POIStore[]> = {};
        allStores.forEach((store: POIStore) => {
          if (!grouped[store.brand_name]) {
            grouped[store.brand_name] = [];
          }
          grouped[store.brand_name].push(store);
        });
        setOtherPOIStores(grouped);
        
        // 更新地图（添加其他POI）
        updateMapMarkersWithOtherPOI(storesByBrand, grouped);
        
        message.success(`加载了 ${selectedOtherPOIs.length} 种POI类型共 ${allStores.length} 个地点`);
      }
    } catch (error) {
      message.error('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 更新地图标记（多品牌）
  const updateMapMarkersMultiBrand = (brandStores: Record<string, POIStore[]>) => {
    if (!mapInstanceRef.current || isInitializingRef.current) {
      setTimeout(() => updateMapMarkersMultiBrand(brandStores), 500);
      return;
    }

    try {
      const AMap = (window as any).AMap;

      // 清除旧标记
      Object.values(markersRef.current).forEach(markers => {
        markers.forEach(marker => {
          try { marker.setMap(null); } catch (e) {}
        });
      });
      markersRef.current = {};

      let bounds: any = null;
      let totalMarkerCount = 0;

      // 为每个品牌创建标记
      Object.keys(brandStores).forEach(brandName => {
        const stores = brandStores[brandName] || [];
        const brandColor = getBrandColor(brandName);
        const isVisible = brandVisibility[brandName] !== false;
        
        markersRef.current[brandName] = [];

        stores.forEach((store) => {
          const lon = parseFloat(String(store.longitude));
          const lat = parseFloat(String(store.latitude));

          if (isNaN(lon) || isNaN(lat)) return;

          try {
            const iconHtml = `
              <div style="
                width: 24px;
                height: 24px;
                background-color: ${brandColor};
                border: 2px solid #fff;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 12px;
                font-weight: bold;
              ">${brandName[0]}</div>
            `;

            const marker = new AMap.Marker({
              position: [lon, lat],
              title: store.store_name,
              content: iconHtml,
              offset: new AMap.Pixel(-12, -12),
              visible: isVisible
            });

            marker.on('click', () => {
              const infoWindow = new AMap.InfoWindow({
                content: `
                  <div style="padding: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: ${brandColor};">${brandName}</h3>
                    <div><strong>${store.store_name}</strong></div>
                    <div style="color: #666; margin-top: 4px;">${store.full_address || store.address}</div>
                    ${store.phone ? `<div style="color: #666; margin-top: 4px;">📞 ${store.phone}</div>` : ''}
                  </div>
                `
              });
              infoWindow.open(mapInstanceRef.current, marker.getPosition());
            });

            marker.setMap(mapInstanceRef.current);
            markersRef.current[brandName].push(marker);
            totalMarkerCount++;

            if (!bounds) {
              bounds = new AMap.Bounds([lon, lat], [lon, lat]);
            } else {
              bounds.extend([lon, lat]);
            }
          } catch (e) {
            console.warn('创建标记失败:', e);
          }
        });
      });

      // 调整地图视野
      if (totalMarkerCount > 0 && bounds) {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.setBounds(bounds);
            } catch (e) {}
          }
        }, 100);
      }
    } catch (error) {
      console.error('更新地图标记失败:', error);
    }
  };

  // 更新地图标记（包含品牌和其他POI）
  const updateMapMarkersWithOtherPOI = (brandStores: Record<string, POIStore[]>, otherStores: Record<string, POIStore[]>) => {
    if (!mapInstanceRef.current || isInitializingRef.current) {
      setTimeout(() => updateMapMarkersWithOtherPOI(brandStores, otherStores), 500);
      return;
    }

    try {
      const AMap = (window as any).AMap;

      // 清除旧标记
      Object.values(markersRef.current).forEach(markers => {
        markers.forEach(marker => {
          try { marker.setMap(null); } catch (e) {}
        });
      });
      markersRef.current = {};

      let bounds: any = null;
      let totalMarkerCount = 0;

      // 创建品牌标记
      Object.keys(brandStores).forEach(brandName => {
        const stores = brandStores[brandName] || [];
        const brandColor = getBrandColor(brandName);
        const isVisible = brandVisibility[brandName] !== false;
        
        markersRef.current[brandName] = [];

        stores.forEach((store) => {
          const lon = parseFloat(String(store.longitude));
          const lat = parseFloat(String(store.latitude));

          if (isNaN(lon) || isNaN(lat)) return;

          try {
            const iconHtml = `
              <div style="
                width: 24px;
                height: 24px;
                background-color: ${brandColor};
                border: 2px solid #fff;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 12px;
                font-weight: bold;
              ">${brandName[0]}</div>
            `;

            const marker = new AMap.Marker({
              position: [lon, lat],
              title: store.store_name,
              content: iconHtml,
              offset: new AMap.Pixel(-12, -12),
              visible: isVisible
            });

            marker.on('click', () => {
              const infoWindow = new AMap.InfoWindow({
                content: `
                  <div style="padding: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: ${brandColor};">${brandName}</h3>
                    <div><strong>${store.store_name}</strong></div>
                    <div style="color: #666; margin-top: 4px;">${store.full_address || store.address}</div>
                    ${store.phone ? `<div style="color: #666; margin-top: 4px;">📞 ${store.phone}</div>` : ''}
                  </div>
                `
              });
              infoWindow.open(mapInstanceRef.current, marker.getPosition());
            });

            marker.setMap(mapInstanceRef.current);
            markersRef.current[brandName].push(marker);
            totalMarkerCount++;

            if (!bounds) {
              bounds = new AMap.Bounds([lon, lat], [lon, lat]);
            } else {
              bounds.extend([lon, lat]);
            }
          } catch (e) {
            console.warn('创建标记失败:', e);
          }
        });
      });

      // 创建其他POI标记
      Object.keys(otherStores).forEach(poiType => {
        const stores = otherStores[poiType] || [];
        const typeConfig = poiTypes.find(t => t.type === poiType);
        const icon = typeConfig?.icon || '📍';
        const color = typeConfig?.color || '#666666';
        const isVisible = otherPOIVisibility[poiType] !== false;
        
        const key = `poi_${poiType}`;
        markersRef.current[key] = [];

        stores.forEach((store) => {
          const lon = parseFloat(String(store.longitude));
          const lat = parseFloat(String(store.latitude));

          if (isNaN(lon) || isNaN(lat)) return;

          try {
            const iconHtml = `
              <div style="
                width: 28px;
                height: 28px;
                background-color: ${color};
                border: 2px solid #fff;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
              ">${icon}</div>
            `;

            const marker = new AMap.Marker({
              position: [lon, lat],
              title: store.store_name,
              content: iconHtml,
              offset: new AMap.Pixel(-14, -14),
              visible: isVisible
            });

            marker.on('click', () => {
              const infoWindow = new AMap.InfoWindow({
                content: `
                  <div style="padding: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: ${color};">${icon} ${poiType}</h3>
                    <div><strong>${store.store_name}</strong></div>
                    <div style="color: #666; margin-top: 4px;">${store.full_address || store.address}</div>
                    ${store.phone ? `<div style="color: #666; margin-top: 4px;">📞 ${store.phone}</div>` : ''}
                  </div>
                `
              });
              infoWindow.open(mapInstanceRef.current, marker.getPosition());
            });

            marker.setMap(mapInstanceRef.current);
            markersRef.current[key].push(marker);
            totalMarkerCount++;

            if (!bounds) {
              bounds = new AMap.Bounds([lon, lat], [lon, lat]);
            } else {
              bounds.extend([lon, lat]);
            }
          } catch (e) {
            console.warn('创建POI标记失败:', e);
          }
        });
      });

      // 调整地图视野
      if (totalMarkerCount > 0 && bounds) {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.setBounds(bounds);
            } catch (e) {}
          }
        }, 100);
      }
    } catch (error) {
      console.error('更新地图标记失败:', error);
    }
  };

  // 切换品牌可见性
  const toggleBrandVisibility = (brandName: string) => {
    const newVisibility = !brandVisibility[brandName];
    setBrandVisibility({
      ...brandVisibility,
      [brandName]: newVisibility
    });
    
    const markers = markersRef.current[brandName] || [];
    markers.forEach(marker => {
      try {
        if (newVisibility) {
          marker.show();
        } else {
          marker.hide();
        }
      } catch (e) {}
    });
  };

  // 切换其他POI可见性
  const toggleOtherPOIVisibility = (poiType: string) => {
    const newVisibility = !otherPOIVisibility[poiType];
    setOtherPOIVisibility({
      ...otherPOIVisibility,
      [poiType]: newVisibility
    });
    
    const key = `poi_${poiType}`;
    const markers = markersRef.current[key] || [];
    markers.forEach(marker => {
      try {
        if (newVisibility) {
          marker.show();
        } else {
          marker.hide();
        }
      } catch (e) {}
    });
  };

  // 快速选择品牌
  const handleQuickToggle = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brandName));
    } else {
      setSelectedBrands([...selectedBrands, brandName]);
    }
  };

  // 全屏切换
  const toggleFullscreen = () => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      // 进入全屏
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 绘图工具函数
  // 开启测距工具
  const startRanging = () => {
    if (!rangingToolRef.current) {
      message.warning('测距工具未初始化');
      return;
    }
    
    // 关闭其他绘图工具
    if (mouseToolRef.current) {
      mouseToolRef.current.close(false);
    }
    
    setDrawingMode('ranging');
    rangingToolRef.current.turnOn();
    message.info('测距模式已开启，点击地图开始测量');
  };

  // 绘制标记点
  const drawMarker = () => {
    if (!mouseToolRef.current) {
      message.warning('绘图工具未初始化');
      return;
    }
    
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    
    setDrawingMode('marker');
    mouseToolRef.current.marker({
      icon: new (window as any).AMap.Icon({
        size: new (window as any).AMap.Size(25, 34),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageSize: new (window as any).AMap.Size(25, 34)
      })
    });
    message.info('标记模式已开启，点击地图放置标记');
  };

  // 绘制折线
  const drawPolyline = () => {
    if (!mouseToolRef.current) {
      message.warning('绘图工具未初始化');
      return;
    }
    
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    
    setDrawingMode('polyline');
    mouseToolRef.current.polyline({
      strokeColor: '#3366FF',
      strokeWeight: 6,
      strokeOpacity: 0.9
    });
    message.info('画线模式已开启，点击地图绘制折线，双击结束');
  };

  // 绘制多边形
  const drawPolygon = () => {
    if (!mouseToolRef.current) {
      message.warning('绘图工具未初始化');
      return;
    }
    
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    
    setDrawingMode('polygon');
    mouseToolRef.current.polygon({
      fillColor: '#00b0ff',
      fillOpacity: 0.3,
      strokeColor: '#0080ff',
      strokeWeight: 2
    });
    message.info('多边形模式已开启，点击地图绘制多边形，双击结束');
  };

  // 绘制圆形
  const drawCircle = () => {
    if (!mouseToolRef.current) {
      message.warning('绘图工具未初始化');
      return;
    }
    
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    
    setDrawingMode('circle');
    mouseToolRef.current.circle({
      fillColor: '#ff9800',
      fillOpacity: 0.3,
      strokeColor: '#ff6d00',
      strokeWeight: 2
    });
    message.info('圆形模式已开启，点击确定圆心，拖动确定半径');
  };

  // 绘制矩形
  const drawRectangle = () => {
    if (!mouseToolRef.current) {
      message.warning('绘图工具未初始化');
      return;
    }
    
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    
    setDrawingMode('rectangle');
    mouseToolRef.current.rectangle({
      fillColor: '#4caf50',
      fillOpacity: 0.3,
      strokeColor: '#2e7d32',
      strokeWeight: 2
    });
    message.info('矩形模式已开启，点击并拖动绘制矩形');
  };

  // 关闭所有绘图工具
  const closeDrawing = () => {
    if (mouseToolRef.current) {
      mouseToolRef.current.close(false);
    }
    if (rangingToolRef.current) {
      rangingToolRef.current.turnOff();
    }
    setDrawingMode('');
    message.success('已关闭绘图工具');
  };

  // 清除所有绘制的图形
  const clearDrawings = () => {
    if (drawOverlaysRef.current.length === 0) {
      message.info('没有可清除的绘制内容');
      return;
    }

    Modal.confirm({
      title: '确认清除',
      content: `确定要清除所有绘制的图形吗？（共 ${drawOverlaysRef.current.length} 个）`,
      onOk: () => {
        drawOverlaysRef.current.forEach(overlay => {
          try {
            overlay.setMap(null);
          } catch (e) {
            console.warn('清除图形失败:', e);
          }
        });
        drawOverlaysRef.current = [];
        
        // 同时关闭测距工具的测距线
        if (rangingToolRef.current) {
          rangingToolRef.current.turnOff();
          rangingToolRef.current.turnOn();
          rangingToolRef.current.turnOff();
        }
        
        message.success('已清除所有绘制内容');
      }
    });
  };

  return (
    <div className="site-selection">
      {/* 进度提示Modal */}
      <Modal
        title="数据更新中"
        open={progressVisible}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <Progress 
            percent={Math.floor(progressPercent)} 
            status={progressPercent >= 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>
            {progressText}
          </div>
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#999' }}>
            {progressPercent < 100 ? '正在抓取数据，请勿关闭页面...' : ''}
          </div>
        </div>
      </Modal>

      <Card className="site-selection-container">
        <div className="page-header">
          <h2>
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            多品牌选址对比工具
          </h2>
          <p className="page-description">POI数据管理 · 多品牌可视化 · 竞品分析</p>
        </div>

        <div className="content-wrapper">
          {/* 左侧控制面板 */}
          <div className="search-panel">
            {/* 城市选择 */}
            <Card size="small" title="📍 城市选择" style={{ marginBottom: 16 }}>
              <Select
                style={{ width: '100%' }}
                value={city}
                onChange={setCity}
                showSearch
                placeholder="选择城市"
              >
                {CITIES.map((c) => (
                  <Option key={c} value={c}>{c}</Option>
                ))}
              </Select>
            </Card>
            
            {/* 数据库更新 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <SyncOutlined />
                  数据库更新
                </Space>
              } 
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 更新模式切换 */}
                <div>
                  <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                    更新类型：
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    value={updateMode}
                    onChange={setUpdateMode}
                  >
                    <Option value="brand">品牌门店</Option>
                    <Option value="other">其他POI（学校/医院等）</Option>
                  </Select>
                </div>

                {updateMode === 'brand' ? (
                  <>
                    <div>
                      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                        从高德地图更新品牌POI数据：
                      </div>
                      <AutoComplete
                        style={{ width: '100%' }}
                        value={updateKeyword}
                        onChange={setUpdateKeyword}
                        options={availableBrands.map(b => ({ value: b.brand_name }))}
                        placeholder="输入品牌名称（如：必胜客）"
                        filterOption={(input, option) =>
                          (option?.value || '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={updating} />}
                      onClick={handleUpdateBrand}
                      loading={updating}
                      block
                    >
                      更新该品牌POI数据库
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                        选择POI类型并更新：
                      </div>
                      <Select
                        style={{ width: '100%' }}
                        value={selectedPOIType}
                        onChange={setSelectedPOIType}
                        placeholder="选择POI类型"
                      >
                        {poiTypes.map(type => (
                          <Option key={type.type} value={type.type}>
                            <Space>
                              <span>{type.icon}</span>
                              <span>{type.type}</span>
                              {type.types && type.types.length > 0 ? (
                                <Tag color="blue">官方分类({type.types.length})</Tag>
                              ) : (
                                <Tag>{type.keywords?.[0] || '暂无'}</Tag>
                              )}
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={updating} />}
                      onClick={handleUpdateOtherPOI}
                      loading={updating}
                      disabled={!selectedPOIType}
                      block
                    >
                      更新该POI类型数据库
                    </Button>
                  </>
                )}
              </Space>
            </Card>
            
            {/* 品牌选择 */}
            <Card 
              size="small"
              title={
                <Space>
                  <span>🏪 品牌选择</span>
                  <Badge count={selectedBrands.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              extra={
                <Space>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setSelectedBrands(availableBrands.map(b => b.brand_name))}
                  >
                    全选
                  </Button>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setSelectedBrands([])}
                  >
                    清空
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Spin spinning={brandsLoading}>
                {availableBrands.length === 0 ? (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无品牌数据，请先更新数据库"
                    style={{ margin: '20px 0' }}
                  />
                ) : (
                  <>
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                      <Checkbox.Group
                        value={selectedBrands}
                        onChange={(values) => setSelectedBrands(values as string[])}
                        style={{ width: '100%' }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          {availableBrands.map((brand) => (
                            <div
                              key={brand.brand_name}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 4,
                                border: '1px solid #f0f0f0',
                                backgroundColor: selectedBrands.includes(brand.brand_name) ? '#f6ffed' : '#fff',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Checkbox value={brand.brand_name}>
                                  <Space>
                                    <div
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        backgroundColor: getBrandColor(brand.brand_name),
                                        border: '2px solid #fff',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                                      }}
                                    />
                                    <span style={{ fontWeight: 500 }}>{brand.brand_name}</span>
                                  </Space>
                                </Checkbox>
                                <Space size={4}>
                                  <Tag color="blue">{brand.store_count}</Tag>
                                  <Tag color="green">{brand.category}</Tag>
                                </Space>
                              </div>
                            </div>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    </div>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleLoadSelectedBrands}
                      loading={loading}
                      block
                      disabled={selectedBrands.length === 0}
                    >
                      加载选中品牌 ({selectedBrands.length})
                    </Button>
                  </>
                )}
              </Spin>
            </Card>

            {/* 其他POI选择 */}
            <Card 
              size="small"
              title={
                <Space>
                  <span>📍 其他POI选择</span>
                  <Badge count={selectedOtherPOIs.length} style={{ backgroundColor: '#faad14' }} />
                </Space>
              }
              extra={
                <Space>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setSelectedOtherPOIs(otherPOIs.map(p => p.poi_type))}
                  >
                    全选
                  </Button>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setSelectedOtherPOIs([])}
                  >
                    清空
                  </Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              {otherPOIs.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无数据，请先更新其他POI"
                  style={{ margin: '20px 0' }}
                />
              ) : (
                <>
                  <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                    <Checkbox.Group
                      value={selectedOtherPOIs}
                      onChange={(values) => setSelectedOtherPOIs(values as string[])}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {otherPOIs.map((poi) => (
                          <div
                            key={poi.poi_type}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 4,
                              border: '1px solid #f0f0f0',
                              backgroundColor: selectedOtherPOIs.includes(poi.poi_type) ? '#fffbe6' : '#fff',
                              transition: 'all 0.3s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Checkbox value={poi.poi_type}>
                                <Space>
                                  <span style={{ fontSize: 18 }}>{poi.icon}</span>
                                  <span style={{ fontWeight: 500 }}>{poi.poi_type}</span>
                                </Space>
                              </Checkbox>
                              <Tag color={poi.color}>{poi.store_count}</Tag>
                            </div>
                          </div>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <Button
                    type="default"
                    icon={<SearchOutlined />}
                    onClick={handleLoadSelectedOtherPOIs}
                    loading={loading}
                    block
                    disabled={selectedOtherPOIs.length === 0}
                  >
                    加载选中POI ({selectedOtherPOIs.length})
                  </Button>
                </>
              )}
            </Card>

            {/* 已加载品牌控制 */}
            {Object.keys(storesByBrand).length > 0 && (
              <Card size="small" title="🎨 品牌显示控制" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {Object.keys(storesByBrand).map(brandName => (
                    <div
                      key={brandName}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 4,
                        border: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: brandVisibility[brandName] ? '#fff' : '#f5f5f5'
                      }}
                    >
                      <Space>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: getBrandColor(brandName),
                            border: '2px solid #fff',
                            boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{brandName}</span>
                        <Tag>{storesByBrand[brandName].length}</Tag>
                      </Space>
                      <Button
                        type="text"
                        size="small"
                        icon={brandVisibility[brandName] ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        onClick={() => toggleBrandVisibility(brandName)}
                      >
                        {brandVisibility[brandName] ? '显示' : '隐藏'}
                      </Button>
                    </div>
                  ))}
                </Space>
              </Card>
            )}

            {/* 已加载其他POI控制 */}
            {Object.keys(otherPOIStores).length > 0 && (
              <Card size="small" title="🗺️ 其他POI显示控制" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {Object.keys(otherPOIStores).map(poiType => {
                    const typeConfig = poiTypes.find(t => t.type === poiType);
                    return (
                      <div
                        key={poiType}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 4,
                          border: '1px solid #f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: otherPOIVisibility[poiType] ? '#fff' : '#f5f5f5'
                        }}
                      >
                        <Space>
                          <span style={{ fontSize: 18 }}>{typeConfig?.icon || '📍'}</span>
                          <span style={{ fontWeight: 500 }}>{poiType}</span>
                          <Tag>{otherPOIStores[poiType].length}</Tag>
                        </Space>
                        <Button
                          type="text"
                          size="small"
                          icon={otherPOIVisibility[poiType] ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => toggleOtherPOIVisibility(poiType)}
                        >
                          {otherPOIVisibility[poiType] ? '显示' : '隐藏'}
                        </Button>
                      </div>
                    );
                  })}
                </Space>
              </Card>
            )}

            {/* 统计信息 */}
            {(stores.length > 0 || Object.keys(otherPOIStores).length > 0) && (
              <Card size="small" title="📊 统计信息">
                <Row gutter={8}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                        {Object.keys(storesByBrand).length}
                      </div>
                      <div style={{ color: '#666', fontSize: 11 }}>品牌数</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                        {stores.length}
                      </div>
                      <div style={{ color: '#666', fontSize: 11 }}>门店数</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fa8c16' }}>
                        {Object.keys(otherPOIStores).length}
                      </div>
                      <div style={{ color: '#666', fontSize: 11 }}>POI类型</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#722ed1' }}>
                        {Object.values(otherPOIStores).reduce((sum, arr) => sum + arr.length, 0)}
                      </div>
                      <div style={{ color: '#666', fontSize: 11 }}>POI总数</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
          </div>

          {/* 右侧地图 */}
          <div className="map-panel" ref={mapContainerRef} style={{ position: 'relative' }}>
            {/* 全屏按钮 */}
            <Button
              type="default"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
              title={isFullscreen ? '退出全屏' : '全屏显示'}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>

            {/* 绘图工具面板 */}
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 1000,
              backgroundColor: '#fff',
              padding: '12px',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              minWidth: 200
            }}>
              <div style={{ 
                marginBottom: 12, 
                fontWeight: 600, 
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Space>
                  <DragOutlined style={{ color: '#1890ff' }} />
                  <span>绘图工具</span>
                </Space>
                {drawingMode && (
                  <Tag color="processing">{drawingMode === 'ranging' ? '测距中' : '绘制中'}</Tag>
                )}
              </div>
              
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {/* 测距工具 */}
                <Button
                  type={drawingMode === 'ranging' ? 'primary' : 'default'}
                  icon={<ColumnWidthOutlined />}
                  onClick={startRanging}
                  block
                  size="small"
                >
                  测距
                </Button>
                
                <Divider style={{ margin: '4px 0' }}>绘制形状</Divider>
                
                {/* 绘图工具按钮 */}
                <Space style={{ width: '100%' }} size={4}>
                  <Tooltip title="绘制标记">
                    <Button
                      type={drawingMode === 'marker' ? 'primary' : 'default'}
                      icon={<EnvironmentFilled />}
                      onClick={drawMarker}
                      size="small"
                    />
                  </Tooltip>
                  
                  <Tooltip title="绘制折线">
                    <Button
                      type={drawingMode === 'polyline' ? 'primary' : 'default'}
                      icon={<LineOutlined />}
                      onClick={drawPolyline}
                      size="small"
                    />
                  </Tooltip>
                  
                  <Tooltip title="绘制多边形">
                    <Button
                      type={drawingMode === 'polygon' ? 'primary' : 'default'}
                      icon={<BorderOutlined />}
                      onClick={drawPolygon}
                      size="small"
                    />
                  </Tooltip>
                  
                  <Tooltip title="绘制圆形">
                    <Button
                      type={drawingMode === 'circle' ? 'primary' : 'default'}
                      icon={<RadiusSettingOutlined />}
                      onClick={drawCircle}
                      size="small"
                    />
                  </Tooltip>
                </Space>
                
                <Button
                  type={drawingMode === 'rectangle' ? 'primary' : 'default'}
                  icon={<BorderOutlined style={{ transform: 'rotate(45deg)' }} />}
                  onClick={drawRectangle}
                  block
                  size="small"
                >
                  矩形
                </Button>
                
                <Divider style={{ margin: '4px 0' }}>操作</Divider>
                
                {/* 操作按钮 */}
                <Space style={{ width: '100%' }} size={4}>
                  <Button
                    type="default"
                    onClick={closeDrawing}
                    block
                    size="small"
                    disabled={!drawingMode}
                  >
                    关闭工具
                  </Button>
                  
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={clearDrawings}
                    block
                    size="small"
                    disabled={drawOverlaysRef.current.length === 0}
                  >
                    清除 ({drawOverlaysRef.current.length})
                  </Button>
                </Space>
              </Space>
            </div>

            <div ref={mapRef} style={{ width: '100%', height: '100%' }}>
              {!mapLoaded && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%' 
                }}>
                  <Spin tip="加载地图中..." />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SiteSelectionV2;

