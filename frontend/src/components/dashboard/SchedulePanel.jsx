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
        <h2 className="text-2xl font-extrabold text-[#1D1C1C] mb-2">定时下载</h2>
        <p className="text-sm font-medium text-[#4A4A4A]">设定时间自动下载，适合大文件避开高峰期</p>
      </div>

      {/* Add new schedule */}
      <div className="bg-white border border-[#1D1C1C] rounded-lg p-5 space-y-3">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="视频链接"
          className="w-full border border-[#1D1C1C] rounded-full px-5 py-3 text-sm font-medium
            text-[#1D1C1C] focus:outline-none focus:ring-2 focus:ring-[#FFF48D] placeholder-gray-400" />
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full border border-[#1D1C1C] rounded-full px-5 py-3 text-sm font-medium
            text-[#1D1C1C] focus:outline-none focus:ring-2 focus:ring-[#FFF48D]" />
        <button onClick={handleAdd} disabled={!url || !scheduledAt}
          className="w-full py-3 rounded-full bg-[#1D1C1C] text-white text-sm font-bold
            hover:bg-[#333] transition-all active:scale-[0.97] disabled:opacity-30">
          添加定时任务
        </button>
        {message && <p className="text-sm font-bold text-[#83f582]">{message}</p>}
      </div>

      {/* Schedule list */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <p className="text-base font-medium text-[#4A4A4A] text-center py-10">暂无定时任务</p>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 bg-white border border-[#1D1C1C] rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1D1C1C] truncate">{s.url}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border border-[#1D1C1C] ${
                    s.status === 'pending' ? 'bg-[#FFF48D] text-[#1D1C1C]' :
                    s.status === 'executed' ? 'bg-[#83f582] text-[#1D1C1C]' :
                    'bg-gray-100 text-[#4A4A4A]'
                  }`}>
                    {s.status === 'pending' ? '等待中' : s.status === 'executed' ? '已执行' : '已取消'}
                  </span>
                  <span className="text-xs font-medium text-[#4A4A4A]">{s.scheduled_at?.replace('T', ' ')?.slice(0, 16)}</span>
                </div>
              </div>
              {s.status === 'pending' && (
                <button onClick={() => handleCancel(s.id)}
                  className="text-sm font-bold text-[#4A4A4A] hover:text-[#CC0066] px-3 py-1.5 rounded-full
                    hover:bg-red-50 transition-all ml-2">
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
