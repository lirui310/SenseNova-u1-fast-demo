# SenseNova U1 Fast Demo

一个极简的 Python + FastAPI 图像生成 Demo，用于调用 SenseNova U1 Fast 的独立图像生成接口。

这个项目使用 OpenAI 兼容 SDK 的 `client.images.generate(...)`，接口语义对应 `POST /v1/images/generations`。它不会调用 Chat Completions，也不提供图像输入或图片上传能力。

开发文档：[https://platform.sensenova.cn/docs](https://platform.sensenova.cn/docs)

## 功能

- 文本生成图片，模型默认 `sensenova-u1-fast`
- API Key 仅保存在服务端 `.env`
- 提示词默认留空，需要手动输入图像描述文本
- 提示词会显示 `4096 token` 上限的估算计数
- 生成数量固定为 `1`
- 尺寸下拉菜单包含 U1 Fast 支持的 11 种 2K 分辨率
- 结果区展示图片、图片 URL 和折叠的原始响应

## 项目结构

```text
.
├── app/
│   └── main.py
├── static/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## 配置

复制环境变量示例：

```bash
cp .env.example .env
```

然后把 `.env` 里的 `SENSENOVA_API_KEY` 改成你的密钥：

```env
SENSENOVA_API_KEY=your_sensenova_api_key_here
SENSENOVA_BASE_URL=https://token.sensenova.cn/v1
SENSENOVA_MODEL=sensenova-u1-fast
SENSENOVA_REQUEST_TIMEOUT=120
```

不要提交 `.env`。仓库已通过 `.gitignore` 和 `.dockerignore` 忽略 `.env`、`.env.*`、虚拟环境和 Python 缓存文件。

## Docker 运行

```bash
docker compose up --build
```

打开：

```text
http://localhost:9012
```

Docker 镜像会以非 root 用户运行应用，容器内端口为 `8000`，本机默认映射端口为 `9012`。

## 本地运行

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

打开：

```text
http://localhost:8000
```

## 本地 API

页面请求本地后端：

```http
POST /api/generate-image
Content-Type: application/json
```

请求体：

```json
{
  "prompt": "图像描述文本",
  "size": "2752x1536",
  "n": 1
}
```

后端实际调用：

```python
client.images.generate(
    model="sensenova-u1-fast",
    prompt=prompt,
    size=size,
    n=1,
)
```

## 支持尺寸

```text
1664x2496 ｜ 2:3
2496x1664 ｜ 3:2
1760x2368 ｜ 3:4
2368x1760 ｜ 4:3
1824x2272 ｜ 4:5
2272x1824 ｜ 5:4
2048x2048 ｜ 1:1
2752x1536 ｜ 16:9
1536x2752 ｜ 9:16
3072x1376 ｜ 21:9
1344x3136 ｜ 9:21
```

## 安全注意

- 不要把 `.env`、真实 API Key、终端输出里的密钥提交到仓库。
- 不建议把这个 Demo 直接暴露到公网；它没有用户鉴权、配额控制或限流。
- 如果要公开部署，请在反向代理或网关层增加认证、限流、请求体大小限制、日志脱敏和费用告警。
- `docker compose config` 可能会展开并打印 `.env` 中的值，不要把包含真实密钥的输出贴到公开 issue 或 PR。

更完整的安全说明见 [SECURITY.md](SECURITY.md)。

## 开源前检查

见 [docs/OPEN_SOURCE_CHECKLIST.md](docs/OPEN_SOURCE_CHECKLIST.md)。

## License

开源前请补充许可证文件，例如 `MIT`、`Apache-2.0` 或项目维护者选择的其他许可证。
