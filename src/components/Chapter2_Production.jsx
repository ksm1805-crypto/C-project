import React, { useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Factory, CheckCircle, Calendar } from 'lucide-react';
import KPICard from './common/KPICard';

const INITIAL_PROD_DATA = [
  { name: 'OLED Material', batch: 42, revenue: 120, targetRev: 130 },
  { name: 'API (Pharma)', batch: 31, revenue: 85, targetRev: 80 },
  { name: '신사업 (New Biz)', batch: 12, revenue: 15, targetRev: 20 },
];

const WEEKLY_CHECKLIST = [
  { week: 'Week 1', title: '계획 확정', desc: '수주/납기 확정', done: true },
  { week: 'Week 2', title: 'CAPA 분석', desc: '병목/불량 체크', done: false },
  { week: 'Week 3', title: '매출 인식', desc: '출하/재고 점검', done: false },
  { week: 'Week 4', title: 'KPI 리뷰', desc: '월간 마감/분석', done: false },
];

const Chapter2_Production = () => {
  const [data] = useState(INITIAL_PROD_DATA);
  const [tasks, setTasks] = useState(WEEKLY_CHECKLIST);

  const toggleTask = (idx) => {
    const newTasks = [...tasks];
    newTasks[idx].done = !newTasks[idx].done;
    setTasks(newTasks);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-100 flex gap-2">
        <Factory className="text-green-600" size={20}/>
        <p className="text-sm text-gray-700">단순 생산량 증대가 아닌, <span className="font-bold text-green-700">"매출로 이어지는 생산"</span>을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="설비 가동률" value="82.4%" sub="Target: 85%" />
        <KPICard title="월 생산 Lot" value="85 Lots" sub="전월 대비 +5" />
        <KPICard title="Batch당 매출" value="₩2.5억" sub="Mix 개선 필요" alert={false} />
        <KPICard title="납기 준수율" value="94.5%" sub="지연 2건 발생" alert={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 col-span-2">
          <h3 className="font-bold text-gray-700 mb-4">생산 Batch vs 매출 (이중 축)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#f5f5f5" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" label={{ value: 'Batch', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: '매출(억)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="batch" name="생산 Batch" fill="#3B82F6" barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출액" stroke="#10B981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 col-span-1">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-orange-500"/> 월간 운영 리듬
          </h3>
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div key={idx} onClick={() => toggleTask(idx)} className={`p-3 rounded-lg border cursor-pointer ${task.done ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-bold text-gray-500">{task.week}</span>
                   {task.done && <CheckCircle size={14} className="text-green-600"/>}
                </div>
                <h4 className={`text-sm font-bold ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter2_Production;