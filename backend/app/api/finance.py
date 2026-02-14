"""
财务核算API模块
账套管理、科目管理、凭证处理
"""
from flask import Blueprint, request
from app import db
from app.models import AccountBook, AccountSubject, Voucher, VoucherEntry
from app.utils.response import success_response, error_response
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from sqlalchemy import func

bp = Blueprint('finance', __name__, url_prefix='/api/finance')


# ==================== 中国企业会计准则标准一级科目 ====================

STANDARD_SUBJECTS = [
    # 资产类 1xxx
    ('1001', '库存现金',     'asset', 'debit', True),
    ('1002', '银行存款',     'asset', 'debit', True),
    ('1012', '其他货币资金', 'asset', 'debit', False),
    ('1101', '交易性金融资产', 'asset', 'debit', False),
    ('1121', '应收票据',     'asset', 'debit', False),
    ('1122', '应收账款',     'asset', 'debit', False),
    ('1123', '预付账款',     'asset', 'debit', False),
    ('1131', '应收股利',     'asset', 'debit', False),
    ('1132', '应收利息',     'asset', 'debit', False),
    ('1221', '其他应收款',   'asset', 'debit', False),
    ('1231', '坏账准备',     'asset', 'credit', False),
    ('1401', '材料采购',     'asset', 'debit', False),
    ('1402', '在途物资',     'asset', 'debit', False),
    ('1403', '原材料',       'asset', 'debit', False),
    ('1404', '材料成本差异', 'asset', 'debit', False),
    ('1405', '库存商品',     'asset', 'debit', False),
    ('1406', '发出商品',     'asset', 'debit', False),
    ('1407', '商品进销差价', 'asset', 'credit', False),
    ('1408', '委托加工物资', 'asset', 'debit', False),
    ('1411', '周转材料',     'asset', 'debit', False),
    ('1501', '持有至到期投资', 'asset', 'debit', False),
    ('1511', '长期股权投资', 'asset', 'debit', False),
    ('1521', '投资性房地产', 'asset', 'debit', False),
    ('1601', '固定资产',     'asset', 'debit', False),
    ('1602', '累计折旧',     'asset', 'credit', False),
    ('1603', '固定资产减值准备', 'asset', 'credit', False),
    ('1604', '在建工程',     'asset', 'debit', False),
    ('1605', '工程物资',     'asset', 'debit', False),
    ('1606', '固定资产清理', 'asset', 'debit', False),
    ('1701', '无形资产',     'asset', 'debit', False),
    ('1702', '累计摊销',     'asset', 'credit', False),
    ('1801', '长期待摊费用', 'asset', 'debit', False),
    ('1811', '递延所得税资产', 'asset', 'debit', False),
    ('1901', '待处理财产损溢', 'asset', 'debit', False),
    # 负债类 2xxx
    ('2001', '短期借款',     'liability', 'credit', False),
    ('2101', '交易性金融负债', 'liability', 'credit', False),
    ('2201', '应付票据',     'liability', 'credit', False),
    ('2202', '应付账款',     'liability', 'credit', False),
    ('2203', '预收账款',     'liability', 'credit', False),
    ('2211', '应付职工薪酬', 'liability', 'credit', False),
    ('2221', '应交税费',     'liability', 'credit', False),
    ('2231', '应付利息',     'liability', 'credit', False),
    ('2232', '应付股利',     'liability', 'credit', False),
    ('2241', '其他应付款',   'liability', 'credit', False),
    ('2401', '递延收益',     'liability', 'credit', False),
    ('2501', '长期借款',     'liability', 'credit', False),
    ('2502', '应付债券',     'liability', 'credit', False),
    ('2701', '长期应付款',   'liability', 'credit', False),
    ('2801', '预计负债',     'liability', 'credit', False),
    ('2901', '递延所得税负债', 'liability', 'credit', False),
    # 所有者权益类 3xxx
    ('3001', '实收资本',     'equity', 'credit', False),
    ('3002', '资本公积',     'equity', 'credit', False),
    ('3101', '盈余公积',     'equity', 'credit', False),
    ('3104', '本年利润',     'equity', 'credit', False),
    ('3105', '利润分配',     'equity', 'credit', False),
    # 成本类 5xxx
    ('5001', '生产成本',     'expense', 'debit', False),
    ('5101', '制造费用',     'expense', 'debit', False),
    ('5201', '劳务成本',     'expense', 'debit', False),
    ('5301', '研发支出',     'expense', 'debit', False),
    # 损益类—收入 6xxx
    ('6001', '主营业务收入', 'income', 'credit', False),
    ('6051', '其他业务收入', 'income', 'credit', False),
    ('6101', '公允价值变动损益', 'income', 'credit', False),
    ('6111', '投资收益',     'income', 'credit', False),
    ('6301', '营业外收入',   'income', 'credit', False),
    # 损益类—费用 6xxx
    ('6401', '主营业务成本', 'expense', 'debit', False),
    ('6402', '其他业务成本', 'expense', 'debit', False),
    ('6403', '营业税金及附加', 'expense', 'debit', False),
    ('6601', '销售费用',     'expense', 'debit', False),
    ('6602', '管理费用',     'expense', 'debit', False),
    ('6603', '财务费用',     'expense', 'debit', False),
    ('6701', '资产减值损失', 'expense', 'debit', False),
    ('6711', '营业外支出',   'expense', 'debit', False),
    ('6801', '所得税费用',   'expense', 'debit', False),
]


def seed_standard_subjects(book_id):
    """为新账套预置标准一级科目"""
    for code, name, stype, direction, is_cash in STANDARD_SUBJECTS:
        subject = AccountSubject(
            book_id=book_id,
            code=code,
            name=name,
            type=stype,
            balance_direction=direction,
            parent_id=None,
            level=1,
            is_enabled=True,
            is_cash=is_cash,
        )
        db.session.add(subject)


# ==================== 账套管理 API ====================

@bp.route('/books', methods=['GET'])
def list_books():
    """获取所有账套"""
    books = AccountBook.query.order_by(AccountBook.created_at.desc()).all()
    return success_response([b.to_dict() for b in books])


@bp.route('/books', methods=['POST'])
def create_book():
    """创建账套（自动预置标准科目）"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        start_date_str = data.get('start_date', '')
        currency = data.get('currency', 'CNY').strip()

        if not name:
            return error_response('账套名称不能为空')
        if not start_date_str:
            return error_response('启用日期不能为空')

        try:
            start_date = date.fromisoformat(start_date_str)
        except ValueError:
            return error_response('日期格式无效，请使用 YYYY-MM-DD')

        book = AccountBook(name=name, start_date=start_date, currency=currency)
        db.session.add(book)
        db.session.flush()  # 获取 book.id

        # 预置标准科目
        seed_standard_subjects(book.id)
        db.session.commit()

        return success_response(book.to_dict(), message=f'账套「{name}」创建成功，已预置 {len(STANDARD_SUBJECTS)} 个标准科目')
    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return error_response(f'创建账套失败: {str(e)}')


@bp.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """更新账套"""
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')

        data = request.get_json()
        if 'name' in data:
            book.name = data['name'].strip()
        if 'currency' in data:
            book.currency = data['currency'].strip()

        db.session.commit()
        return success_response(book.to_dict(), message='更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


@bp.route('/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """删除账套（仅限无凭证时）"""
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')

        voucher_count = Voucher.query.filter_by(book_id=book_id).count()
        if voucher_count > 0:
            return error_response(f'该账套下有 {voucher_count} 张凭证，无法删除')

        db.session.delete(book)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


# ==================== 科目管理 API ====================

@bp.route('/books/<int:book_id>/subjects', methods=['GET'])
def list_subjects(book_id):
    """获取科目列表（平铺，由前端构建树）"""
    subjects = AccountSubject.query.filter_by(book_id=book_id).order_by(AccountSubject.code).all()
    return success_response([s.to_dict() for s in subjects])


@bp.route('/books/<int:book_id>/subjects', methods=['POST'])
def add_subject(book_id):
    """添加科目（可为下级科目）"""
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')

        data = request.get_json()
        code = data.get('code', '').strip()
        name = data.get('name', '').strip()
        parent_id = data.get('parent_id')
        stype = data.get('type', '')
        direction = data.get('balance_direction', '')
        is_cash = data.get('is_cash', False)

        if not code or not name:
            return error_response('科目编码和名称不能为空')

        # 检查编码唯一性
        existing = AccountSubject.query.filter_by(book_id=book_id, code=code).first()
        if existing:
            return error_response(f'科目编码 {code} 已存在')

        level = 1
        if parent_id:
            parent = AccountSubject.query.get(parent_id)
            if not parent or parent.book_id != book_id:
                return error_response('上级科目不存在')
            # 下级科目继承上级类型和余额方向
            stype = parent.type
            direction = parent.balance_direction
            level = parent.level + 1
            # 验证编码前缀
            if not code.startswith(parent.code):
                return error_response(f'下级科目编码必须以上级编码 {parent.code} 开头')
        else:
            if not stype or not direction:
                return error_response('一级科目必须指定类型和余额方向')

        subject = AccountSubject(
            book_id=book_id, code=code, name=name,
            type=stype, balance_direction=direction,
            parent_id=parent_id, level=level,
            is_enabled=True, is_cash=is_cash,
        )
        db.session.add(subject)
        db.session.commit()
        return success_response(subject.to_dict(), message='添加成功')
    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return error_response(f'添加科目失败: {str(e)}')


@bp.route('/subjects/<int:subject_id>', methods=['PUT'])
def update_subject(subject_id):
    """编辑科目（名称、启用/停用）"""
    try:
        subject = AccountSubject.query.get(subject_id)
        if not subject:
            return error_response('科目不存在')

        data = request.get_json()
        if 'name' in data:
            subject.name = data['name'].strip()
        if 'is_enabled' in data:
            # 停用时检查是否有未审核凭证使用该科目
            if not data['is_enabled']:
                used = VoucherEntry.query.filter_by(subject_id=subject_id).join(Voucher).filter(Voucher.status == 'draft').count()
                if used > 0:
                    return error_response(f'该科目在 {used} 张草稿凭证中使用，无法停用')
            subject.is_enabled = data['is_enabled']
        if 'is_cash' in data:
            subject.is_cash = data['is_cash']

        db.session.commit()
        return success_response(subject.to_dict(), message='更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


@bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    """删除科目（仅叶子且未使用）"""
    try:
        subject = AccountSubject.query.get(subject_id)
        if not subject:
            return error_response('科目不存在')

        # 检查是否有子科目
        child_count = AccountSubject.query.filter_by(parent_id=subject_id).count()
        if child_count > 0:
            return error_response('该科目有下级科目，无法删除')

        # 检查是否被凭证使用
        entry_count = VoucherEntry.query.filter_by(subject_id=subject_id).count()
        if entry_count > 0:
            return error_response(f'该科目已被 {entry_count} 条凭证分录使用，无法删除')

        db.session.delete(subject)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


# ==================== 凭证管理 API ====================

@bp.route('/books/<int:book_id>/vouchers/next-no', methods=['GET'])
def get_next_voucher_no(book_id):
    """获取下一个凭证号"""
    period = request.args.get('period', '')
    voucher_word = request.args.get('voucher_word', '记')

    if not period:
        return error_response('请指定会计期间')

    max_no = db.session.query(func.max(Voucher.voucher_no)).filter_by(
        book_id=book_id, period=period, voucher_word=voucher_word
    ).scalar()

    next_no = (max_no or 0) + 1
    return success_response({'next_no': next_no})


@bp.route('/books/<int:book_id>/vouchers', methods=['POST'])
def create_voucher(book_id):
    """创建凭证（含分录）"""
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')

        data = request.get_json()
        voucher_word = data.get('voucher_word', '记')
        date_str = data.get('date', '')
        period = data.get('period', '')
        attachment_count = data.get('attachment_count', 0)
        created_by = data.get('created_by', '')
        entries_data = data.get('entries', [])

        if not date_str:
            return error_response('凭证日期不能为空')
        if not period:
            return error_response('会计期间不能为空')
        if not entries_data or len(entries_data) < 2:
            return error_response('凭证至少需要两条分录')

        try:
            voucher_date = date.fromisoformat(date_str)
        except ValueError:
            return error_response('日期格式无效')

        # 检查期间是否已结账
        if book.last_closed_period and period <= book.last_closed_period:
            return error_response(f'期间 {period} 已结账，无法新增凭证')

        # 自动分配凭证号
        max_no = db.session.query(func.max(Voucher.voucher_no)).filter_by(
            book_id=book_id, period=period, voucher_word=voucher_word
        ).scalar()
        voucher_no = (max_no or 0) + 1

        # 验证借贷平衡
        total_debit = Decimal('0')
        total_credit = Decimal('0')
        for entry in entries_data:
            try:
                d = Decimal(str(entry.get('debit_amount', 0) or 0))
                c = Decimal(str(entry.get('credit_amount', 0) or 0))
            except (InvalidOperation, ValueError):
                return error_response('金额格式无效')
            total_debit += d
            total_credit += c

        if total_debit != total_credit:
            return error_response(f'借贷不平衡：借方 {total_debit}，贷方 {total_credit}，差额 {total_debit - total_credit}')
        if total_debit == 0:
            return error_response('凭证金额不能全为零')

        # 验证科目
        for i, entry in enumerate(entries_data):
            sid = entry.get('subject_id')
            if not sid:
                return error_response(f'第 {i+1} 行未选择科目')
            subj = AccountSubject.query.get(sid)
            if not subj or subj.book_id != book_id:
                return error_response(f'第 {i+1} 行科目不存在')
            if not subj.is_enabled:
                return error_response(f'第 {i+1} 行科目「{subj.name}」已停用')

        # 创建凭证
        voucher = Voucher(
            book_id=book_id, voucher_word=voucher_word, voucher_no=voucher_no,
            period=period, date=voucher_date, attachment_count=attachment_count,
            status='draft', created_by=created_by,
        )
        db.session.add(voucher)
        db.session.flush()

        # 创建分录
        for i, entry in enumerate(entries_data):
            ve = VoucherEntry(
                voucher_id=voucher.id,
                line_no=i + 1,
                summary=entry.get('summary', ''),
                subject_id=entry['subject_id'],
                debit_amount=Decimal(str(entry.get('debit_amount', 0) or 0)),
                credit_amount=Decimal(str(entry.get('credit_amount', 0) or 0)),
            )
            db.session.add(ve)

        db.session.commit()
        return success_response(voucher.to_dict(include_entries=True), message=f'{voucher_word}-{voucher_no:04d} 保存成功')
    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return error_response(f'创建凭证失败: {str(e)}')


@bp.route('/books/<int:book_id>/vouchers', methods=['GET'])
def list_vouchers(book_id):
    """查询凭证列表"""
    period = request.args.get('period', '')
    status = request.args.get('status', '')
    voucher_word = request.args.get('voucher_word', '')
    keyword = request.args.get('keyword', '')

    query = Voucher.query.filter_by(book_id=book_id)
    if period:
        query = query.filter_by(period=period)
    if status:
        query = query.filter_by(status=status)
    if voucher_word:
        query = query.filter_by(voucher_word=voucher_word)

    vouchers = query.order_by(Voucher.period.desc(), Voucher.voucher_no.desc()).all()

    result = []
    for v in vouchers:
        d = v.to_dict(include_entries=True)
        # 添加首行摘要用于列表展示
        first_entry = v.entries[0] if v.entries else None
        d['first_summary'] = first_entry.summary if first_entry else ''
        # 关键词过滤（在 Python 层，简单实现）
        if keyword:
            match = False
            for entry in v.entries:
                if keyword in (entry.summary or ''):
                    match = True
                    break
                if entry.subject and keyword in entry.subject.name:
                    match = True
                    break
            if not match:
                continue
        result.append(d)

    return success_response(result)


@bp.route('/vouchers/<int:voucher_id>', methods=['GET'])
def get_voucher(voucher_id):
    """获取单张凭证详情"""
    voucher = Voucher.query.get(voucher_id)
    if not voucher:
        return error_response('凭证不存在')
    return success_response(voucher.to_dict(include_entries=True))


@bp.route('/vouchers/<int:voucher_id>', methods=['PUT'])
def update_voucher(voucher_id):
    """编辑凭证（仅草稿状态）"""
    try:
        voucher = Voucher.query.get(voucher_id)
        if not voucher:
            return error_response('凭证不存在')
        if voucher.status != 'draft':
            return error_response('已审核凭证不可修改')

        book = AccountBook.query.get(voucher.book_id)
        if book.last_closed_period and voucher.period <= book.last_closed_period:
            return error_response(f'期间 {voucher.period} 已结账，无法修改凭证')

        data = request.get_json()
        if 'date' in data:
            voucher.date = date.fromisoformat(data['date'])
        if 'attachment_count' in data:
            voucher.attachment_count = data['attachment_count']

        entries_data = data.get('entries')
        if entries_data is not None:
            if len(entries_data) < 2:
                return error_response('凭证至少需要两条分录')

            # 验证借贷平衡
            total_debit = Decimal('0')
            total_credit = Decimal('0')
            for entry in entries_data:
                try:
                    d = Decimal(str(entry.get('debit_amount', 0) or 0))
                    c = Decimal(str(entry.get('credit_amount', 0) or 0))
                except (InvalidOperation, ValueError):
                    return error_response('金额格式无效')
                total_debit += d
                total_credit += c

            if total_debit != total_credit:
                return error_response(f'借贷不平衡：借方 {total_debit}，贷方 {total_credit}')
            if total_debit == 0:
                return error_response('凭证金额不能全为零')

            # 验证科目
            for i, entry in enumerate(entries_data):
                sid = entry.get('subject_id')
                if not sid:
                    return error_response(f'第 {i+1} 行未选择科目')
                subj = AccountSubject.query.get(sid)
                if not subj or subj.book_id != voucher.book_id:
                    return error_response(f'第 {i+1} 行科目不存在')
                if not subj.is_enabled:
                    return error_response(f'第 {i+1} 行科目「{subj.name}」已停用')

            # 删除旧分录，重建
            VoucherEntry.query.filter_by(voucher_id=voucher_id).delete()
            for i, entry in enumerate(entries_data):
                ve = VoucherEntry(
                    voucher_id=voucher_id,
                    line_no=i + 1,
                    summary=entry.get('summary', ''),
                    subject_id=entry['subject_id'],
                    debit_amount=Decimal(str(entry.get('debit_amount', 0) or 0)),
                    credit_amount=Decimal(str(entry.get('credit_amount', 0) or 0)),
                )
                db.session.add(ve)

        db.session.commit()
        # 重新加载
        voucher = Voucher.query.get(voucher_id)
        return success_response(voucher.to_dict(include_entries=True), message='更新成功')
    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return error_response(f'更新凭证失败: {str(e)}')


@bp.route('/vouchers/<int:voucher_id>', methods=['DELETE'])
def delete_voucher(voucher_id):
    """删除凭证（仅草稿状态）"""
    try:
        voucher = Voucher.query.get(voucher_id)
        if not voucher:
            return error_response('凭证不存在')
        if voucher.status != 'draft':
            return error_response('已审核凭证不可删除')

        book = AccountBook.query.get(voucher.book_id)
        if book.last_closed_period and voucher.period <= book.last_closed_period:
            return error_response(f'期间 {voucher.period} 已结账，无法删除凭证')

        db.session.delete(voucher)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


@bp.route('/vouchers/<int:voucher_id>/approve', methods=['POST'])
def approve_voucher(voucher_id):
    """审核凭证"""
    try:
        voucher = Voucher.query.get(voucher_id)
        if not voucher:
            return error_response('凭证不存在')
        if voucher.status == 'approved':
            return error_response('该凭证已审核')

        data = request.get_json() or {}
        approved_by = data.get('approved_by', '')

        voucher.status = 'approved'
        voucher.approved_by = approved_by
        voucher.approved_at = datetime.utcnow()

        db.session.commit()
        return success_response(voucher.to_dict(include_entries=True), message='审核通过')
    except Exception as e:
        db.session.rollback()
        return error_response(f'审核失败: {str(e)}')


@bp.route('/vouchers/<int:voucher_id>/unapprove', methods=['POST'])
def unapprove_voucher(voucher_id):
    """反审核凭证"""
    try:
        voucher = Voucher.query.get(voucher_id)
        if not voucher:
            return error_response('凭证不存在')
        if voucher.status != 'approved':
            return error_response('该凭证未审核，无需反审核')

        book = AccountBook.query.get(voucher.book_id)
        if book.last_closed_period and voucher.period <= book.last_closed_period:
            return error_response(f'期间 {voucher.period} 已结账，无法反审核')

        voucher.status = 'draft'
        voucher.approved_by = None
        voucher.approved_at = None

        db.session.commit()
        return success_response(voucher.to_dict(include_entries=True), message='反审核成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'反审核失败: {str(e)}')
