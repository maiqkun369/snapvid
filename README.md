# ytdlp-web

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的 Web 视频下载器。

## 功能特性

- 支持 1000+ 视频平台（YouTube、Bilibili、Twitter 等）
- 视频/音频下载，支持画质选择
- 实时下载进度推送（WebSocket）
- 字幕下载、播放列表下载、限速设置
- 下载历史管理
- 现代深色主题 UI

## 技术栈

- **后端**: Python FastAPI + yt-dlp + WebSocket
- **前端**: React + Vite + TailwindCSS
- **部署**: Docker + docker-compose

## 本地开发

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## Docker 部署

```bash
docker-compose up -d
```

访问 http://localhost:8080

## CNB 部署

项目包含 `cloudbase.yml` 配置，推送到 CNB 仓库即可自动部署。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/info | 获取视频信息 |
| POST | /api/download | 开始下载任务 |
| GET | /api/downloads | 获取下载历史 |
| GET | /api/downloads/{id}/file | 下载已完成文件 |
| DELETE | /api/downloads/{id} | 删除下载记录 |
| WS | /api/ws/progress/{task_id} | 实时进度推送 |
