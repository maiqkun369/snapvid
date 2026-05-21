import React, { useState } from 'react';

function PricingPanel() {
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const plans = [
    {
      name: '免费版',
      price: '¥0',
      period: '永久',
      current: true,
      features: [
        '每日 3 次下载',
        '最高 1080P 画质',
        '单文件 500MB 限制',
        '基础格式支持',
        '显示广告',
      ],
      limitations: ['不支持批量下载', '不支持 4K/8K', '无 AI 工具'],
    },
    {
      name: 'Pro',
      price: '¥29',
      period: '/月',
      highlight: true,
      features: [
        '无限下载次数',
        '4K / 8K 原画画质',
        '批量解析下载',
        '全格式转换',
        '字幕 / 封面提取',
        'AI 字幕生成',
        '无广告体验',
        '优先解析速度',
      ],
      limitations: [],
    },
    {
      name: '企业版',
      price: '定制',
      period: '',
      features: [
        '包含 Pro 全部功能',
        '多子账号管理',
        'API 接口调用',
        '私有化部署',
        'SLA 服务保障',
        '专属技术支持',
        '下载日志审计',
      ],
      limitations: [],
    },
  ];

  return (
    <div className="relative">
      <p className="text-xs text-white/30 tracking-widest uppercase mb-6 text-center">Pricing</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-5 transition-all duration-300 ${
              plan.highlight
                ? 'bg-white/[0.06] border-2 border-white/20 scale-[1.02]'
                : 'bg-white/[0.02] border border-white/[0.06]'
            }`}
          >
            {plan.highlight && (
              <span className="inline-block text-[10px] bg-white text-gray-900 px-2 py-0.5 rounded-full font-medium mb-3">
                推荐
              </span>
            )}
            <h4 className="text-sm font-medium text-white/80">{plan.name}</h4>
            <div className="mt-2 mb-4">
              <span className="text-2xl font-light text-white">{plan.price}</span>
              <span className="text-xs text-white/30 ml-1">{plan.period}</span>
            </div>

            <ul className="space-y-1.5 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="text-[11px] text-white/45 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">+</span> {f}
                </li>
              ))}
              {plan.limitations.map((f) => (
                <li key={f} className="text-[11px] text-white/25 flex items-start gap-1.5">
                  <span className="text-white/15 mt-0.5">-</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                if (plan.current) return;
                showToast(plan.name === '企业版' ? '请联系 enterprise@snapvid.app' : '付费功能即将上线，敬请期待');
              }}
              disabled={plan.current}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                plan.current
                  ? 'bg-white/[0.05] text-white/30 cursor-default'
                  : plan.highlight
                    ? 'bg-white text-gray-900 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12]'
              }`}
            >
              {plan.current ? '当前方案' : plan.name === '企业版' ? '联系我们' : '升级 Pro'}
            </button>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md border border-white/[0.1] text-white/80 text-xs px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default PricingPanel;
