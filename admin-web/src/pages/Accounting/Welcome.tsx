import React from 'react';
import { Card, Typography, Row, Col, Divider, Tag, Space, Alert, Collapse } from 'antd';
import {
  BookOutlined,
  DatabaseOutlined,
  FormOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  AuditOutlined,
  SettingOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  NumberOutlined,
  BankOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';

const { Title, Paragraph, Text } = Typography;

const AccountingWelcome: React.FC = () => {
  const { user } = useAuthStore();
  const { currentBookId, currentBookName } = useFinanceStore();

  // ========== 各分类面板内容 ==========

  const panelSystemOverview = (
    <div>
      <Paragraph>本财务核算模块为面向专业财务人员的记账工具，核心功能包括：</Paragraph>
      <ul>
        <li><Text strong>多账套管理</Text>：支持同时管理多套账（多公司），每套账独立数据。</li>
        <li><Text strong>会计科目管理</Text>：预置中国企业会计准则标准一级科目，支持多级科目扩展。</li>
        <li><Text strong>凭证录入</Text>：标准借贷两栏式凭证，实时校验借贷平衡。</li>
        <li><Text strong>凭证审核</Text>：草稿凭证需审核后生效，支持反审核。</li>
        <li><Text strong>成本分析</Text>：外卖订单成本拆解与分析。</li>
      </ul>
      <Divider dashed />
      <Title level={5}>核心理念</Title>
      <Row gutter={[12, 12]}>
        {[
          { icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fa8c16' }} />, title: '复式记账', desc: '严格遵循借贷平衡', bg: '#fff7e6', border: '#ffd591' },
          { icon: <AuditOutlined style={{ fontSize: 24, color: '#52c41a' }} />, title: '审核制度', desc: '凭证审核后锁定', bg: '#f6ffed', border: '#b7eb8f' },
          { icon: <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />, title: '标准科目', desc: '企业会计准则预置', bg: '#e6f7ff', border: '#91d5ff' },
          { icon: <BookOutlined style={{ fontSize: 24, color: '#722ed1' }} />, title: '多套账', desc: '多公司独立核算', bg: '#f9f0ff', border: '#d3adf7' },
        ].map((c, i) => (
          <Col span={6} key={i}>
            <Card size="small" style={{ textAlign: 'center', background: c.bg, border: `1px solid ${c.border}` }}>
              {c.icon}
              <div><Text strong>{c.title}</Text></div>
              <Text type="secondary" style={{ fontSize: 12 }}>{c.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const panelQuickStart = (
    <div>
      <Paragraph>首次使用时请按照以下流程操作：</Paragraph>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        {[
          { step: 1, label: '创建账套', desc: '进入「账套管理」，输入账套名称、启用日期', color: '#fa8c16' },
          { step: 2, label: '确认科目', desc: '系统自动预置约70个标准一级科目，可按需增删', color: '#1890ff' },
          { step: 3, label: '录入凭证', desc: '进入「凭证录入」，填写分录，确保借贷平衡后保存', color: '#52c41a' },
          { step: 4, label: '审核凭证', desc: '进入「凭证查询」，对草稿凭证点击审核', color: '#722ed1' },
        ].map((s) => (
          <Card key={s.step} size="small" style={{ flex: '1 1 200px', borderTop: `3px solid ${s.color}`, borderRadius: 8 }}>
            <Tag color={s.color} style={{ fontSize: 14, marginBottom: 8 }}>步骤 {s.step}</Tag>
            <div><Text strong>{s.label}</Text></div>
            <Text type="secondary" style={{ fontSize: 13 }}>{s.desc}</Text>
          </Card>
        ))}
      </div>
      <Alert type="warning" showIcon style={{ borderRadius: 8 }}
        message="重要提示"
        description="所有财务操作都需要先选择一个账套。如果您看到提示「请先选择账套」，请前往「基础设置 → 账套管理」创建或切换。"
      />
    </div>
  );

  const panelBooks = (
    <div>
      <Title level={5}>什么是账套？</Title>
      <Paragraph>账套是一套完整的会计数据集合，通常对应一个独立核算的公司或业务单元。不同账套之间数据完全隔离。</Paragraph>

      <Title level={5}>创建账套</Title>
      <Paragraph>点击「新建账套」按钮，填写以下信息：</Paragraph>
      <ul>
        <li><Text strong>账套名称</Text>：建议包含公司名和年份，如"圣比萨2026年度账套"。</li>
        <li><Text strong>启用日期</Text>：该账套的会计期间起始日期。创建后不可修改。</li>
        <li><Text strong>本位币</Text>：默认为 CNY（人民币），一般无需修改。</li>
      </ul>
      <Paragraph type="secondary">创建账套时，系统会自动预置约 70 个中国《企业会计准则》标准一级科目（4位编码），涵盖资产、负债、权益、收入、费用五大类。</Paragraph>

      <Title level={5}>切换账套</Title>
      <Paragraph>在账套列表中点击目标账套的「切换使用」按钮即可。切换后，科目管理和凭证处理都将在新账套下操作。当前使用的账套会有 <Tag color="green">当前使用</Tag> 标记。</Paragraph>

      <Title level={5}>删除账套</Title>
      <Paragraph>只有在该账套下没有任何凭证记录时，才能删除账套。删除后数据不可恢复，请谨慎操作。</Paragraph>
    </div>
  );

  const panelSubjects = (
    <div>
      <Title level={5}>科目体系结构</Title>
      <Paragraph>科目采用层级结构，使用编码规则区分级次：</Paragraph>
      <ul>
        <li><Text strong>一级科目</Text>：4 位编码（如 <Text code>1001</Text> 库存现金），系统预置，代表大类。</li>
        <li><Text strong>二级科目</Text>：6 位编码（如 <Text code>100201</Text> 工商银行），需手动添加，为一级科目的明细。</li>
        <li><Text strong>三级科目</Text>：8 位编码（如 <Text code>10020101</Text> 工商银行基本户），更细粒度的明细。</li>
      </ul>

      <Title level={5}>科目分类与颜色标识</Title>
      <Row gutter={[12, 8]} style={{ margin: '12px 0' }}>
        {[
          { type: '资产类', code: '1xxx', color: '#1890ff', direction: '借', examples: '库存现金、银行存款、应收账款、固定资产' },
          { type: '负债类', code: '2xxx', color: '#f5222d', direction: '贷', examples: '短期借款、应付账款、应交税费' },
          { type: '权益类', code: '3xxx', color: '#722ed1', direction: '贷', examples: '实收资本、资本公积、本年利润' },
          { type: '收入类', code: '6xxx（部分）', color: '#52c41a', direction: '贷', examples: '主营业务收入、其他业务收入' },
          { type: '费用/成本类', code: '5xxx/6xxx', color: '#fa8c16', direction: '借', examples: '销售费用、管理费用、主营业务成本' },
        ].map((t) => (
          <Col span={24} key={t.type}>
            <Space>
              <Tag color={t.color} style={{ minWidth: 70, textAlign: 'center' }}>{t.type}</Tag>
              <Text code>{t.code}</Text>
              <Text>余额方向：<Text strong>{t.direction}方</Text></Text>
              <Text type="secondary">常见科目：{t.examples}</Text>
            </Space>
          </Col>
        ))}
      </Row>

      <Title level={5}>添加下级科目</Title>
      <Paragraph>在左侧科目树中选中目标科目，点击右侧「添加下级科目」按钮。下级科目会自动继承上级科目的类型和余额方向，编码必须以上级编码开头。</Paragraph>

      <Title level={5}>停用 / 启用科目</Title>
      <Paragraph>选中科目后，在右侧面板点击「启用/停用」开关。停用后的科目不能用于新凭证录入，但已有凭证中的该科目不受影响。如果该科目正在草稿凭证中使用，则无法停用。</Paragraph>

      <Title level={5}>删除科目</Title>
      <Paragraph>仅允许删除满足以下条件的科目：没有下级科目（即叶子节点）；没有被任何凭证分录引用。</Paragraph>

      <Title level={5}>现金类科目标记</Title>
      <Paragraph><Text code>1001 库存现金</Text> 和 <Text code>1002 银行存款</Text> 默认标记为现金类科目（<Tag color="green">是</Tag>），用于未来现金流量表生成。</Paragraph>
    </div>
  );

  const panelVoucherEntry = (
    <div>
      <Title level={5}>凭证结构</Title>
      <Paragraph>每张凭证由「凭证头」和「分录行」两部分组成：</Paragraph>

      <Paragraph><Text strong>凭证头：</Text></Paragraph>
      <ul>
        <li><Text strong>凭证字</Text>：可选"记"、"收"、"付"、"转"，默认"记"。不同凭证字的号码序列独立。</li>
        <li><Text strong>凭证号</Text>：系统根据「期间 + 凭证字」自动分配，按月自增。</li>
        <li><Text strong>日期</Text>：凭证日期，选择日期后会自动设定会计期间（YYYY-MM）。</li>
        <li><Text strong>附件张数</Text>：附带的原始单据数量，默认为 0。</li>
      </ul>

      <Paragraph><Text strong>分录行（借贷两栏式）：</Text></Paragraph>
      <ul>
        <li><Text strong>摘要</Text>：简要说明该笔分录的经济业务内容。</li>
        <li><Text strong>会计科目</Text>：通过下拉树形选择器选择，支持搜索。</li>
        <li><Text strong>借方金额</Text>：记入借方的金额。</li>
        <li><Text strong>贷方金额</Text>：记入贷方的金额。</li>
      </ul>
      <Paragraph type="secondary">同一行只能填写借方或贷方其中之一。填入借方金额时贷方自动清零，反之亦然。</Paragraph>

      <Divider dashed />

      <Title level={5}>借贷平衡规则</Title>
      <Paragraph><Text strong>核心规则：每张凭证的借方合计必须等于贷方合计。</Text></Paragraph>
      <Paragraph>页面底部实时显示借方合计、贷方合计和差额。当借贷平衡时显示 <Tag color="success">借贷平衡 ✓</Tag> 标记，此时保存按钮可用。如果不平衡，保存按钮将被禁用，并显示红色差额提示。</Paragraph>

      <Divider dashed />

      <Title level={5}>凭证录入示例</Title>
      <Paragraph>以"购买办公用品 500 元，现金支付"为例：</Paragraph>
      <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8, border: '1px solid #b7eb8f', margin: '12px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #52c41a' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>摘要</th>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>科目</th>
              <th style={{ textAlign: 'right', padding: '4px 8px' }}>借方</th>
              <th style={{ textAlign: 'right', padding: '4px 8px' }}>贷方</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #d9f7be' }}>
              <td style={{ padding: '4px 8px' }}>购买办公用品</td>
              <td style={{ padding: '4px 8px' }}><Text code>6602 管理费用</Text></td>
              <td style={{ textAlign: 'right', padding: '4px 8px', color: '#1890ff' }}>500.00</td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}></td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}>购买办公用品</td>
              <td style={{ padding: '4px 8px' }}><Text code>1001 库存现金</Text></td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}></td>
              <td style={{ textAlign: 'right', padding: '4px 8px', color: '#52c41a' }}>500.00</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #52c41a' }}>
              <td colSpan={2} style={{ textAlign: 'right', padding: '4px 8px' }}><Text strong>合计</Text></td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}><Text strong style={{ color: '#1890ff' }}>500.00</Text></td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}><Text strong style={{ color: '#52c41a' }}>500.00</Text></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Paragraph type="secondary">解读：管理费用增加（借方 +），库存现金减少（贷方 +）。费用类科目借增贷减，资产类科目借增贷减。</Paragraph>

      <Divider dashed />

      <Title level={5}>常见分录模板</Title>
      <Row gutter={[12, 12]} style={{ margin: '12px 0' }}>
        {[
          { title: '销售收入', debit: '1002 银行存款', credit: '6001 主营业务收入', desc: '收到销售货款' },
          { title: '采购材料', debit: '1403 原材料', credit: '2202 应付账款', desc: '赊购原材料' },
          { title: '发放工资', debit: '2211 应付职工薪酬', credit: '1002 银行存款', desc: '银行转账发放工资' },
          { title: '缴纳税款', debit: '2221 应交税费', credit: '1002 银行存款', desc: '银行扣缴税款' },
          { title: '费用报销', debit: '6601 销售费用', credit: '1001 库存现金', desc: '现金报销差旅费' },
          { title: '收到投资', debit: '1002 银行存款', credit: '3001 实收资本', desc: '收到股东注资' },
        ].map((t, i) => (
          <Col span={8} key={i}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Text strong>{t.title}</Text>
              <div style={{ margin: '4px 0', fontSize: 13 }}><Text type="secondary">借：</Text><Text code>{t.debit}</Text></div>
              <div style={{ fontSize: 13 }}><Text type="secondary">贷：</Text><Text code>{t.credit}</Text></div>
              <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 12 }}>{t.desc}</Text></div>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={5}>保存与连续录入</Title>
      <Paragraph>新建凭证保存成功后，表单会自动清空并生成下一个凭证号，方便连续录入多张凭证。</Paragraph>
    </div>
  );

  const panelVoucherQuery = (
    <div>
      <Title level={5}>查询凭证</Title>
      <Paragraph>进入「凭证查询」页面，可通过以下条件筛选凭证：</Paragraph>
      <ul>
        <li><Text strong>会计期间</Text>：输入 YYYY-MM 格式，如 "2026-02"。</li>
        <li><Text strong>状态</Text>：可筛选"全部"、"草稿"、"已审核"。</li>
        <li><Text strong>关键词</Text>：在摘要或科目名称中搜索。</li>
      </ul>

      <Title level={5}>审核凭证</Title>
      <Paragraph>对「草稿」状态的凭证点击 <Tag color="green">审核</Tag> 按钮，凭证状态变为「已审核」：</Paragraph>
      <ul>
        <li>审核后的凭证<Text strong>不可修改、不可删除</Text>。</li>
        <li>审核人信息和审核时间会被自动记录。</li>
      </ul>

      <Title level={5}>反审核</Title>
      <Paragraph>对已审核的凭证点击 <Tag color="orange">反审核</Tag> 按钮，凭证恢复为「草稿」状态，可以重新编辑或删除。</Paragraph>
      <Paragraph type="secondary">注意：如果凭证所在期间已经月末结账，则无法反审核。需先进行反结账。</Paragraph>

      <Title level={5}>编辑与删除</Title>
      <Paragraph>仅限「草稿」状态的凭证可以编辑和删除。点击「编辑」按钮跳转到编辑页面，修改分录后重新保存。</Paragraph>

      <Title level={5}>查看凭证详情</Title>
      <Paragraph>点击「查看」按钮弹出详情弹窗，展示凭证完整信息和分录明细，包含借贷合计。</Paragraph>
    </div>
  );

  const panelVoucherWord = (
    <div>
      <Paragraph>系统支持四种凭证字，每种凭证字在同一期间内有独立的编号序列：</Paragraph>
      <Row gutter={[12, 12]} style={{ margin: '12px 0' }}>
        {[
          { word: '记', desc: '通用记账凭证，适用于所有业务', color: '#1890ff' },
          { word: '收', desc: '收款凭证，记录收入/收款业务', color: '#52c41a' },
          { word: '付', desc: '付款凭证，记录支出/付款业务', color: '#f5222d' },
          { word: '转', desc: '转账凭证，记录内部转账/结转业务', color: '#722ed1' },
        ].map((w) => (
          <Col span={6} key={w.word}>
            <Card size="small" style={{ textAlign: 'center', borderRadius: 8, borderLeft: `4px solid ${w.color}` }}>
              <Tag color={w.color} style={{ fontSize: 18, padding: '4px 16px', marginBottom: 8 }}>{w.word}</Tag>
              <div><Text type="secondary" style={{ fontSize: 12 }}>{w.desc}</Text></div>
            </Card>
          </Col>
        ))}
      </Row>
      <Paragraph type="secondary">编号规则：凭证号 = 当月该凭证字的最大号 + 1。如本月「记」字凭证已有 3 张（0001~0003），新建的「记」字凭证号为 0004。</Paragraph>
    </div>
  );

  const panelAccounting101 = (
    <div>
      <Title level={5}>借贷记账法</Title>
      <Paragraph>借贷记账法是国际通用的复式记账方法。"借"和"贷"是记账符号，不代表"借入"和"贷出"：</Paragraph>
      <div style={{ background: '#f0f5ff', padding: 16, borderRadius: 8, border: '1px solid #adc6ff', margin: '12px 0' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Title level={5} style={{ color: '#1890ff', margin: 0 }}>借方（Debit）增加的科目</Title>
            <ul style={{ marginTop: 8 }}>
              <li>资产类科目（如现金、存货、固定资产）</li>
              <li>费用/成本类科目（如管理费用、销售费用）</li>
            </ul>
          </Col>
          <Col span={12}>
            <Title level={5} style={{ color: '#52c41a', margin: 0 }}>贷方（Credit）增加的科目</Title>
            <ul style={{ marginTop: 8 }}>
              <li>负债类科目（如应付账款、借款）</li>
              <li>权益类科目（如实收资本、利润）</li>
              <li>收入类科目（如主营业务收入）</li>
            </ul>
          </Col>
        </Row>
      </div>

      <Title level={5}>会计恒等式</Title>
      <div style={{ background: '#fff7e6', padding: 16, borderRadius: 8, border: '1px solid #ffd591', margin: '12px 0', textAlign: 'center' }}>
        <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>资产 = 负债 + 所有者权益</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>Assets = Liabilities + Owner's Equity</Paragraph>
      </div>

      <Title level={5}>会计科目分类口诀</Title>
      <Paragraph><Text code>资产费用借增贷减，负债权益收入贷增借减</Text></Paragraph>
      <ul>
        <li>资产/费用类科目：发生增加记<Text strong>借方</Text>，发生减少记<Text strong>贷方</Text>。期末余额在借方。</li>
        <li>负债/权益/收入类科目：发生增加记<Text strong>贷方</Text>，发生减少记<Text strong>借方</Text>。期末余额在贷方。</li>
      </ul>
    </div>
  );

  const panelSubjectRef = (
    <div>
      <Paragraph>创建新账套时，系统自动预置以下中国《企业会计准则》标准一级科目。您可以在此基础上添加下级明细科目。</Paragraph>

      <Title level={5} style={{ color: '#1890ff' }}>资产类（1xxx）</Title>
      <Paragraph style={{ fontSize: 13 }}>
        1001 库存现金 | 1002 银行存款 | 1012 其他货币资金 | 1101 交易性金融资产 | 1121 应收票据 | 1122 应收账款 |
        1123 预付账款 | 1131 应收股利 | 1132 应收利息 | 1221 其他应收款 | 1231 坏账准备 | 1401 材料采购 |
        1402 在途物资 | 1403 原材料 | 1404 材料成本差异 | 1405 库存商品 | 1406 发出商品 | 1407 商品进销差价 |
        1408 委托加工物资 | 1411 周转材料 | 1501 持有至到期投资 | 1511 长期股权投资 | 1521 投资性房地产 |
        1601 固定资产 | 1602 累计折旧 | 1603 固定资产减值准备 | 1604 在建工程 | 1605 工程物资 | 1606 固定资产清理 |
        1701 无形资产 | 1702 累计摊销 | 1801 长期待摊费用 | 1811 递延所得税资产 | 1901 待处理财产损溢
      </Paragraph>

      <Title level={5} style={{ color: '#f5222d' }}>负债类（2xxx）</Title>
      <Paragraph style={{ fontSize: 13 }}>
        2001 短期借款 | 2101 交易性金融负债 | 2201 应付票据 | 2202 应付账款 | 2203 预收账款 |
        2211 应付职工薪酬 | 2221 应交税费 | 2231 应付利息 | 2232 应付股利 | 2241 其他应付款 |
        2401 递延收益 | 2501 长期借款 | 2502 应付债券 | 2701 长期应付款 | 2801 预计负债 | 2901 递延所得税负债
      </Paragraph>

      <Title level={5} style={{ color: '#722ed1' }}>所有者权益类（3xxx）</Title>
      <Paragraph style={{ fontSize: 13 }}>3001 实收资本 | 3002 资本公积 | 3101 盈余公积 | 3104 本年利润 | 3105 利润分配</Paragraph>

      <Title level={5} style={{ color: '#fa8c16' }}>成本类（5xxx）& 损益类（6xxx）</Title>
      <Paragraph style={{ fontSize: 13 }}>
        5001 生产成本 | 5101 制造费用 | 5201 劳务成本 | 5301 研发支出 |
        6001 主营业务收入 | 6051 其他业务收入 | 6101 公允价值变动损益 | 6111 投资收益 | 6301 营业外收入 |
        6401 主营业务成本 | 6402 其他业务成本 | 6403 营业税金及附加 | 6601 销售费用 | 6602 管理费用 |
        6603 财务费用 | 6701 资产减值损失 | 6711 营业外支出 | 6801 所得税费用
      </Paragraph>
    </div>
  );

  const panelFAQ = (
    <div>
      {[
        { q: '为什么我无法保存凭证？', a: '请检查借贷是否平衡（借方合计 = 贷方合计），且金额不能全部为零。至少需要两条分录。每条分录都必须选择科目。' },
        { q: '为什么无法编辑或删除已审核的凭证？', a: '已审核的凭证已经确认入账，需要先「反审核」恢复为草稿状态后才能编辑或删除。' },
        { q: '为什么某个科目无法停用？', a: '如果该科目正在草稿凭证中使用，必须先修改或删除这些草稿凭证后才能停用。' },
        { q: '为什么无法删除科目？', a: '科目必须是叶子节点（无下级科目）且没有被任何凭证分录引用时才能删除。' },
        { q: '为什么无法删除账套？', a: '账套下有凭证数据时无法删除。需先删除所有凭证后才能删除账套。' },
        { q: '凭证号是怎么分配的？', a: '凭证号按「期间 + 凭证字」自动递增。如 2026-02 期间的"记"字凭证：0001、0002、0003...' },
        { q: '可以同时管理多套账吗？', a: '可以。创建多个账套后，通过「切换使用」按钮在不同账套之间切换。所有操作都在当前选定的账套下进行。' },
        { q: '什么时候需要添加下级科目？', a: '当一级科目不够细时。例如：1002 银行存款 下添加 100201 工商银行、100202 建设银行，用来分别核算各银行的余额。' },
      ].map((faq, i) => (
        <div key={i} style={{ marginBottom: i < 7 ? 16 : 0 }}>
          <Text strong style={{ color: '#fa8c16' }}>Q{i + 1}：{faq.q}</Text>
          <Paragraph style={{ margin: '4px 0 0 24px' }}><Text>A：{faq.a}</Text></Paragraph>
          {i < 7 && <Divider dashed style={{ margin: '12px 0' }} />}
        </div>
      ))}
    </div>
  );

  // ========== 折叠面板配置 ==========
  const collapseItems = [
    {
      key: 'overview',
      label: <span><InfoCircleOutlined style={{ color: '#fa8c16', marginRight: 8 }} />系统概述</span>,
      children: panelSystemOverview,
    },
    {
      key: 'quickstart',
      label: <span><ArrowRightOutlined style={{ color: '#52c41a', marginRight: 8 }} />快速入门流程</span>,
      children: panelQuickStart,
    },
    {
      key: 'books',
      label: <span><BookOutlined style={{ color: '#fa8c16', marginRight: 8 }} />账套管理</span>,
      children: panelBooks,
    },
    {
      key: 'subjects',
      label: <span><DatabaseOutlined style={{ color: '#1890ff', marginRight: 8 }} />科目管理</span>,
      children: panelSubjects,
    },
    {
      key: 'voucher-entry',
      label: <span><FormOutlined style={{ color: '#52c41a', marginRight: 8 }} />凭证录入</span>,
      children: panelVoucherEntry,
    },
    {
      key: 'voucher-query',
      label: <span><SearchOutlined style={{ color: '#722ed1', marginRight: 8 }} />凭证查询与审核</span>,
      children: panelVoucherQuery,
    },
    {
      key: 'voucher-word',
      label: <span><NumberOutlined style={{ color: '#13c2c2', marginRight: 8 }} />凭证字与编号规则</span>,
      children: panelVoucherWord,
    },
    {
      key: 'accounting101',
      label: <span><SwapOutlined style={{ color: '#eb2f96', marginRight: 8 }} />会计基础知识速查</span>,
      children: panelAccounting101,
    },
    {
      key: 'subject-ref',
      label: <span><UnorderedListOutlined style={{ color: '#2f54eb', marginRight: 8 }} />预置标准一级科目参考表</span>,
      children: panelSubjectRef,
    },
    {
      key: 'faq',
      label: <span><QuestionCircleOutlined style={{ color: '#595959', marginRight: 8 }} />常见问题（FAQ）</span>,
      children: panelFAQ,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* 欢迎卡片 */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #fa8c16cc 0%, #fa8c16 100%)',
          color: 'white',
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(250, 140, 22, 0.25)',
        }}
        bordered={false}
      >
        <Row align="middle" gutter={24}>
          <Col flex="auto">
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              欢迎使用财务数字化后台，{user?.real_name || '用户'}！
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, margin: '8px 0 0' }}>
              本系统提供完整的财务核算功能，包括账套管理、会计科目管理、凭证录入与审核，以及外卖成本分析。
            </Paragraph>
            {currentBookId ? (
              <Tag color="green" style={{ marginTop: 12, fontSize: 14, padding: '4px 12px' }}>
                <CheckCircleOutlined /> 当前账套：{currentBookName}
              </Tag>
            ) : (
              <Tag color="red" style={{ marginTop: 12, fontSize: 14, padding: '4px 12px' }}>
                <InfoCircleOutlined /> 尚未选择账套，请先前往「账套管理」创建或选择
              </Tag>
            )}
          </Col>
          <Col>
            <BankOutlined style={{ fontSize: 80, color: 'rgba(255,255,255,0.25)' }} />
          </Col>
        </Row>
      </Card>

      {/* 快速导航 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { icon: <BookOutlined style={{ fontSize: 28 }} />, title: '账套管理', desc: '创建 / 切换账套', color: '#fa8c16' },
          { icon: <DatabaseOutlined style={{ fontSize: 28 }} />, title: '科目管理', desc: '查看 / 维护科目', color: '#1890ff' },
          { icon: <FormOutlined style={{ fontSize: 28 }} />, title: '凭证录入', desc: '新增记账凭证', color: '#52c41a' },
          { icon: <SearchOutlined style={{ fontSize: 28 }} />, title: '凭证查询', desc: '查询 / 审核凭证', color: '#722ed1' },
          { icon: <DollarOutlined style={{ fontSize: 28 }} />, title: '成本分析', desc: '外卖成本核算', color: '#eb2f96' },
        ].map((item, i) => (
          <Col xs={12} sm={8} md={4} lg={4} key={i}>
            <Card
              hoverable
              style={{ textAlign: 'center', borderRadius: 12, borderTop: `3px solid ${item.color}` }}
              bodyStyle={{ padding: '20px 12px' }}
            >
              <div style={{ color: item.color, marginBottom: 8 }}>{item.icon}</div>
              <Text strong style={{ display: 'block' }}>{item.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      {/* 说明书 - 折叠分类 */}
      <Title level={3} style={{ marginBottom: 16 }}><FileTextOutlined style={{ marginRight: 8 }} />财务核算模块使用说明书</Title>

      <Alert
        type="info"
        showIcon
        message="点击下方各功能分类即可展开查看详细说明。"
        description="本模块遵循中国《企业会计准则》，采用复式记账法（借/贷），所有凭证必须借贷平衡方可保存。"
        style={{ marginBottom: 20, borderRadius: 8 }}
      />

      <Collapse
        accordion={false}
        bordered={false}
        defaultActiveKey={[]}
        items={collapseItems}
        style={{
          background: 'transparent',
          marginBottom: 24,
        }}
        size="large"
      />

      {/* 页脚 */}
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
        <Text type="secondary">财务数字化后台 v1.0 — 圣比萨数字化平台</Text>
      </div>
    </div>
  );
};

export default AccountingWelcome;
