import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KPICard = ({ title, value, sub, alert }) => {
  // alert 상태에 따른 테마 설정 (더 세련된 컬러)
  const theme = alert 
    ? { iconBg: 'bg-red-50', iconColor: 'text-red-600', subText: 'text-red-700' } 
    : { iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', subText: 'text-indigo-700' };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.15)] transition-shadow border border-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 tracking-tight mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${theme.iconBg} ${theme.iconColor}`}>
          {alert ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${theme.iconBg} ${theme.subText}`}>
          {sub}
        </span>
      </div>
    </div>
  );
};

export default KPICard;