import React, { useState, useEffect, useRef } from 'react';

function Toolbox() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedTaskInfo, setSelectedTaskInfo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  // Tool configs
  const [convertFormat, setConvertFormat] = useState('mp4');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('192');
  const [compressQuality, setCompressQuality] = useState('medium');
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [wmText, setWmText] = useState('');
  const [wmPosition, setWmPosition] = useState('bottomright');
  const [subtitleLang, setSubtitleLang] = useState('auto');
  const [subtitleFormat, setSubtitleFormat] = useState('srt');
  const [separateMode, setSeparateMode] = useState('vocals');

  // AI state
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiTokens, setAiTokens] = useState(null);
  const [aiCost, setAiCost] = useState(null);
  const [aiConfigured, setAiConfigured] = useState(null); // null=checking, true/false
  const [copyFeedback, setCopyFeedback] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=50`)
      .then(r => r.json()).then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
      }).catch(() => {});
  }, []);

  // Check AI configuration on mount
  useEffect(() => {
    checkAiConfig();
  }, []);

  const checkAiConfig = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/ai/chat?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'ping' }),
      });
      const data = await res.json();
      // If response is 403 (auth) but not about config, AI is configured but needs auth
      // If error contains "未配置" or config message, then not configured
      const errorMsg = data.detail || data.error || '';
      if (errorMsg && errorMsg.includes('未配置')) {
        setAiConfigured(false);
      } else if (errorMsg && errorMsg.includes('登录')) {
        setAiConfigured(true); // configured, just need login
      } else if (data.success !== undefined) {
        setAiConfigured(true);
      } else if (res.status === 403) {
        setAiConfigured(true); // configured, just auth issue
      } else {
        setAiConfigured(true);
      }
    } catch {
      setAiConfigured(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatHistory]);

  const selectFile = (task) => {
    setSelectedTask(task.id);
    setSelectedTaskInfo(task);
    setResult(null);
    setError('');
  };

  const execute = async (toolId, params = '') => {
    if (!selectedTask) { setError('请先选择文件'); return; }
    setProcessing(true);
    setResult(null);
    setError('');

    const baseParams = `task_id=${selectedTask}`;
    let url = '';

    switch (toolId) {
      case 'convert': url = `/api/tools/convert?${baseParams}&target_format=${convertFormat}`; break;
      case 'audio': url = `/api/tools/audio-extract?${baseParams}&audio_format=${audioFormat}&quality=${audioQuality}`; break;
      case 'compress': url = `/api/tools/compress?${baseParams}&quality=${compressQuality}`; break;
      case 'gif': url = `/api/tools/gif?${baseParams}&start=${gifStart}&duration=${gifDuration}&fps=15&width=480`; break;
      case 'thumbnail': url = `/api/tools/thumbnail?${baseParams}&time_pos=00:00:01`; break;
      case 'watermark': url = `/api/tools/watermark?${baseParams}&text=${encodeURIComponent(wmText||'SnapVid')}&position=${wmPosition}`; break;
      case 'denoise': url = `/api/tools/denoise?${baseParams}`; break;
      case 'subtitle': url = `/api/tools/subtitle?${baseParams}&language=${subtitleLang}&format=${subtitleFormat}`; break;
      case 'separate': url = `/api/tools/audio-separate?${baseParams}&mode=${separateMode}`; break;
      case 'summary': url = `/api/tools/summary?${baseParams}`; break;
      case 'removebg': url = `/api/tools/remove-bg?${baseParams}&mode=video`; break;
      default: setError('功能开发中'); setProcessing(false); return;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.registered_task_id) {
          const token = localStorage.getItem('snapvid_token') || '';
          fetch(`/api/downloads?token=${token}&limit=50`)
            .then(r => r.json()).then(d => setTasks(d.filter(t => t.status === 'completed' && t.filename)))
            .catch(() => {});
        }
      } else {
        setError(data.detail || '处理失败');
      }
    } catch (e) { setError('网络错误'); }
    setProcessing(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024*1024) return `${(bytes/1024*1024).toFixed(1)}MB`;
    return `${(bytes/1024).toFixed(0)}KB`;
  };

  // --- AI helpers ---

  const aiApiCall = async (endpoint, body) => {
    const token = localStorage.getItem('snapvid_token') || '';
    setAiProcessing(true);
    setAiError('');
    setAiResult('');
    setAiTokens(null);
    setAiCost(null);

    try {
      const res = await fetch(`/api/ai/${endpoint}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.detail || data.error || 'AI 调用失败';
        if (errMsg.includes('未配置') || errMsg.includes('DEEPSEEK_API_KEY')) {
          setAiConfigured(false);
        }
        if (errMsg.includes('登录')) {
          setAiError('请先登录后使用 AI 功能');
        } else {
          setAiError(errMsg);
        }
        setAiProcessing(false);
        return;
      }

      if (data.success) {
        setAiResult(data.data);
        if (data.tokens_used) setAiTokens(data.tokens_used);
        if (data.cost_estimate !== undefined) setAiCost(data.cost_estimate);
      } else {
        setAiError(data.error || 'AI 调用失败');
      }
    } catch {
      setAiError('网络错误，请检查后端连接');
    }
    setAiProcessing(false);
  };

  const handleAiChat = async () => {
    const input = aiChatInput.trim();
    if (!input) return;

    const newHistory = [...aiChatHistory, { role: 'user', content: input }];
    setAiChatHistory(newHistory);
    setAiChatInput('');

    setAiProcessing(true);
    setAiError('');

    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/ai/chat?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.detail || data.error || 'AI 调用失败';
        if (errMsg.includes('未配置') || errMsg.includes('DEEPSEEK_API_KEY')) setAiConfigured(false);
        setAiChatHistory([...newHistory, { role: 'assistant', content: '', error: errMsg }]);
        setAiProcessing(false);
        return;
      }

      if (data.success) {
        setAiChatHistory([...newHistory, { role: 'assistant', content: data.data }]);
        if (data.tokens_used) setAiTokens(data.tokens_used);
        if (data.cost_estimate !== undefined) setAiCost(data.cost_estimate);
      } else {
        setAiChatHistory([...newHistory, { role: 'assistant', content: '', error: data.error || 'AI 调用失败' }]);
      }
    } catch {
      setAiChatHistory([...newHistory, { role: 'assistant', content: '', error: '网络错误' }]);
    }
    setAiProcessing(false);
  };

  const buildVideoInfo = () => {
    if (!selectedTaskInfo) return {};
    return {
      title: selectedTaskInfo.title || '',
      description: selectedTaskInfo.description || '',
      uploader: selectedTaskInfo.uploader || '',
      platform: selectedTaskInfo.platform || '',
      duration_string: selectedTaskInfo.duration_string || '',
    };
  };

  const handleAiQuickAction = async (action) => {
    const videoInfo = buildVideoInfo();
    switch (action) {
      case 'summary':
        await aiApiCall('summary', { video_info: videoInfo, context: '' });
        break;
      case 'copywriting':
        setAiResult('');
        setAiError('');
        await aiApiCall('copywriting', { video_info: videoInfo, style: 'social' });
        break;
      case 'tags':
        await aiApiCall('tags', { video_info: videoInfo, count: 5 });
        break;
    }
  };

  const handleCopyResult = () => {
    const text = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }).catch(() => {});
  };

  // Simple markdown → HTML converter
  const renderMarkdown = (md) => {
    if (!md || typeof md !== 'string') return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>${code.trim()}</code></pre>`
    );
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs text-[#1D1C1C]">$1</code>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-[#1D1C1C] mt-3 mb-1">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-[#1D1C1C] mt-3 mb-1">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-[#1D1C1C] mt-3 mb-1">$1</h2>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="my-3 border-gray-200" />');
    // Unordered list items
    html = html.replace(/^- (.+)$/gm, '<li class="text-sm text-[#1D1C1C] ml-4 list-disc">$1</li>');
    // Numbered list items
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-[#1D1C1C] ml-4 list-decimal">$1</li>');
    // Paragraphs — join consecutive non-empty, non-tag lines
    html = html.replace(/\n\n+/g, '</p><p class="text-sm text-[#1D1C1C] leading-relaxed mb-2">');
    html = '<p class="text-sm text-[#1D1C1C] leading-relaxed mb-2">' + html + '</p>';
    // Clean up empty paragraphs
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

    return html;
  };

  const formatCost = (cost) => {
    if (cost === null || cost === undefined) return null;
    if (cost < 0.01) return '< $0.01';
    return `$${cost.toFixed(4)}`;
  };

  const clearAiChat = () => {
    setAiChatHistory([]);
    setAiResult('');
    setAiError('');
    setAiTokens(null);
    setAiCost(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 pb-5">
        <h2 className="text-2xl font-extrabold text-[#1D1C1C]">工具箱</h2>
        <p className="text-sm text-[#4A4A4A] mt-1 font-medium">选择已下载的文件，一键处理</p>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-5">
        {/* ===== AI Assistant Card ===== */}
        {aiConfigured === null ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#1D1C1C]/30 border-t-[#1D1C1C] rounded-full animate-spin" />
            <span className="text-sm text-[#4A4A4A] font-medium">检查 AI 服务状态...</span>
          </div>
        ) : aiConfigured === false ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#4A4A4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[#1D1C1C] font-bold">AI 助手不可用</p>
            </div>
            <p className="text-sm text-[#4A4A4A] font-medium">
              请在环境变量中配置 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">DEEPSEEK_API_KEY</code> 后重启服务。
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#1D1C1C] rounded-xl overflow-hidden">
            {/* AI Card Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#1D1C1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104a24.237 24.237 0 01.75.082m-.75 0a24.427 24.427 0 00-4.5 0" />
                </svg>
                <h3 className="text-sm text-[#1D1C1C] font-bold">AI 助手</h3>
                {aiProcessing && (
                  <div className="w-3.5 h-3.5 border-2 border-[#1D1C1C]/30 border-t-[#1D1C1C] rounded-full animate-spin ml-2" />
                )}
              </div>
              {(aiChatHistory.length > 0 || aiResult) && (
                <button onClick={clearAiChat}
                  className="text-xs text-[#4A4A4A] font-medium hover:text-[#1D1C1C] transition-colors">
                  清空对话
                </button>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#4A4A4A] font-medium mr-1 shrink-0">快捷操作:</span>
              <button onClick={() => handleAiQuickAction('summary')} disabled={aiProcessing || !selectedTask}
                className="text-xs font-bold text-[#1D1C1C] bg-[#FFF48D] border border-[#1D1C1C] px-3 py-1.5 rounded-full
                  hover:bg-[#f5e840] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                生成摘要
              </button>
              <button onClick={() => handleAiQuickAction('copywriting')} disabled={aiProcessing || !selectedTask}
                className="text-xs font-bold text-[#1D1C1C] bg-white border border-[#1D1C1C] px-3 py-1.5 rounded-full
                  hover:bg-[#FFF48D] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                生成文案
              </button>
              <button onClick={() => handleAiQuickAction('tags')} disabled={aiProcessing || !selectedTask}
                className="text-xs font-bold text-[#1D1C1C] bg-white border border-[#1D1C1C] px-3 py-1.5 rounded-full
                  hover:bg-[#FFF48D] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                智能标签
              </button>
              {!selectedTask && (
                <span className="text-[11px] text-[#4A4A4A] ml-1">(请先选择一个文件)</span>
              )}
            </div>

            {/* Chat history + Result display */}
            <div className="max-h-[280px] overflow-y-auto px-5 py-3 space-y-3">
              {/* Free-form chat history */}
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#1D1C1C] text-white'
                      : 'bg-gray-100 text-[#1D1C1C] border border-[#E8E8E8]'
                  }`}>
                    {msg.error ? (
                      <p className="text-sm text-red-600">{msg.error}</p>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    )}
                  </div>
                </div>
              ))}
              {/* Quick-action result (non-chat mode) */}
              {aiResult && aiChatHistory.length === 0 && (
                <div className="bg-gray-50 border border-[#E8E8E8] rounded-xl p-4">
                  {Array.isArray(aiResult) ? (
                    <div className="flex flex-wrap gap-2">
                      {aiResult.map((tag, i) => (
                        <span key={i} className="text-sm font-bold text-[#1D1C1C] bg-[#FFF48D] border border-[#1D1C1C] px-3 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[#1D1C1C] whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(aiResult) }} />
                  )}
                </div>
              )}
              {/* Error */}
              {aiError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-medium">{aiError}</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer: input + controls */}
            <div className="px-5 py-3 border-t border-gray-100 space-y-2">
              {/* Quick-action result controls */}
              {aiResult && !aiProcessing && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-[#4A4A4A] font-medium">
                    {aiTokens && (
                      <span>Tokens: 输入 {aiTokens.prompt_tokens} + 输出 {aiTokens.completion_tokens}</span>
                    )}
                    {aiCost !== null && (
                      <span className="text-[#1D1C1C] font-bold">费用: {formatCost(aiCost)}</span>
                    )}
                  </div>
                  <button onClick={handleCopyResult}
                    className="text-xs font-bold text-[#1D1C1C] bg-white border border-[#1D1C1C] px-3 py-1.5 rounded-full
                      hover:bg-[#FFF48D] transition-all active:scale-[0.97]">
                    {copyFeedback ? '已复制' : '复制结果'}
                  </button>
                </div>
              )}
              {/* Chat footer with cost info */}
              {aiChatHistory.length > 0 && aiTokens && (
                <div className="flex items-center gap-4 text-xs text-[#4A4A4A] font-medium">
                  <span>Tokens: 输入 {aiTokens.prompt_tokens} + 输出 {aiTokens.completion_tokens}</span>
                  {aiCost !== null && (
                    <span className="text-[#1D1C1C] font-bold">费用: {formatCost(aiCost)}</span>
                  )}
                </div>
              )}
              {/* Chat input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiChat(); } }}
                  placeholder="输入消息，与 AI 对话..."
                  disabled={aiProcessing}
                  className="flex-1 text-sm px-4 py-2.5 bg-white border border-[#1D1C1C] rounded-full
                    text-[#1D1C1C] placeholder-[#4A4A4A] outline-none focus:border-[#1D1C1C] focus:ring-1 focus:ring-[#1D1C1C]
                    disabled:opacity-50 transition-all"
                />
                <button onClick={handleAiChat} disabled={aiProcessing || !aiChatInput.trim()}
                  className="text-sm font-bold text-white bg-[#1D1C1C] px-5 py-2.5 rounded-full
                    hover:opacity-80 transition-all disabled:opacity-30 disabled:cursor-not-allowed
                    active:scale-[0.97] shrink-0">
                  发送
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== File List + Tools (existing layout) ===== */}
        <div className="flex gap-5 min-h-0" style={{ minHeight: '300px' }}>
          {/* Left: File List */}
          <div className="w-64 shrink-0 flex flex-col bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-200">
              <p className="text-sm text-[#1D1C1C] font-bold">我的文件</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-[#4A4A4A] font-medium p-4">暂无已下载文件</p>
              ) : tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => selectFile(task)}
                  className={`px-4 py-3.5 cursor-pointer border-b border-gray-100 transition-all duration-200 ${
                    selectedTask === task.id
                      ? 'bg-[#FFF48D] border-l-2 border-l-[#1D1C1C]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm text-[#1D1C1C] font-semibold truncate">{task.title || task.filename}</p>
                  <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">{formatSize(task.filesize)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tools + Result */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-5">
            {!selectedTask ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-base text-[#4A4A4A] font-medium">选择一个文件开始操作</p>
              </div>
            ) : (
              <>
                {/* Video Preview */}
                <div className="bg-white border border-[#1D1C1C] rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={`/api/editor/stream/${selectedTask}`}
                    controls
                    preload="metadata"
                    className="w-full max-h-[240px] object-contain bg-black/5"
                  />
                  <div className="px-5 py-3.5 flex items-center gap-3 border-t border-gray-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#1D1C1C] font-bold truncate">{selectedTaskInfo?.title || ''}</p>
                      <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">{formatSize(selectedTaskInfo?.filesize)}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="space-y-3">
                  <p className="text-sm text-[#1D1C1C] font-bold">快捷操作</p>
                  <div className="grid grid-cols-4 gap-3">
                    <QuickAction label="转MP4" onClick={() => { setConvertFormat('mp4'); execute('convert'); }} disabled={processing} />
                    <QuickAction label="提取音频" onClick={() => execute('audio')} disabled={processing} />
                    <QuickAction label="截封面" onClick={() => execute('thumbnail')} disabled={processing} />
                    <QuickAction label="压缩" onClick={() => execute('compress')} disabled={processing} pro />
                    <QuickAction label="转GIF" onClick={() => execute('gif')} disabled={processing} />
                    <QuickAction label="视频信息" onClick={() => execute('summary')} disabled={processing} />
                    <QuickAction label="AI字幕" onClick={() => execute('subtitle')} disabled={processing} pro />
                    <QuickAction label="人声分离" onClick={() => execute('separate')} disabled={processing} pro />
                  </div>
                </div>

                {/* Advanced Tools (collapsible) */}
                <details className="group">
                  <summary className="text-sm text-[#4A4A4A] font-medium cursor-pointer hover:text-[#1D1C1C] transition-colors list-none flex items-center gap-1.5 py-1">
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    更多工具和配置
                  </summary>
                  <div className="mt-3 bg-white border border-[#E8E8E8] rounded-xl p-5 space-y-4">
                    <ToolRow label="格式转换" onExecute={() => execute('convert')} disabled={processing}>
                      <select value={convertFormat} onChange={e => setConvertFormat(e.target.value)} className="tool-select">
                        <option value="mp4">MP4</option><option value="mkv">MKV</option>
                        <option value="webm">WebM</option><option value="mov">MOV</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="音频提取" onExecute={() => execute('audio')} disabled={processing}>
                      <select value={audioFormat} onChange={e => setAudioFormat(e.target.value)} className="tool-select">
                        <option value="mp3">MP3</option><option value="m4a">M4A</option>
                        <option value="flac">FLAC</option><option value="wav">WAV</option>
                      </select>
                      <select value={audioQuality} onChange={e => setAudioQuality(e.target.value)} className="tool-select">
                        <option value="320">320kbps</option><option value="192">192kbps</option><option value="128">128kbps</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="视频转GIF" onExecute={() => execute('gif')} disabled={processing}>
                      <input type="text" value={gifStart} onChange={e => setGifStart(e.target.value)}
                        placeholder="起始 00:00:00" className="tool-input w-24" />
                      <input type="text" value={gifDuration} onChange={e => setGifDuration(e.target.value)}
                        placeholder="时长(秒)" className="tool-input w-16" />
                    </ToolRow>

                    <ToolRow label="视频压缩" onExecute={() => execute('compress')} disabled={processing} pro>
                      <select value={compressQuality} onChange={e => setCompressQuality(e.target.value)} className="tool-select">
                        <option value="high">轻度(画质优先)</option>
                        <option value="medium">中度(均衡)</option>
                        <option value="low">重度(体积优先)</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="添加水印" onExecute={() => execute('watermark')} disabled={processing} pro>
                      <input type="text" value={wmText} onChange={e => setWmText(e.target.value)}
                        placeholder="水印文字" className="tool-input w-24" />
                      <select value={wmPosition} onChange={e => setWmPosition(e.target.value)} className="tool-select">
                        <option value="bottomright">右下</option><option value="topleft">左上</option>
                        <option value="center">居中</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="音频降噪" onExecute={() => execute('denoise')} disabled={processing} pro />

                    <ToolRow label="AI字幕" onExecute={() => execute('subtitle')} disabled={processing} pro>
                      <select value={subtitleLang} onChange={e => setSubtitleLang(e.target.value)} className="tool-select">
                        <option value="auto">自动</option><option value="zh">中文</option>
                        <option value="en">英文</option><option value="ja">日文</option>
                      </select>
                      <select value={subtitleFormat} onChange={e => setSubtitleFormat(e.target.value)} className="tool-select">
                        <option value="srt">SRT</option><option value="vtt">VTT</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="人声分离" onExecute={() => execute('separate')} disabled={processing} pro>
                      <select value={separateMode} onChange={e => setSeparateMode(e.target.value)} className="tool-select">
                        <option value="vocals">提取人声</option><option value="music">提取BGM</option>
                      </select>
                    </ToolRow>

                    <ToolRow label="AI去背景" onExecute={() => execute('removebg')} disabled={processing} pro>
                      <span className="text-xs text-[#4A4A4A] font-medium">30秒片段以内</span>
                    </ToolRow>
                  </div>
                </details>

                {/* Processing indicator */}
                {processing && (
                  <div className="flex items-center gap-3 px-5 py-4 bg-white border border-[#E8E8E8] rounded-xl">
                    <div className="w-4 h-4 border-2 border-[#1D1C1C]/30 border-t-[#1D1C1C] rounded-full animate-spin" />
                    <span className="text-sm text-[#1D1C1C] font-medium">处理中...</span>
                  </div>
                )}

                {/* Result */}
                {result && (
                  <div className="p-5 rounded-xl bg-[#83f582]/10 border border-[#1D1C1C] space-y-4">
                    <p className="text-sm text-[#1D1C1C] font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#83f582] flex items-center justify-center text-xs font-bold">&#x2713;</span>
                      {result.message}
                    </p>
                    {result.registered_task_id && (
                      <p className="text-xs text-[#4A4A4A] font-medium">已加入文件列表，可继续用其他工具处理</p>
                    )}
                    {result.output_filename && result.output_filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) && (
                      <img src={`/api/tools/preview/${encodeURIComponent(result.output_filename)}`} alt=""
                        className="rounded-lg max-h-[200px] object-contain border border-[#1D1C1C]" />
                    )}
                    {result.summary && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(result.summary).map(([k, v]) => (
                          <div key={k} className="flex justify-between px-3 py-2.5 bg-white rounded-lg text-xs border border-gray-200">
                            <span className="text-[#4A4A4A] font-medium">{k}</span>
                            <span className="text-[#1D1C1C] font-bold">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-[#4A4A4A] font-medium">
                        {result.output_filename && formatSize(result.output_size)}
                      </span>
                      {result.output_filename && (
                        <a href={`/api/tools/download/${encodeURIComponent(result.output_filename)}`} download
                          className="text-sm font-bold text-white bg-[#1D1C1C] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
                          下载文件
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-5 py-4 rounded-xl bg-red-50 border border-red-300">
                    <p className="text-sm text-red-700 font-bold">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, onClick, disabled, pro }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl
        bg-white border border-[#1D1C1C] text-[#1D1C1C]
        hover:bg-[#FFF48D] hover:border-[#1D1C1C]
        transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
        active:scale-[0.97]">
      <span className="text-sm font-bold">{label}</span>
      {pro && <span className="text-[10px] font-bold text-[#4A4A4A] bg-[#FFF48D] border border-[#1D1C1C] px-1.5 py-0.5 rounded-full">PRO</span>}
    </button>
  );
}

function ToolRow({ label, children, onExecute, disabled, pro }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-200 last:border-0">
      <span className="text-sm text-[#1D1C1C] font-semibold w-20 shrink-0">{label}</span>
      {pro && <span className="text-[10px] font-bold text-[#1D1C1C] bg-[#FFF48D] border border-[#1D1C1C] px-1.5 py-0.5 rounded-full">PRO</span>}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
      </div>
      <button onClick={onExecute} disabled={disabled}
        className="text-xs font-bold text-white bg-[#1D1C1C] px-4 py-2 rounded-full
          hover:opacity-80 transition-all disabled:opacity-30 shrink-0
          active:scale-[0.97]">
        执行
      </button>
    </div>
  );
}

export default Toolbox;
