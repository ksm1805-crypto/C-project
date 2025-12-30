import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Minus } from 'lucide-react';

const KPICard = ({ title, value, sub, alert }) => {
  // 색상을 원색에서 무채색/딥톤으로 변경하여 전문성 강조
  const iconBg = alert ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600';
  const SubIcon = alert ? AlertCircle : (sub.includes('+') ? TrendingUp : (sub.includes('-') ? TrendingDown : Minus));

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          {/* 제목: 더 차분한 회색, uppercase 제거로 부드럽게 */}
          <p className="text-sm font-semibold text-slate-500 tracking-tight leading-tight">{title}</p>
          {/* 값: 아주 짙은 회색으로 강력하게 강조 */}
          <h3 className="text-3xl font-bold text-slate-900 tracking-tighter leading-none">
            {value}
          </h3>
        </div>
        {/* 아이콘: Accent Bar 대신 세련된 모노톤 아이콘 박스 */}
        <div className={`p-2.5 rounded-md ${iconBg} transition-colors group-hover:bg-slate-800 group-hover:text-white`}>
          <SubIcon size={20} strokeWidth={2} />
        </div>
      </div>
      
      {/* 하단 정보: 색상 톤 다운 */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${alert ? 'text-slate-700' : 'text-slate-500'}`}>
          {sub}
        </span>
      </div>
    </div>
  );
};

export default KPICard;