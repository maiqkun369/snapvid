import React, { useState, useEffect } from 'react';

function HistoryPanel() {
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/downloads?token=${token}&page=${page}&limit=20`);
      if (res.ok) setTasks(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [page]);

  const handleDelete = async (taskId) => {
    await fetch(`/api/downloads/${taskId}`, { method: 'DELETE' });
    fetchHistory();
  };

  const handleDownload = (taskId) => {
    window.open(`/api/downloads/${taskId}/file`, '_blank');
  };

  if (loading) return <div className="text-center py-12 text-[#4A4A4A] font-medium">加载中...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-[#1D1C1C]">下载历史</h2>
        <span className="text-sm font-medium text-[#4A4A4A]">{tasks.length} 条记录</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-14 bg-white border border-[#E8E8E8] rounded-xl">
          <p className="text-[#4A4A4A] font-medium">暂无下载记录</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
          {tasks.map((task, idx) => (
            <div key={task.id} className={`flex items-center justify-between px-6 py-5 ${
              idx < tasks.length - 1 ? 'border-b border-gray-200' : ''
            }`}>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-[#1D1C1C] truncate">{task.title || '未知'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border border-[#1D1C1C] ${
                    task.status === 'completed' ? 'bg-[#83f582] text-[#1D1C1C]' :
                    task.status === 'failed' ? 'bg-[#fd97fd] text-[#1D1C1C]' :
                    task.status === 'downloading' ? 'bg-[#7af7f7] text-[#1D1C1C]' :
                    'bg-gray-100 text-[#1D1C1C]'
                  }`}>
                    {task.status === 'completed' ? '完成' : task.status === 'failed' ? '失败' : task.status === 'downloading' ? '下载中' : '等待'}
                  </span>
                  <span className="text-sm font-medium text-[#4A4A4A]">
                    {task.filesize ? `${(task.filesize / 1024 / 1024).toFixed(1)} MB` : '--'}
                  </span>
                  <span className="text-sm font-medium text-[#4A4A4A]">{task.created_at?.split('T')[0] || ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {task.status === 'completed' && (
                  <button onClick={() => handleDownload(task.id)}
                    className="text-sm font-bold text-white bg-[#1D1C1C] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
                    下载
                  </button>
                )}
                <button onClick={() => handleDelete(task.id)}
                  className="text-sm font-medium text-[#4A4A4A] hover:text-red-600 px-3 py-2 rounded-full hover:bg-red-50 transition-all">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="text-sm font-bold text-[#1D1C1C] px-5 py-2.5 rounded-full border border-[#1D1C1C] hover:bg-[#FFF48D] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          上一页
        </button>
        <span className="text-sm font-medium text-[#4A4A4A]">第 {page} 页</span>
        <button onClick={() => setPage(page + 1)} disabled={tasks.length < 20}
          className="text-sm font-bold text-[#1D1C1C] px-5 py-2.5 rounded-full border border-[#1D1C1C] hover:bg-[#FFF48D] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          下一页
        </button>
      </div>
    </div>
  );
}

export default HistoryPanel;
