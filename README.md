# PanSou Web

网盘资源搜索的前端页面。纯静态页面，开箱即用，对接 [fish2018/pansou](https://github.com/fish2018/pansou) 提供的搜索 API。

在线演示：https://new-pansou.jkai.de

## 功能

- 首页：搜索框 + 全站实时热搜（编号 + 全站搜索次数）
- 结果页：按网盘分类 Tab（百度 / 阿里 / 夸克 / 迅雷 / UC / 115 / 123 / 天翼 / 移动云盘 / PikPak / 磁力 / 电驴）、排序、分页
- 资源卡片：网盘 logo、标题、日期、提取码，右上角 `···` 菜单可打开链接 / 复制链接 / 复制提取码
- 搜索历史页：本机 localStorage 存储，记录搜索次数和时间，支持单条删除和清空
- 基础 SEO：description / keywords / robots / canonical / Open Graph

## 后端

后端 API 来自开源项目 [fish2018/pansou](https://github.com/fish2018/pansou)，本仓库只包含前端。

自己部署后端：

```bash
git clone https://github.com/fish2018/pansou
cd pansou
go build -o pansou .
./pansou   # 默认监听 127.0.0.1:8888
```

用到的接口：

- `GET /api/search?kw=关键词` — 资源搜索
- `GET /api/hot?limit=10` — 全站热搜（本项目自带扩展接口，见下方说明）

> 全站热搜是我们自己在后端上加的一个小扩展：搜索成功后异步记录关键词，全站共享，`GET /api/hot` 返回按次数排序的热词。原生 fish2018/pansou 没有这个接口，不需要可以忽略。

## 配置

复制配置示例并填入你自己部署的后端地址：

```bash
cp www/assets/js/config.example.js www/assets/js/config.js
```

```js
// www/assets/js/config.js
window.PANSOU_API_BASE = 'https://你的后端域名';
```

`config.js` 已加入 `.gitignore`，不会被提交，避免把自己的后端地址公开。

注意：如果前后端不同域名，后端需要允许跨域（CORS）。

## 运行

纯静态文件，任何静态服务器都可以：

```bash
cd www
python3 -m http.server 8890
```

浏览器打开 `http://localhost:8890`。

## 目录结构

```
www/
├── index.html            # 单页应用（首页 / 结果页 / 历史页）
├── assets/
│   ├── css/style.css     # 样式
│   ├── js/
│   │   ├── app.js        # 前端逻辑
│   │   ├── config.js     # 后端地址配置（本地文件，不提交）
│   │   └── config.example.js
│   └── logos/            # 各网盘 logo（本地文件，避免热链）
├── pansou-web.service    # systemd 服务示例
└── restore.sh            # 部署自救脚本示例
```

## 许可

前端代码 MIT。注意 [fish2018/pansou](https://github.com/fish2018/pansou) 仓库声明“仅供学习研究，请勿以各种形式用于盈利目的”，商用前请先确认许可。
