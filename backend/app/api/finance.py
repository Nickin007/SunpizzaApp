"""
财务核算API模块
账套管理、科目管理、凭证处理、核算项目、期初余额、报表
"""
from flask import Blueprint, request, send_file
from app import db
from app.models import (
    AccountBook, AccountSubject, Voucher, VoucherEntry,
    AccountItemCategory, AccountItem, SubjectItemLink,
    VoucherEntryItem, SubjectInitialBalance,
)
from app.utils.response import success_response, error_response
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from sqlalchemy import func
import io

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
            db.session.flush()
            for it_data in entry.get('items', []):
                if it_data.get('item_id'):
                    db.session.add(VoucherEntryItem(
                        entry_id=ve.id,
                        category_id=it_data['category_id'],
                        item_id=it_data['item_id'],
                    ))

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

            old_entry_ids = [e.id for e in VoucherEntry.query.filter_by(voucher_id=voucher_id)]
            VoucherEntryItem.query.filter(VoucherEntryItem.entry_id.in_(old_entry_ids)).delete(synchronize_session=False)
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
                db.session.flush()
                for it_data in entry.get('items', []):
                    if it_data.get('item_id'):
                        db.session.add(VoucherEntryItem(
                            entry_id=ve.id,
                            category_id=it_data['category_id'],
                            item_id=it_data['item_id'],
                        ))

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


# ==================== 核算项目类别 API ====================

@bp.route('/books/<int:book_id>/item-categories', methods=['GET'])
def list_item_categories(book_id):
    cats = AccountItemCategory.query.filter_by(book_id=book_id).order_by(AccountItemCategory.id).all()
    return success_response([c.to_dict(include_items=True) for c in cats])


@bp.route('/books/<int:book_id>/item-categories', methods=['POST'])
def create_item_category(book_id):
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')
        data = request.get_json()
        name = data.get('name', '').strip()
        if not name:
            return error_response('类别名称不能为空')
        cat = AccountItemCategory(book_id=book_id, name=name)
        db.session.add(cat)
        db.session.commit()
        return success_response(cat.to_dict(include_items=True), message='创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')


@bp.route('/item-categories/<int:cat_id>', methods=['PUT'])
def update_item_category(cat_id):
    try:
        cat = AccountItemCategory.query.get(cat_id)
        if not cat:
            return error_response('类别不存在')
        data = request.get_json()
        if 'name' in data:
            cat.name = data['name'].strip()
        db.session.commit()
        return success_response(cat.to_dict(include_items=True), message='更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


@bp.route('/item-categories/<int:cat_id>', methods=['DELETE'])
def delete_item_category(cat_id):
    try:
        cat = AccountItemCategory.query.get(cat_id)
        if not cat:
            return error_response('类别不存在')
        used = VoucherEntryItem.query.filter_by(category_id=cat_id).count()
        if used > 0:
            return error_response(f'该类别已被 {used} 条分录引用，无法删除')
        db.session.delete(cat)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


# ==================== 核算项目 API ====================

@bp.route('/item-categories/<int:cat_id>/items', methods=['POST'])
def create_item(cat_id):
    try:
        cat = AccountItemCategory.query.get(cat_id)
        if not cat:
            return error_response('类别不存在')
        data = request.get_json()
        code = data.get('code', '').strip()
        name = data.get('name', '').strip()
        if not code or not name:
            return error_response('编码和名称不能为空')
        item = AccountItem(category_id=cat_id, code=code, name=name)
        db.session.add(item)
        db.session.commit()
        return success_response(item.to_dict(), message='创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')


@bp.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    try:
        item = AccountItem.query.get(item_id)
        if not item:
            return error_response('项目不存在')
        data = request.get_json()
        if 'code' in data:
            item.code = data['code'].strip()
        if 'name' in data:
            item.name = data['name'].strip()
        if 'is_enabled' in data:
            item.is_enabled = data['is_enabled']
        db.session.commit()
        return success_response(item.to_dict(), message='更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


@bp.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    try:
        item = AccountItem.query.get(item_id)
        if not item:
            return error_response('项目不存在')
        used = VoucherEntryItem.query.filter_by(item_id=item_id).count()
        if used > 0:
            return error_response(f'该项目已被 {used} 条分录引用，无法删除')
        bal = SubjectInitialBalance.query.filter_by(item_id=item_id).count()
        if bal > 0:
            return error_response('该项目有期初余额记录，请先清除')
        db.session.delete(item)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


# ==================== 科目-核算项目关联 API ====================

@bp.route('/subjects/<int:subject_id>/item-links', methods=['PUT'])
def set_subject_item_links(subject_id):
    try:
        subject = AccountSubject.query.get(subject_id)
        if not subject:
            return error_response('科目不存在')
        data = request.get_json()
        category_ids = data.get('category_ids', [])
        SubjectItemLink.query.filter_by(subject_id=subject_id).delete()
        for cid in category_ids:
            db.session.add(SubjectItemLink(subject_id=subject_id, category_id=cid))
        db.session.commit()
        return success_response(subject.to_dict(), message='关联更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


# ==================== 期初余额 API ====================

@bp.route('/books/<int:book_id>/initial-balances', methods=['GET'])
def get_initial_balances(book_id):
    bals = SubjectInitialBalance.query.filter_by(book_id=book_id).all()
    return success_response([b.to_dict() for b in bals])


@bp.route('/books/<int:book_id>/initial-balances', methods=['PUT'])
def set_initial_balances(book_id):
    try:
        book = AccountBook.query.get(book_id)
        if not book:
            return error_response('账套不存在')
        data = request.get_json()
        items = data.get('balances', [])
        SubjectInitialBalance.query.filter_by(book_id=book_id).delete()
        for it in items:
            sid = it.get('subject_id')
            iid = it.get('item_id') or None
            d = Decimal(str(it.get('debit_amount', 0) or 0))
            c = Decimal(str(it.get('credit_amount', 0) or 0))
            if d == 0 and c == 0:
                continue
            bal = SubjectInitialBalance(
                book_id=book_id, subject_id=sid, item_id=iid,
                debit_amount=d, credit_amount=c,
            )
            db.session.add(bal)
        db.session.commit()
        return success_response(message='期初余额保存成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'保存失败: {str(e)}')


# ==================== 余额计算工具 ====================

def _calc_trial_balance(book_id, period):
    """计算科目余额表，返回 [{subject, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit}]"""
    book = AccountBook.query.get(book_id)
    if not book:
        return []
    subjects = AccountSubject.query.filter_by(book_id=book_id).order_by(AccountSubject.code).all()
    subj_map = {s.id: s for s in subjects}

    init_map = {}
    for ib in SubjectInitialBalance.query.filter_by(book_id=book_id).filter(SubjectInitialBalance.item_id.is_(None)):
        init_map[ib.subject_id] = (float(ib.debit_amount), float(ib.credit_amount))

    pre_rows = db.session.query(
        VoucherEntry.subject_id,
        func.sum(VoucherEntry.debit_amount).label('d'),
        func.sum(VoucherEntry.credit_amount).label('c'),
    ).join(Voucher).filter(
        Voucher.book_id == book_id,
        Voucher.status == 'approved',
        Voucher.period < period,
    ).group_by(VoucherEntry.subject_id).all()
    pre_map = {r.subject_id: (float(r.d or 0), float(r.c or 0)) for r in pre_rows}

    cur_rows = db.session.query(
        VoucherEntry.subject_id,
        func.sum(VoucherEntry.debit_amount).label('d'),
        func.sum(VoucherEntry.credit_amount).label('c'),
    ).join(Voucher).filter(
        Voucher.book_id == book_id,
        Voucher.status == 'approved',
        Voucher.period == period,
    ).group_by(VoucherEntry.subject_id).all()
    cur_map = {r.subject_id: (float(r.d or 0), float(r.c or 0)) for r in cur_rows}

    leaf_data = {}
    for s in subjects:
        init_d, init_c = init_map.get(s.id, (0, 0))
        pre_d, pre_c = pre_map.get(s.id, (0, 0))
        pd, pc = cur_map.get(s.id, (0, 0))
        open_d = init_d + pre_d
        open_c = init_c + pre_c
        leaf_data[s.id] = {
            'open_d': open_d, 'open_c': open_c,
            'pd': pd, 'pc': pc,
        }

    children_map = {}
    for s in subjects:
        children_map.setdefault(s.parent_id, []).append(s.id)

    def _rollup(sid):
        d = leaf_data[sid]
        for cid in children_map.get(sid, []):
            cd = _rollup(cid)
            d['open_d'] += cd['open_d']
            d['open_c'] += cd['open_c']
            d['pd'] += cd['pd']
            d['pc'] += cd['pc']
        return d

    for s in subjects:
        if s.parent_id is None:
            _rollup(s.id)

    result = []
    for s in subjects:
        d = leaf_data[s.id]
        direction = s.balance_direction
        open_bal = d['open_d'] - d['open_c'] if direction == 'debit' else d['open_c'] - d['open_d']
        close_bal = open_bal + d['pd'] - d['pc'] if direction == 'debit' else open_bal + d['pc'] - d['pd']
        result.append({
            'subject_id': s.id,
            'code': s.code,
            'name': s.name,
            'type': s.type,
            'level': s.level,
            'balance_direction': direction,
            'opening_debit': round(d['open_d'], 2),
            'opening_credit': round(d['open_c'], 2),
            'opening_balance': round(open_bal, 2),
            'period_debit': round(d['pd'], 2),
            'period_credit': round(d['pc'], 2),
            'closing_balance': round(close_bal, 2),
            'closing_debit': round(close_bal, 2) if close_bal >= 0 and direction == 'debit' else (0 if direction == 'debit' else round(-close_bal, 2) if close_bal < 0 else 0),
            'closing_credit': round(close_bal, 2) if close_bal >= 0 and direction == 'credit' else (0 if direction == 'credit' else round(-close_bal, 2) if close_bal < 0 else 0),
        })
    return result


# ==================== 科目余额表 API ====================

@bp.route('/books/<int:book_id>/trial-balance', methods=['GET'])
def trial_balance(book_id):
    period = request.args.get('period', '')
    if not period:
        return error_response('请指定会计期间')
    rows = _calc_trial_balance(book_id, period)
    return success_response(rows)


# ==================== 核算项目余额表 API ====================

@bp.route('/books/<int:book_id>/item-balance', methods=['GET'])
def item_balance(book_id):
    period = request.args.get('period', '')
    category_id = request.args.get('category_id', type=int)
    if not period or not category_id:
        return error_response('请指定会计期间和核算类别')

    linked_sids = [lk.subject_id for lk in SubjectItemLink.query.filter_by(category_id=category_id)]
    if not linked_sids:
        return success_response([])

    items = AccountItem.query.filter_by(category_id=category_id, is_enabled=True).order_by(AccountItem.code).all()
    subjects = AccountSubject.query.filter(AccountSubject.id.in_(linked_sids)).order_by(AccountSubject.code).all()

    init_map = {}
    for ib in SubjectInitialBalance.query.filter_by(book_id=book_id).filter(
        SubjectInitialBalance.subject_id.in_(linked_sids),
        SubjectInitialBalance.item_id.isnot(None),
    ):
        init_map[(ib.subject_id, ib.item_id)] = (float(ib.debit_amount), float(ib.credit_amount))

    pre_rows = db.session.query(
        VoucherEntry.subject_id,
        VoucherEntryItem.item_id,
        func.sum(VoucherEntry.debit_amount).label('d'),
        func.sum(VoucherEntry.credit_amount).label('c'),
    ).join(Voucher).join(
        VoucherEntryItem, VoucherEntryItem.entry_id == VoucherEntry.id
    ).filter(
        Voucher.book_id == book_id,
        Voucher.status == 'approved',
        Voucher.period < period,
        VoucherEntryItem.category_id == category_id,
        VoucherEntry.subject_id.in_(linked_sids),
    ).group_by(VoucherEntry.subject_id, VoucherEntryItem.item_id).all()
    pre_map = {(r.subject_id, r.item_id): (float(r.d or 0), float(r.c or 0)) for r in pre_rows}

    cur_rows = db.session.query(
        VoucherEntry.subject_id,
        VoucherEntryItem.item_id,
        func.sum(VoucherEntry.debit_amount).label('d'),
        func.sum(VoucherEntry.credit_amount).label('c'),
    ).join(Voucher).join(
        VoucherEntryItem, VoucherEntryItem.entry_id == VoucherEntry.id
    ).filter(
        Voucher.book_id == book_id,
        Voucher.status == 'approved',
        Voucher.period == period,
        VoucherEntryItem.category_id == category_id,
        VoucherEntry.subject_id.in_(linked_sids),
    ).group_by(VoucherEntry.subject_id, VoucherEntryItem.item_id).all()
    cur_map = {(r.subject_id, r.item_id): (float(r.d or 0), float(r.c or 0)) for r in cur_rows}

    result = []
    for subj in subjects:
        direction = subj.balance_direction
        for item in items:
            key = (subj.id, item.id)
            init_d, init_c = init_map.get(key, (0, 0))
            pre_d, pre_c = pre_map.get(key, (0, 0))
            pd, pc = cur_map.get(key, (0, 0))
            open_d = init_d + pre_d
            open_c = init_c + pre_c
            open_bal = open_d - open_c if direction == 'debit' else open_c - open_d
            close_bal = open_bal + pd - pc if direction == 'debit' else open_bal + pc - pd
            if open_d == 0 and open_c == 0 and pd == 0 and pc == 0:
                continue
            result.append({
                'subject_id': subj.id,
                'subject_code': subj.code,
                'subject_name': subj.name,
                'item_id': item.id,
                'item_code': item.code,
                'item_name': item.name,
                'opening_balance': round(open_bal, 2),
                'period_debit': round(pd, 2),
                'period_credit': round(pc, 2),
                'closing_balance': round(close_bal, 2),
            })
    return success_response(result)


# ==================== 资产负债表 API ====================

@bp.route('/books/<int:book_id>/balance-sheet', methods=['GET'])
def balance_sheet(book_id):
    period = request.args.get('period', '')
    if not period:
        return error_response('请指定会计期间')

    tb = _calc_trial_balance(book_id, period)
    code_bal = {}
    for r in tb:
        if r['level'] == 1:
            code_bal[r['code']] = r['closing_balance']

    def _get(code):
        return code_bal.get(code, 0)

    assets = [
        {'name': '流动资产', 'items': [
            {'name': '货币资金', 'amount': _get('1001') + _get('1002') + _get('1012')},
            {'name': '交易性金融资产', 'amount': _get('1101')},
            {'name': '应收票据', 'amount': _get('1121')},
            {'name': '应收账款', 'amount': _get('1122')},
            {'name': '预付款项', 'amount': _get('1123')},
            {'name': '其他应收款', 'amount': _get('1221')},
            {'name': '存货', 'amount': _get('1401') + _get('1402') + _get('1403') + _get('1405') + _get('1406') + _get('1408') + _get('1411')},
        ]},
        {'name': '非流动资产', 'items': [
            {'name': '长期股权投资', 'amount': _get('1511')},
            {'name': '投资性房地产', 'amount': _get('1521')},
            {'name': '固定资产', 'amount': _get('1601') + _get('1602') + _get('1603')},
            {'name': '在建工程', 'amount': _get('1604')},
            {'name': '无形资产', 'amount': _get('1701') + _get('1702')},
            {'name': '长期待摊费用', 'amount': _get('1801')},
            {'name': '递延所得税资产', 'amount': _get('1811')},
        ]},
    ]
    total_assets = sum(it['amount'] for grp in assets for it in grp['items'])

    liabilities = [
        {'name': '流动负债', 'items': [
            {'name': '短期借款', 'amount': _get('2001')},
            {'name': '应付票据', 'amount': _get('2201')},
            {'name': '应付账款', 'amount': _get('2202')},
            {'name': '预收款项', 'amount': _get('2203')},
            {'name': '应付职工薪酬', 'amount': _get('2211')},
            {'name': '应交税费', 'amount': _get('2221')},
            {'name': '其他应付款', 'amount': _get('2241')},
        ]},
        {'name': '非流动负债', 'items': [
            {'name': '长期借款', 'amount': _get('2501')},
            {'name': '应付债券', 'amount': _get('2502')},
            {'name': '长期应付款', 'amount': _get('2701')},
            {'name': '预计负债', 'amount': _get('2801')},
            {'name': '递延所得税负债', 'amount': _get('2901')},
        ]},
    ]
    total_liabilities = sum(it['amount'] for grp in liabilities for it in grp['items'])

    equity_items = [
        {'name': '实收资本（股本）', 'amount': _get('3001')},
        {'name': '资本公积', 'amount': _get('3002')},
        {'name': '盈余公积', 'amount': _get('3101')},
        {'name': '未分配利润', 'amount': _get('3104') + _get('3105')},
    ]
    total_equity = sum(it['amount'] for it in equity_items)

    return success_response({
        'period': period,
        'assets': assets,
        'total_assets': round(total_assets, 2),
        'liabilities': liabilities,
        'total_liabilities': round(total_liabilities, 2),
        'equity': equity_items,
        'total_equity': round(total_equity, 2),
        'total_liabilities_equity': round(total_liabilities + total_equity, 2),
    })


# ==================== 利润表 API ====================

@bp.route('/books/<int:book_id>/income-statement', methods=['GET'])
def income_statement(book_id):
    period = request.args.get('period', '')
    if not period:
        return error_response('请指定会计期间')

    tb = _calc_trial_balance(book_id, period)
    code_pd = {}
    for r in tb:
        if r['level'] == 1:
            code_pd[r['code']] = r['period_debit'] - r['period_credit'] if r['balance_direction'] == 'debit' else r['period_credit'] - r['period_debit']

    def _get(code):
        return code_pd.get(code, 0)

    revenue = _get('6001')
    other_revenue = _get('6051')
    cost = _get('6401')
    other_cost = _get('6402')
    tax = _get('6403')
    selling_exp = _get('6601')
    admin_exp = _get('6602')
    finance_exp = _get('6603')
    impairment = _get('6701')
    invest_income = _get('6111')
    fv_change = _get('6101')
    non_op_income = _get('6301')
    non_op_exp = _get('6711')
    income_tax = _get('6801')

    gross_profit = revenue - cost
    operating_profit = revenue + other_revenue - cost - other_cost - tax - selling_exp - admin_exp - finance_exp - impairment + invest_income + fv_change
    profit_before_tax = operating_profit + non_op_income - non_op_exp
    net_profit = profit_before_tax - income_tax

    rows = [
        {'name': '一、营业收入', 'amount': round(revenue, 2), 'level': 0},
        {'name': '减：营业成本', 'amount': round(cost, 2), 'level': 1},
        {'name': '营业税金及附加', 'amount': round(tax, 2), 'level': 1},
        {'name': '销售费用', 'amount': round(selling_exp, 2), 'level': 1},
        {'name': '管理费用', 'amount': round(admin_exp, 2), 'level': 1},
        {'name': '财务费用', 'amount': round(finance_exp, 2), 'level': 1},
        {'name': '资产减值损失', 'amount': round(impairment, 2), 'level': 1},
        {'name': '加：公允价值变动收益', 'amount': round(fv_change, 2), 'level': 1},
        {'name': '投资收益', 'amount': round(invest_income, 2), 'level': 1},
        {'name': '其他业务收入', 'amount': round(other_revenue, 2), 'level': 1},
        {'name': '减：其他业务成本', 'amount': round(other_cost, 2), 'level': 1},
        {'name': '二、营业利润', 'amount': round(operating_profit, 2), 'level': 0},
        {'name': '加：营业外收入', 'amount': round(non_op_income, 2), 'level': 1},
        {'name': '减：营业外支出', 'amount': round(non_op_exp, 2), 'level': 1},
        {'name': '三、利润总额', 'amount': round(profit_before_tax, 2), 'level': 0},
        {'name': '减：所得税费用', 'amount': round(income_tax, 2), 'level': 1},
        {'name': '四、净利润', 'amount': round(net_profit, 2), 'level': 0},
    ]
    return success_response({'period': period, 'rows': rows})


# ==================== 现金流量表 API ====================

@bp.route('/books/<int:book_id>/cashflow-statement', methods=['GET'])
def cashflow_statement(book_id):
    period = request.args.get('period', '')
    if not period:
        return error_response('请指定会计期间')

    cash_subjects = AccountSubject.query.filter_by(book_id=book_id, is_cash=True).all()
    cash_sids = [s.id for s in cash_subjects]
    if not cash_sids:
        return success_response({'period': period, 'sections': [], 'net_increase': 0, 'opening_cash': 0, 'closing_cash': 0})

    entries = db.session.query(VoucherEntry).join(Voucher).filter(
        Voucher.book_id == book_id,
        Voucher.status == 'approved',
        Voucher.period == period,
    ).all()

    operating_in = 0
    operating_out = 0
    investing_in = 0
    investing_out = 0
    financing_in = 0
    financing_out = 0

    for e in entries:
        if e.subject_id in cash_sids:
            continue
        paired = [pe for pe in e.voucher.entries if pe.subject_id in cash_sids and pe.id != e.id]
        if not paired:
            continue
        cash_amount = sum(float(pe.debit_amount or 0) - float(pe.credit_amount or 0) for pe in paired)
        subj = e.subject
        if not subj:
            continue
        stype = subj.type
        code = subj.code
        if stype in ('income', 'expense') or code.startswith('22') or code.startswith('21'):
            if cash_amount > 0:
                operating_in += cash_amount
            else:
                operating_out += abs(cash_amount)
        elif code.startswith('15') or code.startswith('16') or code.startswith('17'):
            if cash_amount > 0:
                investing_in += cash_amount
            else:
                investing_out += abs(cash_amount)
        elif code.startswith('20') or code.startswith('25') or code.startswith('30') or code.startswith('31'):
            if cash_amount > 0:
                financing_in += cash_amount
            else:
                financing_out += abs(cash_amount)
        else:
            if cash_amount > 0:
                operating_in += cash_amount
            else:
                operating_out += abs(cash_amount)

    tb = _calc_trial_balance(book_id, period)
    opening_cash = 0
    closing_cash = 0
    for r in tb:
        if r['subject_id'] in cash_sids:
            opening_cash += r['opening_balance']
            closing_cash += r['closing_balance']

    sections = [
        {'name': '一、经营活动产生的现金流量', 'items': [
            {'name': '经营活动现金流入', 'amount': round(operating_in, 2)},
            {'name': '经营活动现金流出', 'amount': round(operating_out, 2)},
            {'name': '经营活动净现金流', 'amount': round(operating_in - operating_out, 2)},
        ]},
        {'name': '二、投资活动产生的现金流量', 'items': [
            {'name': '投资活动现金流入', 'amount': round(investing_in, 2)},
            {'name': '投资活动现金流出', 'amount': round(investing_out, 2)},
            {'name': '投资活动净现金流', 'amount': round(investing_in - investing_out, 2)},
        ]},
        {'name': '三、筹资活动产生的现金流量', 'items': [
            {'name': '筹资活动现金流入', 'amount': round(financing_in, 2)},
            {'name': '筹资活动现金流出', 'amount': round(financing_out, 2)},
            {'name': '筹资活动净现金流', 'amount': round(financing_in - financing_out, 2)},
        ]},
    ]
    net = (operating_in - operating_out) + (investing_in - investing_out) + (financing_in - financing_out)
    return success_response({
        'period': period,
        'sections': sections,
        'net_increase': round(net, 2),
        'opening_cash': round(opening_cash, 2),
        'closing_cash': round(closing_cash, 2),
    })


# ==================== 报表导出 API ====================

@bp.route('/books/<int:book_id>/export-report', methods=['GET'])
def export_report(book_id):
    import pandas as pd
    report_type = request.args.get('type', '')
    period = request.args.get('period', '')
    if not report_type or not period:
        return error_response('请指定报表类型和期间')

    book = AccountBook.query.get(book_id)
    if not book:
        return error_response('账套不存在')

    buf = io.BytesIO()

    if report_type == 'trial_balance':
        rows = _calc_trial_balance(book_id, period)
        df = pd.DataFrame(rows)
        df = df[['code', 'name', 'level', 'opening_balance', 'period_debit', 'period_credit', 'closing_balance']]
        df.columns = ['科目编码', '科目名称', '级次', '期初余额', '本期借方', '本期贷方', '期末余额']
        with pd.ExcelWriter(buf, engine='openpyxl') as w:
            df.to_excel(w, index=False, sheet_name='科目余额表')

    elif report_type == 'balance_sheet':
        from flask import current_app
        with current_app.test_request_context(f'/api/finance/books/{book_id}/balance-sheet?period={period}'):
            resp = balance_sheet(book_id)
            data = resp.get_json()['data'] if hasattr(resp, 'get_json') else {}
        rows_list = []
        for grp in data.get('assets', []):
            rows_list.append({'项目': grp['name'], '金额': ''})
            for it in grp['items']:
                rows_list.append({'项目': '  ' + it['name'], '金额': it['amount']})
        rows_list.append({'项目': '资产合计', '金额': data.get('total_assets', 0)})
        for grp in data.get('liabilities', []):
            rows_list.append({'项目': grp['name'], '金额': ''})
            for it in grp['items']:
                rows_list.append({'项目': '  ' + it['name'], '金额': it['amount']})
        rows_list.append({'项目': '负债合计', '金额': data.get('total_liabilities', 0)})
        for it in data.get('equity', []):
            rows_list.append({'项目': it['name'], '金额': it['amount']})
        rows_list.append({'项目': '所有者权益合计', '金额': data.get('total_equity', 0)})
        rows_list.append({'项目': '负债和所有者权益合计', '金额': data.get('total_liabilities_equity', 0)})
        df = pd.DataFrame(rows_list)
        with pd.ExcelWriter(buf, engine='openpyxl') as w:
            df.to_excel(w, index=False, sheet_name='资产负债表')

    elif report_type == 'income_statement':
        from flask import current_app
        with current_app.test_request_context(f'/api/finance/books/{book_id}/income-statement?period={period}'):
            resp = income_statement(book_id)
            data = resp.get_json()['data'] if hasattr(resp, 'get_json') else {}
        rows_list = [{'项目': r['name'], '金额': r['amount']} for r in data.get('rows', [])]
        df = pd.DataFrame(rows_list)
        with pd.ExcelWriter(buf, engine='openpyxl') as w:
            df.to_excel(w, index=False, sheet_name='利润表')

    else:
        return error_response(f'不支持的报表类型: {report_type}')

    buf.seek(0)
    filename = f'{book.name}_{report_type}_{period}.xlsx'
    return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=filename)
