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
    role = db.Column(db.Text, nullable=False)
    shop_id = db.Column(db.Integer, nullable=True)  # 保留字段但移除外键约束
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        """设置密码"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """验证密码"""
        return check_password_hash(self.password_hash, password)
    
    @property
    def roles_list(self):
        """将逗号分隔的 role 字符串解析为列表"""
        if not self.role:
            return []
        return [r.strip() for r in self.role.split(',') if r.strip()]

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'username': self.username,
            'real_name': self.real_name,
            'roles': self.roles_list,
            'shop_id': self.shop_id,
            'shop_name': None,
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
    item_links = db.relationship('SubjectItemLink', backref='subject', lazy='select', cascade='all, delete-orphan')

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
            'linked_category_ids': [lk.category_id for lk in self.item_links],
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
    entry_items = db.relationship('VoucherEntryItem', backref='entry', lazy='select', cascade='all, delete-orphan')

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
            'items': [ei.to_dict() for ei in self.entry_items],
        }


# ==================== 核算项目 + 期初余额 ====================

class AccountItemCategory(db.Model):
    """核算项目类别（用户自定义，如"门店""部门""品牌"）"""
    __tablename__ = 'account_item_categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('account_books.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False, comment='类别名称')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('AccountItem', backref='category', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_items=False):
        d = {
            'id': self.id,
            'book_id': self.book_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            d['items'] = [i.to_dict() for i in self.items.order_by(AccountItem.code)]
        return d


class AccountItem(db.Model):
    """核算项目（类别下的具体项，如门店类别下的"朝阳店"）"""
    __tablename__ = 'account_items'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category_id = db.Column(db.Integer, db.ForeignKey('account_item_categories.id'), nullable=False, index=True)
    code = db.Column(db.String(50), nullable=False, comment='项目编码')
    name = db.Column(db.String(200), nullable=False, comment='项目名称')
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'code': self.code,
            'name': self.name,
            'is_enabled': self.is_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SubjectItemLink(db.Model):
    """科目与核算项目类别的关联"""
    __tablename__ = 'subject_item_links'
    __table_args__ = (
        db.UniqueConstraint('subject_id', 'category_id', name='uq_subject_category'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('account_subjects.id'), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('account_item_categories.id'), nullable=False, index=True)

    category = db.relationship('AccountItemCategory', lazy='select')


class VoucherEntryItem(db.Model):
    """凭证分录关联的核算项目"""
    __tablename__ = 'voucher_entry_items'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    entry_id = db.Column(db.Integer, db.ForeignKey('voucher_entries.id'), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('account_item_categories.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('account_items.id'), nullable=False)

    category = db.relationship('AccountItemCategory', lazy='select')
    item = db.relationship('AccountItem', lazy='select')

    def to_dict(self):
        return {
            'id': self.id,
            'entry_id': self.entry_id,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'item_id': self.item_id,
            'item_code': self.item.code if self.item else None,
            'item_name': self.item.name if self.item else None,
        }


class SubjectInitialBalance(db.Model):
    """科目期初余额（迁移初始化用）"""
    __tablename__ = 'subject_initial_balances'
    __table_args__ = (
        db.UniqueConstraint('book_id', 'subject_id', 'item_id', name='uq_initial_balance'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('account_books.id'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('account_subjects.id'), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey('account_items.id'), nullable=True, comment='核算项目ID，NULL表示科目总额')
    debit_amount = db.Column(db.Numeric(16, 2), nullable=False, default=0)
    credit_amount = db.Column(db.Numeric(16, 2), nullable=False, default=0)

    subject = db.relationship('AccountSubject', lazy='select')
    item = db.relationship('AccountItem', lazy='select')

    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'subject_id': self.subject_id,
            'subject_code': self.subject.code if self.subject else None,
            'subject_name': self.subject.name if self.subject else None,
            'item_id': self.item_id,
            'item_name': self.item.name if self.item else None,
            'debit_amount': float(self.debit_amount) if self.debit_amount else 0,
            'credit_amount': float(self.credit_amount) if self.credit_amount else 0,
        }


# ==================== AI Chat ====================

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
    msg_type = db.Column(db.String(20), nullable=False, default='text', comment='消息类型: text/tool_call/tool_result')
    meta_data = db.Column(db.Text, nullable=True, comment='JSON元数据(工具名/代码/输出/成功)')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')

    def to_dict(self):
        result = {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'msg_type': self.msg_type or 'text',
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if self.meta_data:
            try:
                import json
                meta = json.loads(self.meta_data)
                result['metadata'] = meta
            except (json.JSONDecodeError, TypeError):
                pass
        return result


# ==================== 模型压力测试 ====================

class StoreModelTemplate(db.Model):
    """单店模型模板（JSON 配置存储）"""
    __tablename__ = 'store_model_templates'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True, comment='创建人')
    name = db.Column(db.String(100), nullable=False, comment='模板名称')
    config = db.Column(db.Text, nullable=False, comment='模型参数 JSON')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    def to_dict(self):
        import json
        cfg = {}
        try:
            cfg = json.loads(self.config) if self.config else {}
        except Exception:
            pass
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'config': cfg,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class CompanyModelTemplate(db.Model):
    """公司模型模板（JSON 配置存储）"""
    __tablename__ = 'company_model_templates'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True, comment='创建人')
    name = db.Column(db.String(100), nullable=False, comment='模板名称')
    config = db.Column(db.Text, nullable=False, comment='模型参数 JSON')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    def to_dict(self):
        import json
        cfg = {}
        try:
            cfg = json.loads(self.config) if self.config else {}
        except Exception:
            pass
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'config': cfg,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# ═══════════════════════ 供应链订货系统 ═══════════════════════

class ProductCategory(db.Model):
    """货品分类"""
    __tablename__ = 'sc_product_categories'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, comment='分类名称')
    parent_id = db.Column(db.Integer, db.ForeignKey('sc_product_categories.id'), nullable=True, comment='父分类ID')
    sort_order = db.Column(db.Integer, default=0, comment='排序')
    is_active = db.Column(db.Boolean, default=True, comment='是否启用')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    children = db.relationship('ProductCategory', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'parent_id': self.parent_id,
            'sort_order': self.sort_order, 'is_active': self.is_active,
        }

    def to_tree(self):
        d = self.to_dict()
        d['children'] = [c.to_tree() for c in self.children.filter_by(is_active=True).order_by(ProductCategory.sort_order)]
        return d


class Product(db.Model):
    """货品"""
    __tablename__ = 'sc_products'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category_id = db.Column(db.Integer, db.ForeignKey('sc_product_categories.id'), nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False, comment='货品名称')
    unit = db.Column(db.String(20), nullable=False, default='个', comment='单位')
    default_price = db.Column(db.Numeric(10, 2), nullable=False, default=0, comment='默认价格')
    image_url = db.Column(db.String(500), nullable=True, comment='图片URL')
    description = db.Column(db.Text, nullable=True, comment='描述')
    is_active = db.Column(db.Boolean, default=True, comment='是否上架')
    sort_order = db.Column(db.Integer, default=0, comment='排序')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship('ProductCategory', backref='products')
    specs = db.relationship('ProductSpec', backref='product', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_specs=False):
        d = {
            'id': self.id, 'category_id': self.category_id, 'name': self.name,
            'unit': self.unit, 'default_price': float(self.default_price),
            'image_url': self.image_url, 'description': self.description,
            'is_active': self.is_active, 'sort_order': self.sort_order,
            'category_name': self.category.name if self.category else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_specs:
            d['specs'] = [s.to_dict() for s in self.specs]
        return d


class ProductSpec(db.Model):
    """货品规格"""
    __tablename__ = 'sc_product_specs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(db.Integer, db.ForeignKey('sc_products.id'), nullable=False, index=True)
    spec_name = db.Column(db.String(50), nullable=False, comment='规格名称，如尺寸')
    spec_value = db.Column(db.String(100), nullable=False, comment='规格值，如6寸')
    price_override = db.Column(db.Numeric(10, 2), nullable=True, comment='覆盖价格')

    def to_dict(self):
        return {
            'id': self.id, 'product_id': self.product_id,
            'spec_name': self.spec_name, 'spec_value': self.spec_value,
            'price_override': float(self.price_override) if self.price_override else None,
        }


class Warehouse(db.Model):
    """仓库"""
    __tablename__ = 'sc_warehouses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, comment='仓库名称')
    address = db.Column(db.String(300), nullable=True, comment='地址')
    contact_name = db.Column(db.String(50), nullable=True, comment='联系人')
    contact_phone = db.Column(db.String(20), nullable=True, comment='联系电话')
    admin_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, comment='仓库管理员用户ID')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin_user = db.relationship('User', foreign_keys=[admin_user_id])

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'address': self.address,
            'contact_name': self.contact_name, 'contact_phone': self.contact_phone,
            'admin_user_id': self.admin_user_id,
            'admin_user_name': self.admin_user.real_name if self.admin_user else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SCStore(db.Model):
    """供应链门店"""
    __tablename__ = 'sc_stores'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, comment='门店名称')
    address = db.Column(db.String(300), nullable=True, comment='地址')
    contact_name = db.Column(db.String(50), nullable=True, comment='联系人')
    contact_phone = db.Column(db.String(20), nullable=True, comment='联系电话')
    warehouse_id = db.Column(db.Integer, db.ForeignKey('sc_warehouses.id'), nullable=True, comment='绑定仓库')
    manager_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, comment='店长用户ID')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    warehouse = db.relationship('Warehouse', backref='stores')
    manager_user = db.relationship('User', foreign_keys=[manager_user_id])

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'address': self.address,
            'contact_name': self.contact_name, 'contact_phone': self.contact_phone,
            'warehouse_id': self.warehouse_id,
            'warehouse_name': self.warehouse.name if self.warehouse else None,
            'manager_user_id': self.manager_user_id,
            'manager_user_name': self.manager_user.real_name if self.manager_user else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Inventory(db.Model):
    """库存"""
    __tablename__ = 'sc_inventory'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('sc_warehouses.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('sc_products.id'), nullable=False, index=True)
    product_spec_id = db.Column(db.Integer, db.ForeignKey('sc_product_specs.id'), nullable=True)
    quantity = db.Column(db.Numeric(12, 2), default=0, comment='当前数量')
    safety_stock = db.Column(db.Numeric(12, 2), default=0, comment='安全库存')

    warehouse = db.relationship('Warehouse')
    product = db.relationship('Product')
    spec = db.relationship('ProductSpec')

    __table_args__ = (
        db.UniqueConstraint('warehouse_id', 'product_id', 'product_spec_id', name='uix_inventory'),
    )

    def to_dict(self):
        return {
            'id': self.id, 'warehouse_id': self.warehouse_id, 'product_id': self.product_id,
            'product_spec_id': self.product_spec_id,
            'quantity': float(self.quantity), 'safety_stock': float(self.safety_stock),
            'product_name': self.product.name if self.product else None,
            'spec_info': f"{self.spec.spec_name}:{self.spec.spec_value}" if self.spec else None,
            'warehouse_name': self.warehouse.name if self.warehouse else None,
            'is_low': float(self.quantity) <= float(self.safety_stock),
        }


class InventoryLog(db.Model):
    """库存变动日志"""
    __tablename__ = 'sc_inventory_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('sc_warehouses.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('sc_products.id'), nullable=False)
    product_spec_id = db.Column(db.Integer, db.ForeignKey('sc_product_specs.id'), nullable=True)
    change_qty = db.Column(db.Numeric(12, 2), nullable=False, comment='变动数量(正入负出)')
    after_qty = db.Column(db.Numeric(12, 2), nullable=False, comment='变动后数量')
    log_type = db.Column(db.String(20), nullable=False, comment='类型: in/out/adjust/order_out')
    reason = db.Column(db.String(300), nullable=True, comment='原因')
    order_id = db.Column(db.Integer, nullable=True, comment='关联订单ID')
    operator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    operator = db.relationship('User')
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'warehouse_id': self.warehouse_id,
            'product_id': self.product_id, 'product_spec_id': self.product_spec_id,
            'change_qty': float(self.change_qty), 'after_qty': float(self.after_qty),
            'log_type': self.log_type, 'reason': self.reason, 'order_id': self.order_id,
            'operator_name': self.operator.real_name if self.operator else None,
            'product_name': self.product.name if self.product else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SCOrder(db.Model):
    """供应链订单"""
    __tablename__ = 'sc_orders'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_no = db.Column(db.String(30), unique=True, nullable=False, index=True, comment='订单号')
    store_id = db.Column(db.Integer, db.ForeignKey('sc_stores.id'), nullable=False, index=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('sc_warehouses.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending', comment='pending/approved/rejected/shipping/shipped/completed')
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    remark = db.Column(db.Text, nullable=True, comment='备注')
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reject_reason = db.Column(db.String(500), nullable=True)
    shipped_at = db.Column(db.DateTime, nullable=True)
    shipper_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    tracking_no = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = db.relationship('SCStore', backref='orders')
    warehouse = db.relationship('Warehouse')
    creator = db.relationship('User', foreign_keys=[creator_id])
    reviewer = db.relationship('User', foreign_keys=[reviewer_id])
    shipper = db.relationship('User', foreign_keys=[shipper_id])
    items = db.relationship('SCOrderItem', backref='order', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_items=False):
        d = {
            'id': self.id, 'order_no': self.order_no,
            'store_id': self.store_id, 'store_name': self.store.name if self.store else None,
            'warehouse_id': self.warehouse_id, 'warehouse_name': self.warehouse.name if self.warehouse else None,
            'status': self.status, 'total_amount': float(self.total_amount),
            'remark': self.remark,
            'creator_id': self.creator_id, 'creator_name': self.creator.real_name if self.creator else None,
            'reviewer_id': self.reviewer_id, 'reviewer_name': self.reviewer.real_name if self.reviewer else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reject_reason': self.reject_reason,
            'shipped_at': self.shipped_at.isoformat() if self.shipped_at else None,
            'shipper_name': self.shipper.real_name if self.shipper else None,
            'tracking_no': self.tracking_no,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'item_count': self.items.count(),
        }
        if include_items:
            d['items'] = [i.to_dict() for i in self.items]
        return d


class SCOrderItem(db.Model):
    """订单明细"""
    __tablename__ = 'sc_order_items'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('sc_orders.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('sc_products.id'), nullable=False)
    product_spec_id = db.Column(db.Integer, db.ForeignKey('sc_product_specs.id'), nullable=True)
    product_name = db.Column(db.String(200), nullable=False, comment='下单时商品名称快照')
    spec_info = db.Column(db.String(200), nullable=True, comment='规格信息快照')
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'order_id': self.order_id,
            'product_id': self.product_id, 'product_spec_id': self.product_spec_id,
            'product_name': self.product_name, 'spec_info': self.spec_info,
            'unit_price': float(self.unit_price), 'quantity': float(self.quantity),
            'subtotal': float(self.subtotal),
        }
