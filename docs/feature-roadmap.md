# yt-dlp 全功能 → SnapVid 产品化提炼

## 当前已实现 ✅

| yt-dlp 功能 | SnapVid 产品化 |
|---|---|
| `-f FORMAT` 格式选择 | 画质选择下拉框 |
| `-x --audio-format` 音频提取 | 视频/仅音频模式切换 + 格式/质量选择 |
| `--write-subs --sub-langs` 字幕 | 字幕下载 + 嵌入选项 |
| `--embed-thumbnail` | 嵌入封面图选项 |
| `--embed-metadata` | 嵌入元数据选项 |
| `--sponsorblock-remove` | SponsorBlock 去广告(YouTube) |
| `--split-chapters` | 按章节拆分 |
| `--playlist-items` | 播放列表下载 + 范围选择 |
| `--limit-rate` | 限速设置 |
| `--proxy` | 代理设置 |
| `--cookies` | Cookie 管理面板 |
| `--merge-output-format` | 输出格式选择(MP4/MKV/WebM) |
| 批量下载 | 多链接粘贴 + 批量API |

---

## 可新增的产品功能点 🆕

### 第一优先级（高频需求 + 实现简单）

| yt-dlp 功能 | 产品化方案 | 前端交互 |
|---|---|---|
| `--write-thumbnail` | **单独下载封面图** | 解析后显示"下载封面"按钮 |
| `--write-description` | **提取视频描述/文案** | "复制文案"按钮 |
| `--download-sections *时间范围*` | **视频片段截取** | 时间轴滑块选择起止时间 |
| `--remux-video FORMAT` | **格式转换**（无损重封装） | 下载后"转换为..."按钮 |
| `--audio-quality 0-320` | **音质精细调节** | 滑块组件(已有下拉，可增强) |
| `--concurrent-fragments N` | **多线程加速下载** | Pro开关："极速模式" |
| `--write-comments` | **导出视频评论** | "导出评论"按钮 |

### 第二优先级（进阶功能 + Pro卖点）

| yt-dlp 功能 | 产品化方案 | 前端交互 |
|---|---|---|
| `--download-archive` | **下载去重/历史记录** | 自动跳过已下载视频 |
| `--match-filters` | **智能筛选**（按时长/大小/日期过滤） | 筛选面板 |
| `--convert-subs FORMAT` | **字幕格式转换** | SRT↔ASS↔VTT 切换 |
| `--convert-thumbnails FORMAT` | **封面格式转换** | PNG/JPG/WebP 选择 |
| `--impersonate chrome` | **浏览器模拟** | 反爬增强(后台自动用) |
| `--sleep-requests/interval` | **智能限速防封** | "安全模式"开关 |
| `--exec CMD` | **下载后自动处理** | 自动重命名/移动规则 |
| `--replace-in-metadata` | **元数据清理** | 自定义文件名模板 |

### 第三优先级（差异化卖点）

| yt-dlp 功能 | 产品化方案 | 前端交互 |
|---|---|---|
| `-o TEMPLATE` | **自定义文件名模板** | 模板编辑器(标题/日期/作者/平台) |
| `--playlist-random` | **随机抽取** | "随机下载N个"按钮 |
| `--max-filesize/min-filesize` | **文件大小过滤** | 大小范围滑块 |
| `--date/datebefore/dateafter` | **日期范围筛选** | 日期选择器 |
| `--format-sort` | **画质偏好设置** | 全局偏好：优先HDR/优先小体积等 |
| `--xff/geo-verification-proxy` | **地区解锁** | "解锁XX区内容"开关 |

---

## 推荐本次实现的功能（ROI最高）

1. **单独下载封面图** — 极简实现，一个按钮
2. **提取视频描述/文案** — 自媒体创作者高频需求
3. **视频片段截取** — 差异化功能，用户体验好
4. **格式转换** — 下载后一键转MP4/MP3
5. **多线程加速** — Pro卖点，一行代码搞定
6. **自定义文件名模板** — 高级用户需求
