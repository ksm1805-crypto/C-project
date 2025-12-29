import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KPICard = ({ title, value, sub, alert }) => {
  // alert가 true면 하락(파랑/나쁨), false면 상승(빨강/좋음) - 한국 증권 기준
  // 하지만 비용 관리에서는 alert(경고)=빨강, 정상=파랑/검정이 직관적이므로 유지하되 스타일을 변경합니다.
  
  return (
    <div className="bg-white border border-gray-300 rounded-sm p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* 상단 컬러 바 (포인트) */}
      <div className={`absolute top-0 left-0 w-full h-1 ${alert ? 'bg-red-500' : 'bg-blue-600'}`}></div>
      
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{title}</span>
        {alert ? (
          <TrendingDown size={16} className="text-red-500" />
        ) : (
          <TrendingUp size={16} className="text-blue-600" />
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className={`text-2xl font-extrabold tracking-tight ${alert ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </h3>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-400">vs Target</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${alert ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {sub}
        </span>
      </div>
    </div>
  );
};

export default KPICard;