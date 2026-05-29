import React, { useState, useEffect } from 'react';

function TaskCenter() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch(`/api/tasks/active?token=${token}`),
        fetch(`/api/downloads?token=${token}&limit=5`),
      ]);
      if (activeRes.ok) setActiveTasks(await activeRes.json());
      if (historyRes.ok) {
        const all = await historyRes.json();
        setRecentCompleted(all.filter(t => t.status === 'completed').slice(0, 5));
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (taskId) => {
    await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
    fetchTasks();
  };

  const handleDownloadFile = (taskId, filename) => {
    window.open(`/api/downloads/${taskId}/file`, '_blank');
  };

  if (loading) return <div className="text-center py-12 text-[#4A4A4A] font-medium">加载中...</div>;

  return (
    <div className="space-y-8">
      {/* Active Downloads */}
      <section>
        <h2 className="text-2xl font-extrabold text-[#1D1C1C] mb-4">
          活跃任务
          {activeTasks.length > 0 && (
            <span className="ml-3 text-sm font-bold text-[#4A4A4A]">{activeTasks.length} 进行中</span>
          )}
        </h2>

        {activeTasks.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E8E8E8] rounded-xl">
            <p className="text-[#4A4A4A] text-sm font-medium">没有进行中的下载任务</p>
            <a href="#/" className="text-sm font-bold text-[#1D1C1C] hover:opacity-60 mt-2 inline-block transition-opacity">
              去首页新建下载
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-white border border-[#E8E8E8] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-[#1D1C1C] truncate">{task.title || '获取中...'}</p>
                    <p className="text-sm font-medium text-[#4A4A4A] mt-0.5 truncate">{task.url?.slice(0, 50)}{task.url?.length > 50 ? '...' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-xs px-3 py-1 rounded-full font-bold border border-[#1D1C1C] bg-[#7af7f7] text-[#1D1C1C]">
                      {task.title === '获取中...' ? '解析中' : '下载中'}
                    </span>
                    <button onClick={() => handleCancel(task.id)}
                      className="text-sm font-medium text-[#4A4A4A] hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all">
                      取消
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-[#1D1C1C] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(task.progress || 0, 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-[#1D1C1C] w-14 text-right">{(task.progress || 0).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-sm font-medium text-[#4A4A4A]">
                  <span>{task.speed || '--'}</span>
                  <span>{task.eta || '--'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Completed */}
      <section>
        <h2 className="text-2xl font-extrabold text-[#1D1C1C] mb-4">最近完成</h2>
        {recentCompleted.length === 0 ? (
          <p className="text-sm text-[#4A4A4A] font-medium text-center py-6">暂无已完成的下载</p>
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
            {recentCompleted.map((task, idx) => (
              <div key={task.id} className={`flex items-center justify-between px-6 py-5 ${
                idx < recentCompleted.length - 1 ? 'border-b border-gray-200' : ''
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-[#1D1C1C] truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs px-3 py-1 rounded-full font-bold border border-[#1D1C1C] bg-[#83f582] text-[#1D1C1C]">
                      完成
                    </span>
                    <span className="text-sm font-medium text-[#4A4A4A]">
                      {task.filesize ? `${(task.filesize / 1024 / 1024).toFixed(1)} MB` : '--'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDownloadFile(task.id, task.filename)}
                  className="text-sm font-bold text-white bg-[#1D1C1C] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
                  下载
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TaskCenter;
