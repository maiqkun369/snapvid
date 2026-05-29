import React, { useState, useEffect } from 'react';
import TaskCenter from './dashboard/TaskCenter.jsx';
import HistoryPanel from './dashboard/HistoryPanel.jsx';
import Toolbox from './dashboard/Toolbox.jsx';
import AccountPanel from './dashboard/AccountPanel.jsx';
import SchedulePanel from './dashboard/SchedulePanel.jsx';

function Dashboard({ user, onLogout, onNewDownload }) {
  const [activePanel, setActivePanel] = useState('tasks');

  const panels = [
    { id: 'tasks', label: '任务中心', icon: '📥' },
    { id: 'history', label: '下载历史', icon: '📁' },
    { id: 'tools', label: '工具箱', icon: '🔧' },
    { id: 'schedule', label: '定时下载', icon: '⏰' },
    { id: 'account', label: '我的账户', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1D1C1C] flex flex-col">
      {/* Dashboard Header */}
      <header className="px-6 py-4 bg-white border-b-2 border-[#1D1C1C] flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <a href="#/" className="text-lg font-extrabold text-[#1D1C1C] tracking-tight hover:text-[#CC0066] transition-colors">
            SnapVid
          </a>
          <span className="text-sm font-bold text-[#6B6B6B]">/ 控制台</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNewDownload}
            className="btn-accent text-sm py-2.5 px-5"
          >
            + 新建下载
          </button>
          {user?.plan === 'pro' && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF48D] border-2 border-[#1D1C1C]">
              PRO
            </span>
          )}
          <button onClick={onLogout} className="text-sm text-[#6B6B6B] hover:text-[#1D1C1C] font-semibold transition-colors">
            退出
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r-2 border-[#E8E8E8] bg-white py-6 flex-shrink-0 hidden sm:block">
          <nav className="space-y-1 px-4">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  activePanel === panel.id
                    ? 'bg-[#FFF48D] border-2 border-[#1D1C1C] text-[#1D1C1C]'
                    : 'text-[#6B6B6B] hover:bg-gray-50 hover:text-[#1D1C1C] border-2 border-transparent'
                }`}
              >
                <span className="text-lg">{panel.icon}</span>
                {panel.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1D1C1C] z-40">
          <div className="flex justify-around py-2">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
                  activePanel === panel.id
                    ? 'text-[#1D1C1C] bg-[#FFF48D]'
                    : 'text-[#6B6B6B]'
                }`}
              >
                <span className="text-lg">{panel.icon}</span>
                <span className="text-[10px] font-bold">{panel.label}</span>
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
