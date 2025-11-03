import React from 'react';
import { Form, InputNumber, Collapse, Button, Space } from 'antd';
import type { InputData } from '../types';

const { Panel } = Collapse;

interface InputFormProps {
  value: InputData;
  onChange: (data: InputData) => void;
  onReset: () => void;
}

const InputForm: React.FC<InputFormProps> = ({ value, onChange, onReset }) => {
  const [form] = Form.useForm();

  const handleValuesChange = (_: any, allValues: any) => {
    // 深度合并新值和原有值，确保不丢失任何字段
    // 设置默认的 scenarioParams 以防未定义
    const defaultScenarioParams = {
      optimistic: {
        orderCountChange: 30,
        avgIncomeChange: 10,
        costRateChange: -5,
      },
      pessimistic: {
        orderCountChange: -30,
        avgIncomeChange: -10,
        costRateChange: 5,
      }
    };

    const mergedData = {
      initialInvestment: { ...value.initialInvestment, ...allValues.initialInvestment },
      monthlyCost: { ...value.monthlyCost, ...allValues.monthlyCost },
      salesProjection: {
        delivery: { 
          ...value.salesProjection.delivery, 
          ...(allValues.salesProjection?.delivery || {}) 
        },
        pickup: { 
          ...value.salesProjection.pickup, 
          ...(allValues.salesProjection?.pickup || {}) 
        },
        peakSeasonMonths: allValues.salesProjection?.peakSeasonMonths ?? value.salesProjection.peakSeasonMonths,
        lowSeasonMonths: allValues.salesProjection?.lowSeasonMonths ?? value.salesProjection.lowSeasonMonths,
        lowSeasonHolidayDays: allValues.salesProjection?.lowSeasonHolidayDays ?? value.salesProjection.lowSeasonHolidayDays,
        lowSeasonWeekdayDays: allValues.salesProjection?.lowSeasonWeekdayDays ?? value.salesProjection.lowSeasonWeekdayDays,
      },
      costRate: { ...value.costRate, ...allValues.costRate },
      scenarioParams: {
        optimistic: {
          ...(value.scenarioParams?.optimistic || defaultScenarioParams.optimistic),
          ...(allValues.scenarioParams?.optimistic || {})
        },
        pessimistic: {
          ...(value.scenarioParams?.pessimistic || defaultScenarioParams.pessimistic),
          ...(allValues.scenarioParams?.pessimistic || {})
        }
      }
    };
    onChange(mergedData as InputData);
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={value}
      onValuesChange={handleValuesChange}
      style={{ height: '100%' }}
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" htmlType="submit">
            计算
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
        </Space>
      </div>

      <Collapse defaultActiveKey={['1', '2', '3', '4']} ghost>
        {/* A组：一次性初始投资 */}
        <Panel header="A组：一次性初始投资" key="1">
          <Form.Item
            label="年租金（元）"
            name={['initialInvestment', 'yearlyRent']}
            rules={[{ required: true, message: '请输入年租金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入年租金"
            />
          </Form.Item>

          <Form.Item
            label="装修费用（元）"
            name={['initialInvestment', 'decorationCost']}
            rules={[{ required: true, message: '请输入装修费用' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入装修费用"
            />
          </Form.Item>

          <Form.Item
            label="设备采购成本（元）"
            name={['initialInvestment', 'equipmentCost']}
            rules={[{ required: true, message: '请输入设备采购成本' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入设备采购成本"
            />
          </Form.Item>

          <Form.Item
            label="加盟费（元）"
            name={['initialInvestment', 'franchiseFee']}
            rules={[{ required: true, message: '请输入加盟费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入加盟费"
            />
          </Form.Item>

          <Form.Item
            label="保证金（元）"
            name={['initialInvestment', 'deposit']}
            rules={[{ required: true, message: '请输入保证金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入保证金"
            />
          </Form.Item>

          <Form.Item
            label="首期租金押金（元）"
            name={['initialInvestment', 'rentDeposit']}
            rules={[{ required: true, message: '请输入首期租金押金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入首期租金押金"
            />
          </Form.Item>

          <Form.Item
            label="证照办理费（元）"
            name={['initialInvestment', 'licenseFee']}
            rules={[{ required: true, message: '请输入证照办理费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入证照办理费"
            />
          </Form.Item>

          <Form.Item
            label="首批原材料采购费（元）"
            name={['initialInvestment', 'initialMaterialCost']}
            rules={[{ required: true, message: '请输入首批原材料采购费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入首批原材料采购费"
            />
          </Form.Item>

          <Form.Item
            label="开业营销推广费（元）"
            name={['initialInvestment', 'marketingCost']}
            rules={[{ required: true, message: '请输入开业营销推广费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入开业营销推广费"
            />
          </Form.Item>
        </Panel>

        {/* B组：每月运营成本 */}
        <Panel header="B组：每月运营成本" key="2">
          <h4 style={{ margin: '12px 0' }}>人员薪资</h4>
          <Form.Item
            label="员工薪资（元/月）"
            name={['monthlyCost', 'employeeSalary']}
            rules={[{ required: true, message: '请输入员工薪资' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入员工薪资"
            />
          </Form.Item>

          <Form.Item
            label="老板薪资（元/月）"
            name={['monthlyCost', 'ownerSalary']}
            rules={[{ required: true, message: '请输入老板薪资' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入老板薪资"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0' }}>水电杂费</h4>
          <Form.Item
            label="水电杂费（元/月）"
            name={['monthlyCost', 'utilitiesCost']}
            rules={[{ required: true, message: '请输入水电杂费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入水电杂费"
            />
          </Form.Item>

          <Form.Item
            label="物业管理费（元/月）"
            name={['monthlyCost', 'propertyFee']}
            rules={[{ required: true, message: '请输入物业管理费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入物业管理费"
            />
          </Form.Item>

          <Form.Item
            label="系统维护费（元/月）"
            name={['monthlyCost', 'systemMaintenanceFee']}
            rules={[{ required: true, message: '请输入系统维护费' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入系统维护费"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0' }}>营销费用</h4>
          <Form.Item
            label="推广CPC费用（营业额的%）"
            name={['monthlyCost', 'cpcRate']}
            rules={[{ required: true, message: '请输入CPC费用比例' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="请输入百分比"
            />
          </Form.Item>

          <Form.Item
            label="销售CPS费用（营业额的%）"
            name={['monthlyCost', 'cpsRate']}
            rules={[{ required: true, message: '请输入CPS费用比例' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="请输入百分比"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0' }}>品牌费用</h4>
          <Form.Item
            label="品牌管理费（营业额的%）"
            name={['monthlyCost', 'brandManagementRate']}
            rules={[{ required: true, message: '请输入品牌管理费比例' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="请输入百分比"
            />
          </Form.Item>
        </Panel>

        {/* C组：销售预测与收入结构 */}
        <Panel header="C组：销售预测与收入结构（淡旺季）" key="3">
          <h4 style={{ margin: '12px 0' }}>淡旺季设置</h4>
          <Form.Item
            label="旺季月数（一年中）"
            name={['salesProjection', 'peakSeasonMonths']}
            rules={[{ required: true, message: '请输入旺季月数' }]}
            tooltip="旺季期间每天都按节假日水平，默认4个月"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={12}
              precision={0}
              placeholder="例如：4"
            />
          </Form.Item>

          <Form.Item
            label="淡季月数（一年中）"
            name={['salesProjection', 'lowSeasonMonths']}
            rules={[{ required: true, message: '请输入淡季月数' }]}
            tooltip="淡季有工作日和节假日之分，默认8个月"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={12}
              precision={0}
              placeholder="例如：8"
            />
          </Form.Item>

          <Form.Item
            label="淡季每月节假日天数"
            name={['salesProjection', 'lowSeasonHolidayDays']}
            rules={[{ required: true, message: '请输入淡季节假日天数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={31}
              precision={0}
              placeholder="例如：8"
            />
          </Form.Item>

          <Form.Item
            label="淡季每月工作日天数"
            name={['salesProjection', 'lowSeasonWeekdayDays']}
            rules={[{ required: true, message: '请输入淡季工作日天数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={31}
              precision={0}
              placeholder="例如：22"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0' }}>外卖部分</h4>
          <Form.Item
            label="节假日/旺季日均订单量（单）"
            name={['salesProjection', 'delivery', 'holidayOrderCount']}
            rules={[{ required: true, message: '请输入节假日订单量' }]}
            tooltip="淡季的节假日和旺季的每一天都使用这个订单量"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="例如：50"
            />
          </Form.Item>

          <Form.Item
            label="节假日/旺季单均收入（元）"
            name={['salesProjection', 'delivery', 'holidayAvgIncome']}
            rules={[{ required: true, message: '请输入节假日单均收入' }]}
            tooltip="淡季的节假日和旺季的每一天都使用这个单均收入"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="例如：80"
            />
          </Form.Item>

          <Form.Item
            label="淡季工作日日均订单量（单）"
            name={['salesProjection', 'delivery', 'weekdayOrderCount']}
            rules={[{ required: true, message: '请输入工作日订单量' }]}
            tooltip="仅在淡季的工作日使用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="例如：30"
            />
          </Form.Item>

          <Form.Item
            label="淡季工作日单均收入（元）"
            name={['salesProjection', 'delivery', 'weekdayAvgIncome']}
            rules={[{ required: true, message: '请输入工作日单均收入' }]}
            tooltip="仅在淡季的工作日使用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="例如：75"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0' }}>到店自取部分</h4>
          <Form.Item
            label="节假日/旺季日均订单量（单）"
            name={['salesProjection', 'pickup', 'holidayOrderCount']}
            rules={[{ required: true, message: '请输入节假日订单量' }]}
            tooltip="淡季的节假日和旺季的每一天都使用这个订单量"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="例如：20"
            />
          </Form.Item>

          <Form.Item
            label="节假日/旺季单均收入（元）"
            name={['salesProjection', 'pickup', 'holidayAvgIncome']}
            rules={[{ required: true, message: '请输入节假日单均收入' }]}
            tooltip="淡季的节假日和旺季的每一天都使用这个单均收入"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="例如：90"
            />
          </Form.Item>

          <Form.Item
            label="淡季工作日日均订单量（单）"
            name={['salesProjection', 'pickup', 'weekdayOrderCount']}
            rules={[{ required: true, message: '请输入工作日订单量' }]}
            tooltip="仅在淡季的工作日使用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="例如：10"
            />
          </Form.Item>

          <Form.Item
            label="淡季工作日单均收入（元）"
            name={['salesProjection', 'pickup', 'weekdayAvgIncome']}
            rules={[{ required: true, message: '请输入工作日单均收入' }]}
            tooltip="仅在淡季的工作日使用"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="例如：85"
            />
          </Form.Item>
        </Panel>

        {/* D组：成本率参数 */}
        <Panel header="D组：成本率参数" key="4">
          <Form.Item
            label="产品成本率（%）"
            name={['costRate', 'productCostRate']}
            rules={[{ required: true, message: '请输入产品成本率' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="请输入百分比"
            />
          </Form.Item>
        </Panel>

        {/* E组：场景分析参数 */}
        <Panel header="E组：场景分析参数" key="5">
          <h4 style={{ margin: '12px 0', color: '#52c41a' }}>乐观场景假设</h4>
          <Form.Item
            label="订单量变化（%）"
            name={['scenarioParams', 'optimistic', 'orderCountChange']}
            rules={[{ required: true, message: '请输入订单量变化' }]}
            tooltip="例如：30 表示订单量增加30%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={200}
              precision={0}
              placeholder="例如：30"
            />
          </Form.Item>

          <Form.Item
            label="单均收入变化（%）"
            name={['scenarioParams', 'optimistic', 'avgIncomeChange']}
            rules={[{ required: true, message: '请输入单均收入变化' }]}
            tooltip="例如：10 表示单均收入增加10%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={200}
              precision={0}
              placeholder="例如：10"
            />
          </Form.Item>

          <Form.Item
            label="成本率变化（%）"
            name={['scenarioParams', 'optimistic', 'costRateChange']}
            rules={[{ required: true, message: '请输入成本率变化' }]}
            tooltip="例如：-5 表示成本率降低5%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={100}
              precision={0}
              placeholder="例如：-5"
            />
          </Form.Item>

          <h4 style={{ margin: '12px 0', color: '#ff4d4f' }}>悲观场景假设</h4>
          <Form.Item
            label="订单量变化（%）"
            name={['scenarioParams', 'pessimistic', 'orderCountChange']}
            rules={[{ required: true, message: '请输入订单量变化' }]}
            tooltip="例如：-30 表示订单量减少30%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={200}
              precision={0}
              placeholder="例如：-30"
            />
          </Form.Item>

          <Form.Item
            label="单均收入变化（%）"
            name={['scenarioParams', 'pessimistic', 'avgIncomeChange']}
            rules={[{ required: true, message: '请输入单均收入变化' }]}
            tooltip="例如：-10 表示单均收入减少10%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={200}
              precision={0}
              placeholder="例如：-10"
            />
          </Form.Item>

          <Form.Item
            label="成本率变化（%）"
            name={['scenarioParams', 'pessimistic', 'costRateChange']}
            rules={[{ required: true, message: '请输入成本率变化' }]}
            tooltip="例如：5 表示成本率增加5%"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-100}
              max={100}
              precision={0}
              placeholder="例如：5"
            />
          </Form.Item>
        </Panel>
      </Collapse>
    </Form>
  );
};

export default InputForm;


