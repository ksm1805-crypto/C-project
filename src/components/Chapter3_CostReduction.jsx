import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Target, Plus, AlertCircle, Save, TrendingDown, CheckSquare } from 'lucide-react';
import KPICard from './common/KPICard';

// 원가 구조 카테고리 (이미지 참조)
const COST_STRUCTURE = [
  { id: 'raw', name: '원재료', driver: '단가 / 대체 / 수율', color: '#3B82F6' },
  { id: 'util', name: '용매·유틸', driver: '회수율 / 소비량', color: '#10B981' },
  { id: 'out', name: '외주비', driver: '내재화 / 단가', color: '#F59E0B' },
  { id: 'fail', name: '품질실패', driver: '재작업 / 재시험', color: '#EF4444' },
];

const Chapter3_CostReduction = () => {
  // 샘플 데이터: 액션 트래커
  const [actions, setActions] = useState([
    { id: 1, category: 'raw', item: '핵심 원재료 A', action: '2nd Vendor 도입', annualEffect: 50000000, status: '진행중', risk: '품질 승인 지연' },
    { id: 2, category: 'util', item: '재생 용매', action: '회수율 70%→78%', annualEffect: 30000000, status: '진행중', risk: 'None' },
    { id: 3, category: 'out', item: '반복 분석', action: '월 40건 내재화', annualEffect: 20000000, status: '검토', risk: '인력 부하' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newAction, setNewAction] = useState({ category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '' });

  // KPI 계산
  const totalTarget = 150000000; // 목표 절감액 (1.5억)
  const totalEstimated = actions.reduce((acc, cur) => acc + cur.annualEffect, 0);
  const achievementRate = ((totalEstimated / totalTarget) * 100).toFixed(1);

  // 차트 데이터 변환
  const chartData = COST_STRUCTURE.map(cat => ({
    name: cat.name,
    value: actions.filter(a => a.category === cat.id).reduce((acc, a) => acc + a.annualEffect, 0) / 1000000 // 백만원 단위
  }));

  const handleAdd = () => {
    if (!newAction.item || !newAction.annualEffect) return alert('필수 항목을 입력해주세요.');
    setActions([...actions, { ...newAction, id: Date.now() }]);
    setShowForm(false);
    setNewAction({ category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 상단 배너 (운영 원칙) */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-start gap-3">
        <Target className="text-purple-600 mt-1" size={20}/>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Action-based Cost Reduction</h2>
          <p className="text-sm text-gray-600 mt-1">
            단순 수치가 아닌 <span className="font-bold text-purple-700">"구체적 액션 + 금액 효과(₩)"</span>로 관리합니다. (연간/당월 분리)
          </p>
        </div>
      </div>

      {/* 2. KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="연간 절감 목표" value={`₩${(totalTarget/100000000).toFixed(1)}억`} sub="전사 목표" />
        <KPICard title="현재 예상 효과" value={`₩${(totalEstimated/100000000).toFixed(1)}억`} sub={`달성률 ${achievementRate}%`} alert={totalEstimated < totalTarget} />
        <KPICard title="진행중 과제" value={`${actions.filter(a=>a.status==='진행중').length}건`} sub="Action Item" />
        <KPICard title="리스크 보유 과제" value={`${actions.filter(a=>a.risk && a.risk!=='None').length}건`} sub="Trade-off 관리 필요" alert={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. 원가 구조 분해 (Cards) */}
        <div className="col-span-1 space-y-4">
          <h3 className="font-bold text-gray-700">원가 구조 및 핵심 드라이버</h3>
          {COST_STRUCTURE.map(cost => (
            <div key={cost.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 flex justify-between items-center" style={{ borderLeftColor: cost.color }}>
              <div>
                <h4 className="font-bold text-gray-800">{cost.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{cost.driver}</p>
              </div>
              <span className="text-sm font-bold text-gray-400">
                 ₩{(chartData.find(d=>d.name===cost.name)?.value || 0).toFixed(0)}M
              </span>
            </div>
          ))}
          
          {/* 심플 차트 */}
          <div className="bg-white p-4 rounded-xl shadow-sm h-48">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                 <XAxis dataKey="name" fontSize={12} tickLine={false}/>
                 <YAxis hide/>
                 <Tooltip formatter={(val)=>`₩${val}백만`}/>
                 <Bar dataKey="value" fill="#8884d8" radius={[4,4,0,0]} barSize={30}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COST_STRUCTURE[index].color} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* 4. 액션 트래커 (Table) */}
        <div className="col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <CheckSquare size={18} className="text-blue-600"/> 절감 액션 트래커
            </h3>
            <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-purple-700">
              <Plus size={16} /> 신규 과제
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="py-2 px-3">구분</th>
                  <th className="py-2 px-3">항목/액션</th>
                  <th className="py-2 px-3 text-right">효과(연간)</th>
                  <th className="py-2 px-3 text-right">효과(당월)</th>
                  <th className="py-2 px-3 text-center">상태</th>
                  <th className="py-2 px-3 text-red-500">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actions.map(action => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">
                        {COST_STRUCTURE.find(c => c.id === action.category)?.name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-800">{action.item}</div>
                      <div className="text-xs text-blue-600">{action.action}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">₩{(action.annualEffect/100000000).toFixed(2)}억</td>
                    <td className="py-3 px-3 text-right text-gray-500">₩{(action.annualEffect/12/1000000).toFixed(1)}백만</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${action.status==='진행중'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-red-500">{action.risk || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 입력 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">원가절감 과제 등록</h2>
            <div className="space-y-3">
              <select className="w-full border p-2 rounded" value={newAction.category} onChange={e=>setNewAction({...newAction, category:e.target.value})}>
                {COST_STRUCTURE.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="w-full border p-2 rounded" placeholder="항목 (예: 핵심 원료 A)" value={newAction.item} onChange={e=>setNewAction({...newAction, item:e.target.value})} />
              <input className="w-full border p-2 rounded" placeholder="구체적 액션 (예: 2nd Vendor)" value={newAction.action} onChange={e=>setNewAction({...newAction, action:e.target.value})} />
              <input type="number" className="w-full border p-2 rounded" placeholder="연간 예상 효과 (원)" value={newAction.annualEffect} onChange={e=>setNewAction({...newAction, annualEffect:Number(e.target.value)})} />
              <input className="w-full border p-2 rounded" placeholder="Risk (Trade-off)" value={newAction.risk} onChange={e=>setNewAction({...newAction, risk:e.target.value})} />
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2 bg-gray-100 rounded">취소</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Recharts Cell import 필요 (상단 import 구문에 Cell이 없다면 추가해야 함)
import { Cell } from 'recharts'; 

export default Chapter3_CostReduction;