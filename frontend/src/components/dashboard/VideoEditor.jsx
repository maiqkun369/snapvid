import React, { useState, useEffect } from 'react';

function VideoEditor() {
  const [materials, setMaterials] = useState([]);
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename &&
          /\.(mp4|mkv|webm|mov)$/i.test(t.filename));
        setMaterials(completed);
      });
  }, []);

  // Check if editor service is running
  useEffect(() => {
    fetch('/editor/')
      .then(r => {
        if (r.ok || r.status === 200) setEditorReady(true);
        else setEditorError('编辑器服务未启动');
      })
      .catch(() => setEditorError('编辑器服务未启动'));
  }, []);

  const openInEditor = (taskId) => {
    // Open video in the full editor with the file URL as parameter
    const videoUrl = `${window.location.origin}/api/editor/stream/${taskId}`;
    window.open(`/editor/?video=${encodeURIComponent(videoUrl)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white/80 mb-2">在线剪辑</h2>
        <p className="text-sm text-white/30">选择视频进入专业编辑器，支持多轨道、帧级剪辑、特效转场</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a href="/editor/" target="_blank" rel="noopener"
          className="flex-1 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20
            hover:border-cyan-500/40 transition-all text-center">
          <p className="text-sm text-white/70 font-medium">打开空白项目</p>
          <p className="text-xs text-white/30 mt-1">从零开始创建</p>
        </a>
        <a href="/editor/" target="_blank" rel="noopener"
          className="flex-1 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all text-center">
          <p className="text-sm text-white/70 font-medium">上传素材剪辑</p>
          <p className="text-xs text-white/30 mt-1">直接上传文件编辑</p>
        </a>
      </div>

      {/* Materials Grid */}
      <div>
        <p className="text-xs text-white/40 mb-3">已下载的视频素材 · 点击进入编辑器</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {materials.map(m => (
            <button key={m.id}
              onClick={() => openInEditor(m.id)}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
            >
              {/* Thumbnail */}
              <div className="aspect-video rounded-lg bg-black/30 mb-2 overflow-hidden flex items-center justify-center">
                <video src={`/api/editor/stream/${m.id}`} className="w-full h-full object-cover" muted preload="metadata"
                  onLoadedMetadata={(e) => { e.target.currentTime = 1; }} />
              </div>
              <p className="text-xs text-white/60 truncate">{m.title || m.filename}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{m.filesize ? `${(m.filesize / 1024 / 1024).toFixed(1)} MB` : ''}</p>
            </button>
          ))}
          {materials.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <p className="text-white/30">暂无视频素材</p>
              <p className="text-white/20 text-xs mt-1">先在首页下载视频</p>
            </div>
          )}
        </div>
      </div>

      {/* Inline Editor (iframe when available) */}
      {editorReady && (
        <div className="rounded-xl overflow-hidden border border-white/[0.08]" style={{height: '600px'}}>
          <iframe src="/editor/" className="w-full h-full border-0" allow="autoplay; fullscreen" />
        </div>
      )}

      {/* Fallback: show our simple editor if external not available */}
      {editorError && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-white/40 mb-2">提示：专业编辑器服务未启动</p>
          <p className="text-xs text-white/25">
            需要部署 designcombo/react-video-editor 到 /editor/ 路径。
            当前可使用基础工具箱中的裁剪/转码/拼接功能作为替代。
          </p>
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = '#/dashboard'; document.querySelector('[data-panel="tools"]')?.click(); }}
            className="text-xs text-cyan-400/60 hover:text-cyan-300 mt-2 inline-block">
            → 前往工具箱
          </a>
        </div>
      )}
    </div>
  );
}

export default VideoEditor;
