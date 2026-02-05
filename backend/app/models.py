from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """用户表"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    real_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum('admin', 'regional_manager', 'shop_manager', 'delivery_operation', name='user_role'), nullable=False)
    shop_id = db.Column(db.Integer, nullable=True)  # 保留字段但移除外键约束
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        """设置密码"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """验证密码"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'username': self.username,
            'real_name': self.real_name,
            'role': self.role,
            'shop_id': self.shop_id,
            'shop_name': None,  # 已移除Shop关联
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class POIStore(db.Model):
    """POI门店数据表（选址工具）"""
    __tablename__ = 'poi_stores'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    poi_id = db.Column(db.String(100), unique=True, comment='高德POI ID')
    brand_name = db.Column(db.String(100), index=True, comment='品牌名称')
    store_name = db.Column(db.String(200), nullable=False, comment='门店名称')
    city = db.Column(db.String(50), index=True, comment='城市')
    province = db.Column(db.String(50), comment='省份')
    district = db.Column(db.String(50), comment='区域')
    address = db.Column(db.String(500), comment='详细地址')
    full_address = db.Column(db.Text, comment='完整地址')
    phone = db.Column(db.String(50), comment='电话')
    longitude = db.Column(db.Numeric(10, 6), comment='经度')
    latitude = db.Column(db.Numeric(10, 6), comment='纬度')
    poi_type = db.Column(db.String(100), comment='POI类型')
    category = db.Column(db.String(50), index=True, comment='品牌类别（披萨/汉堡/奶茶等）')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'poi_id': self.poi_id,
            'brand_name': self.brand_name,
            'store_name': self.store_name,
            'city': self.city,
            'province': self.province,
            'district': self.district,
            'address': self.address,
            'full_address': self.full_address,
            'phone': self.phone,
            'longitude': float(self.longitude) if self.longitude else None,
            'latitude': float(self.latitude) if self.latitude else None,
            'poi_type': self.poi_type,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AnalyzableStore(db.Model):
    """可分析门店表（成本分析）"""
    __tablename__ = 'analyzable_stores'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    store_name = db.Column(db.String(200), unique=True, nullable=False, comment='门店名称')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'store_name': self.store_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ProductRecipeCard(db.Model):
    """单品原料卡表（成本分析）"""
    __tablename__ = 'product_recipe_cards'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_name = db.Column(db.String(200), nullable=False, index=True, comment='单品名称')
    ingredient_name = db.Column(db.String(100), nullable=False, comment='原料名称')
    ingredient_unit = db.Column(db.String(50), nullable=False, comment='原料计量单位')
    quantity = db.Column(db.Numeric(10, 4), nullable=False, comment='用量')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'product_name': self.product_name,
            'ingredient_name': self.ingredient_name,
            'ingredient_unit': self.ingredient_unit,
            'quantity': float(self.quantity) if self.quantity else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IngredientCost(db.Model):
    """原料成本表（成本分析）"""
    __tablename__ = 'ingredient_costs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ingredient_name = db.Column(db.String(100), unique=True, nullable=False, comment='原料名称')
    unit = db.Column(db.String(50), nullable=False, comment='计量单位')
    unit_cost = db.Column(db.Numeric(10, 4), nullable=False, comment='单位成本')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'ingredient_name': self.ingredient_name,
            'unit': self.unit,
            'unit_cost': float(self.unit_cost) if self.unit_cost else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ProductNameMapping(db.Model):
    """源商品名称映射表（成本分析）
    用于将解析出的各种单品名称变体统一映射到标准的源商品名称
    """
    __tablename__ = 'product_name_mappings'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parsed_name = db.Column(db.String(200), unique=True, nullable=False, index=True, comment='解析出的单品名称')
    source_name = db.Column(db.String(200), nullable=False, index=True, comment='源商品名称（标准名称）')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'parsed_name': self.parsed_name,
            'source_name': self.source_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
