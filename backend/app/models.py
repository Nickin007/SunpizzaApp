from datetime import datetime, date
from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from decimal import Decimal


class User(db.Model):
    """用户表"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    real_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum('admin', 'delivery_operation', 'SupplyChain_operation', 'Accouting_operation', 'DouyinANDOffline_operation', name='user_role'), nullable=False)
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


# ==================== 财务核算模块 ====================

class AccountBook(db.Model):
    """账套（多公司/多套账）"""
    __tablename__ = 'account_books'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, comment='账套名称')
    start_date = db.Column(db.Date, nullable=False, comment='启用日期（会计期间起始月）')
    currency = db.Column(db.String(10), nullable=False, default='CNY', comment='本位币')
    last_closed_period = db.Column(db.String(7), nullable=True, comment='最后结账期间 YYYY-MM')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')

    subjects = db.relationship('AccountSubject', backref='book', lazy='dynamic', cascade='all, delete-orphan')
    vouchers = db.relationship('Voucher', backref='book', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'currency': self.currency,
            'last_closed_period': self.last_closed_period,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AccountSubject(db.Model):
    """会计科目"""
    __tablename__ = 'account_subjects'
    __table_args__ = (
        db.UniqueConstraint('book_id', 'code', name='uq_book_subject_code'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('account_books.id'), nullable=False, index=True, comment='账套ID')
    code = db.Column(db.String(20), nullable=False, comment='科目编码 4/6/8位')
    name = db.Column(db.String(100), nullable=False, comment='科目名称')
    type = db.Column(db.Enum('asset', 'liability', 'equity', 'income', 'expense', name='subject_type'), nullable=False, comment='科目类型')
    balance_direction = db.Column(db.Enum('debit', 'credit', name='balance_dir'), nullable=False, comment='余额方向')
    parent_id = db.Column(db.Integer, db.ForeignKey('account_subjects.id'), nullable=True, comment='上级科目ID')
    level = db.Column(db.Integer, nullable=False, default=1, comment='科目级次')
    is_enabled = db.Column(db.Boolean, nullable=False, default=True, comment='是否启用')
    is_cash = db.Column(db.Boolean, nullable=False, default=False, comment='是否现金类科目（用于现金流量表）')

    children = db.relationship('AccountSubject', backref=db.backref('parent', remote_side='AccountSubject.id'), lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'code': self.code,
            'name': self.name,
            'full_name': f'{self.code} {self.name}',
            'type': self.type,
            'balance_direction': self.balance_direction,
            'parent_id': self.parent_id,
            'level': self.level,
            'is_enabled': self.is_enabled,
            'is_cash': self.is_cash,
        }


class Voucher(db.Model):
    """记账凭证主表"""
    __tablename__ = 'vouchers'
    __table_args__ = (
        db.UniqueConstraint('book_id', 'voucher_word', 'voucher_no', 'period', name='uq_voucher_identity'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('account_books.id'), nullable=False, index=True, comment='账套ID')
    voucher_word = db.Column(db.String(10), nullable=False, default='记', comment='凭证字')
    voucher_no = db.Column(db.Integer, nullable=False, comment='凭证号（期间内自增）')
    period = db.Column(db.String(7), nullable=False, index=True, comment='会计期间 YYYY-MM')
    date = db.Column(db.Date, nullable=False, comment='凭证日期')
    attachment_count = db.Column(db.Integer, nullable=False, default=0, comment='附件张数')
    status = db.Column(db.Enum('draft', 'approved', name='voucher_status'), nullable=False, default='draft', comment='状态')
    created_by = db.Column(db.String(50), nullable=True, comment='制单人')
    approved_by = db.Column(db.String(50), nullable=True, comment='审核人')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    approved_at = db.Column(db.DateTime, nullable=True, comment='审核时间')

    entries = db.relationship('VoucherEntry', backref='voucher', lazy='select', cascade='all, delete-orphan',
                              order_by='VoucherEntry.line_no')

    def to_dict(self, include_entries=False):
        d = {
            'id': self.id,
            'book_id': self.book_id,
            'voucher_word': self.voucher_word,
            'voucher_no': self.voucher_no,
            'period': self.period,
            'date': self.date.isoformat() if self.date else None,
            'attachment_count': self.attachment_count,
            'status': self.status,
            'created_by': self.created_by,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
        }
        if include_entries:
            d['entries'] = [e.to_dict() for e in self.entries]
            d['debit_total'] = float(sum(e.debit_amount or Decimal('0') for e in self.entries))
            d['credit_total'] = float(sum(e.credit_amount or Decimal('0') for e in self.entries))
        return d


class VoucherEntry(db.Model):
    """凭证分录"""
    __tablename__ = 'voucher_entries'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    voucher_id = db.Column(db.Integer, db.ForeignKey('vouchers.id'), nullable=False, index=True, comment='凭证ID')
    line_no = db.Column(db.Integer, nullable=False, comment='行号')
    summary = db.Column(db.String(200), nullable=True, comment='摘要')
    subject_id = db.Column(db.Integer, db.ForeignKey('account_subjects.id'), nullable=False, comment='科目ID')
    debit_amount = db.Column(db.Numeric(16, 2), nullable=False, default=0, comment='借方金额')
    credit_amount = db.Column(db.Numeric(16, 2), nullable=False, default=0, comment='贷方金额')

    subject = db.relationship('AccountSubject', lazy='select')

    def to_dict(self):
        return {
            'id': self.id,
            'voucher_id': self.voucher_id,
            'line_no': self.line_no,
            'summary': self.summary,
            'subject_id': self.subject_id,
            'subject_code': self.subject.code if self.subject else None,
            'subject_name': self.subject.name if self.subject else None,
            'subject_full_name': f'{self.subject.code} {self.subject.name}' if self.subject else None,
            'debit_amount': float(self.debit_amount) if self.debit_amount else 0,
            'credit_amount': float(self.credit_amount) if self.credit_amount else 0,
        }


# ==================== AI Chat + 记忆系统 ====================

class ChatConversation(db.Model):
    """AI对话会话"""
    __tablename__ = 'chat_conversations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True, comment='用户ID')
    title = db.Column(db.String(200), nullable=False, default='新对话', comment='会话标题')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    messages = db.relationship('ChatMessage', backref='conversation', lazy='dynamic',
                               cascade='all, delete-orphan', order_by='ChatMessage.created_at')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessage(db.Model):
    """AI对话消息"""
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('chat_conversations.id'), nullable=False, index=True)
    role = db.Column(db.Enum('user', 'assistant', 'system', name='msg_role'), nullable=False, comment='消息角色')
    content = db.Column(db.Text, nullable=False, comment='消息内容')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MemoryEntry(db.Model):
    """AI记忆条目（热/温/冷三层）"""
    __tablename__ = 'memory_entries'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True, comment='用户ID')
    tier = db.Column(db.Enum('hot', 'warm', 'cold', name='memory_tier'), nullable=False, index=True, comment='记忆层级')
    category = db.Column(db.String(50), nullable=False, default='fact', comment='分类: preference/fact/summary/archive')
    content = db.Column(db.Text, nullable=False, comment='记忆内容')
    source_conversation_id = db.Column(db.Integer, nullable=True, comment='来源会话ID')
    relevance_score = db.Column(db.Float, nullable=False, default=1.0, comment='相关性评分')
    expires_at = db.Column(db.DateTime, nullable=True, comment='过期时间（温层自动降级）')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'tier': self.tier,
            'category': self.category,
            'content': self.content,
            'source_conversation_id': self.source_conversation_id,
            'relevance_score': self.relevance_score,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
