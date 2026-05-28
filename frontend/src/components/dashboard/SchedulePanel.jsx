import React, { useState, useEffect } from 'react';

function SchedulePanel() {
  const [schedules, setSchedules] = useState([]);
  const [url, setUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [message, setMessage] = useState('');

  const fetchSchedules = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/schedule?token=${token}`);
      if (res.ok) setSchedules(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleAdd = async () => {
    if (!url || !scheduledAt) { setMessage('请填写链接和时间'); return; }
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/schedule?token=${token}&url=${encodeURIComponent(url)}&scheduled_at=${scheduledAt}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('定时任务已创建');
        setUrl('');
        setScheduledAt('');
        fetchSchedules();
      } else {
        setMessage(data.detail || '创建失败');
      }
    } catch (e) { setMessage('网络错误'); }
  };

  const handleCancel = async (id) => {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white/80 mb-2">定时下载</h2>
        <p className="text-sm text-white/30">设定时间自动下载，适合大文件避开高峰期</p>
      </div>

      {/* Add new schedule */}
      <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="视频链接"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-cyan-500/30" />
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-cyan-500/30" />
        <button onClick={handleAdd} disabled={!url || !scheduledAt}
          className="w-full py-2.5 bg-white text-gray-900 text-sm font-medium rounded-xl
            hover:scale-[1.01] transition-all disabled:opacity-30">
          添加定时任务
        </button>
        {message && <p className="text-xs text-emerald-400/70">{message}</p>}
      </div>

      {/* Schedule list */}
      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-8">暂无定时任务</p>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/60 truncate">{s.url}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    s.status === 'pending' ? 'bg-amber-500/10 text-amber-400/70' :
                    s.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400/70' :
                    'bg-white/[0.05] text-white/30'
                  }`}>
                    {s.status === 'pending' ? '等待中' : s.status === 'executed' ? '已执行' : '已取消'}
                  </span>
                  <span className="text-xs text-white/25">{s.scheduled_at?.replace('T', ' ')?.slice(0, 16)}</span>
                </div>
              </div>
              {s.status === 'pending' && (
                <button onClick={() => handleCancel(s.id)}
                  className="text-xs text-white/25 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors ml-2">
                  取消
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SchedulePanel;
