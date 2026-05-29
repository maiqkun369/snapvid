import React, { useState, useEffect } from 'react';
import TaskCenter from './dashboard/TaskCenter.jsx';
import HistoryPanel from './dashboard/HistoryPanel.jsx';
import Toolbox from './dashboard/Toolbox.jsx';
import AccountPanel from './dashboard/AccountPanel.jsx';
import SchedulePanel from './dashboard/SchedulePanel.jsx';

function Dashboard({ user, onLogout, onNewDownload }) {
  const [activePanel, setActivePanel] = useState('tasks');

  const panels = [
    { id: 'tasks', label: '任务中心' },
    { id: 'history', label: '下载历史' },
    { id: 'tools', label: '工具箱' },
    { id: 'schedule', label: '定时下载' },
    { id: 'account', label: '我的账户' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1D1C1C] flex flex-col">
      {/* Dashboard Header — white bg + 1px black bottom border */}
      <header className="px-6 py-4 bg-white border-b border-[#1D1C1C] flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <a href="#/" className="text-lg font-extrabold text-[#1D1C1C] tracking-tight hover:opacity-70 transition-opacity">
            SnapVid
          </a>
          <span className="text-sm font-bold text-[#4A4A4A]">/ 控制台</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNewDownload}
            className="inline-flex items-center justify-center gap-2 bg-[#1D1C1C] text-white font-bold text-sm py-2.5 px-5 rounded-full transition-all duration-200 hover:opacity-80 active:scale-[0.96]"
          >
            + 新建下载
          </button>
          {user?.plan === 'pro' && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF48D] border border-[#1D1C1C] text-[#1D1C1C]">
              PRO
            </span>
          )}
          <button onClick={onLogout} className="text-sm text-[#1D1C1C] font-medium hover:opacity-60 transition-opacity">
            退出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — no emoji icons, pill-shaped selected */}
        <aside className="w-60 border-r border-[#E8E8E8] bg-white py-6 flex-shrink-0 hidden sm:block">
          <nav className="space-y-1 px-4">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full flex items-center px-5 py-3.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activePanel === panel.id
                    ? 'bg-[#FFF48D] border border-[#1D1C1C] text-[#1D1C1C]'
                    : 'text-[#4A4A4A] hover:bg-gray-100 border border-transparent'
                }`}
              >
                {panel.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#1D1C1C] z-40">
          <div className="flex justify-around py-2">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                  activePanel === panel.id
                    ? 'text-[#1D1C1C] bg-[#FFF48D] border border-[#1D1C1C]'
                    : 'text-[#4A4A4A]'
                }`}
              >
                <span>{panel.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 pb-24 sm:pb-8">
          <div className="max-w-5xl mx-auto">
            {activePanel === 'tasks' && <TaskCenter />}
            {activePanel === 'history' && <HistoryPanel />}
            {activePanel === 'tools' && <Toolbox />}
            {activePanel === 'schedule' && <SchedulePanel />}
            {activePanel === 'account' && <AccountPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
