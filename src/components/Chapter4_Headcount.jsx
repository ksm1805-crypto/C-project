import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Users, Briefcase, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import KPICard from './common/KPICard';

const INITIAL_DEPT_DATA = [
  { id: 'rnd', name: '연구 (R&D)', count: 18, kpi: '신제품/공정개선', color: '#8B5CF6' },
  { id: 'mfg', name: '제조 (Mfg)', count: 42, kpi: 'Batch/가동률', color: '#3B82F6' },
  { id: 'qa', name: '품질 (QA)', count: 16, kpi: '불량/CAPA', color: '#F59E0B' },
  { id: 'sales', name: '영업/PM', count: 9, kpi: '매출/OTD', color: '#10B981' },
];

const PROD_TREND = [
  { month: '1월', value: 2.1 },
  { month: '2월', value: 2.3 },
  { month: '3월', value: 2.2 },
  { month: '4월', value: 2.5 }, // 목표 달성
];

const Chapter4_Headcount = () => {
  const [depts] = useState(INITIAL_DEPT_DATA);
  
  // KPI 계산 logic
  const totalHeadcount = depts.reduce((acc, cur) => acc + cur.count, 0);
  const revenuePerHead = 2.5; // 억/인 (예시)
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 상단 배너 (운영 원칙) */}
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
        <Users className="text-indigo-600 mt-1" size={20}/>
        <div>
          <h2 className="text-lg font-bold text-gray-800">HR & Productivity Gate</h2>
          <p className="text-sm text-gray-600 mt-1">
            인력은 "총원 관리"가 아닌 <span className="font-bold text-indigo-700">"역할/생산성 기반의 게이트(Gate)"</span>로 관리합니다.
          </p>
        </div>
      </div>

      {/* 2. KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="총 인원 (Headcount)" value={`${totalHeadcount}명`} sub="정규직 기준" />
        <KPICard title="인당 매출액" value={`₩${revenuePerHead}억`} sub="Target: 2.8억" alert={true} />
        <KPICard title="제조 인당 Batch" value="1.2 Batch" sub="전월 대비 +0.1" />
        <KPICard title="연구 과제 리드타임" value="4.5개월" sub="목표 달성" alert={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. 사업부 인력 구조 (Cards) */}
        <div className="col-span-1 space-y-4">
          <h3 className="font-bold text-gray-700">부서별 인력 구조</h3>
          {depts.map(dept => (
            <div key={dept.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 flex justify-between items-center hover:shadow-md transition" style={{ borderLeftColor: dept.color }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gray-50 text-gray-600`}>
                  <Briefcase size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{dept.name}</h4>
                  <p className="text-xs text-gray-500">KPI: {dept.kpi}</p>
                </div>
              </div>
              <span className="text-xl font-bold text-gray-800">{dept.count}명</span>
            </div>
          ))}
        </div>

        {/* 4. 생산성 지표 차트 & Rules */}
        <div className="col-span-2 space-y-6">
          {/* 차트 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600"/> 인당 생산성 추이 (매출/인원)
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PROD_TREND}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="month" />
                  <YAxis unit="억" />
                  <Tooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="value" name="인당 매출" fill="#6366f1" barSize={40} radius={[4,4,0,0]}>
                    {PROD_TREND.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === PROD_TREND.length - 1 ? '#4338ca' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 게이트 운영 규칙 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">인력 운영 규칙 (Gate System)</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 min-w-[16px]"/>
                <span>채용/증원은 <strong>"매출 증가"</strong> 또는 <strong>"고정비 절감"</strong>의 정량 근거 필수 승인</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 min-w-[16px]"/>
                <span>신사업 인력은 단계별 게이트(POC → 양산 → 확대)로 캡(Cap) 설정</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 min-w-[16px]"/>
                <span>단순 반복 업무는 자동화/표준화 후 핵심 공정으로 인력 재배치</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter4_Headcount;