import React, { useState } from 'react';
import DownloadHistory from './DownloadHistory.jsx';
import AITools from './AITools.jsx';
import CloudSync from './CloudSync.jsx';
import PricingPanel from './PricingPanel.jsx';
import Features from './Features.jsx';
import PlatformList from './PlatformList.jsx';
import CookieManager from './CookieManager.jsx';

function TabPanel({ currentTask, refreshHistory }) {
  const [activeTab, setActiveTab] = useState('history');

  const tabs = [
    { id: 'history', label: '下载历史' },
    { id: 'tools', label: 'AI 工具' },
    { id: 'cloud', label: '云盘' },
    { id: 'accounts', label: '账号' },
    { id: 'pricing', label: '会员' },
    { id: 'platforms', label: '平台' },
  ];

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? 'text-white border-white/60'
                : 'text-white/40 border-transparent hover:text-white/70 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'history' && (
          <DownloadHistory key={refreshHistory} />
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            <AITools taskId={currentTask?.id} />
            {!currentTask && (
              <p className="text-sm text-white/30 text-center py-8">下载视频后可使用 AI 工具处理</p>
            )}
          </div>
        )}

        {activeTab === 'cloud' && (
          <div className="space-y-4">
            <CloudSync taskId={currentTask?.id} />
            {!currentTask && (
              <p className="text-sm text-white/30 text-center py-8">下载视频后可同步到云盘</p>
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <CookieManager />
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <PricingPanel />
            <Features />
          </div>
        )}

        {activeTab === 'platforms' && (
          <PlatformList />
        )}
      </div>
    </div>
  );
}

export default TabPanel;
