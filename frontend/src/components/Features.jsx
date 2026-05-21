import React from 'react';

function Features() {
  const sections = [
    {
      title: '基础能力',
      tag: 'FREE',
      tagColor: 'text-emerald-400 bg-emerald-400/10',
      items: [
        { icon: '🌐', text: '1000+ 平台解析' },
        { icon: '🎬', text: '1080P 高清下载' },
        { icon: '📦', text: 'MP4/MKV/MP3 多格式' },
        { icon: '⚡', text: '实时进度追踪' },
      ],
    },
    {
      title: '进阶能力',
      tag: 'PRO',
      tagColor: 'text-purple-300 bg-purple-400/10',
      items: [
        { icon: '🎯', text: '4K / 8K 原画下载' },
        { icon: '📋', text: '批量解析下载' },
        { icon: '✨', text: '无水印原片提取' },
        { icon: '💬', text: 'AI 字幕生成' },
        { icon: '☁️', text: '云盘同步' },
        { icon: '🚫', text: '无广告体验' },
      ],
    },
    {
      title: '合规保障',
      tag: 'SAFE',
      tagColor: 'text-cyan-300 bg-cyan-400/10',
      items: [
        { icon: '🛡️', text: '版权内容自动过滤' },
        { icon: '🗑️', text: '数据零存储零缓存' },
        { icon: '📮', text: '侵权投诉通道' },
        { icon: '🔒', text: '隐私数据不收集' },
      ],
    },
  ];

  return (
    <div>
      <p className="text-xs text-white/30 tracking-widest uppercase mb-6 text-center">Capabilities</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <h4 className="text-xs font-medium text-white/60">{section.title}</h4>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${section.tagColor}`}>
                {section.tag}
              </span>
            </div>
            <ul className="space-y-2.5">
              {section.items.map((item) => (
                <li key={item.text} className="flex items-center gap-2.5 text-[12px] text-white/45">
                  <span className="text-sm">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Features;
