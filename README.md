# K8 Analyzer - 快乐8智能分析系统

基于中国福利彩票官网数据，提供多维度走势分析和 AI 深度学习预测的快乐8分析工具。

## 功能

- **实时爬取**：从中彩网官方 API 获取最新开奖数据（最多 500 期）
- **走势分析**：基本走势、大小、奇偶、质合、和值、AC值、尾数、和尾、分区、冷热分析
- **AI 预测**：通过 DeepSeek 大模型分析历史数据，预测选一至选十的推荐号码
- **精美界面**：苹果风格设计，毛玻璃卡片，太极八卦旋转动画

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key

# 3. 启动
python app.py

# 4. 浏览器打开 http://127.0.0.1:5000
```

## 项目结构

```
kl8-analyzer/
├── app.py              # Flask 后端
├── scraper.py           # 数据爬虫（中彩网 API）
├── analyzer.py          # 走势分析引擎
├── ai_predictor.py      # AI 预测模块
├── requirements.txt     # 依赖
├── .env.example         # 配置模板
├── templates/
│   └── index.html       # 前端页面
└── static/
    ├── css/style.css    # 样式
    └── js/main.js       # 交互逻辑
```

## 免责声明

仅供娱乐参考，不构成投注建议。数据来源：中国福利彩票官网 [www.cwl.gov.cn](https://www.cwl.gov.cn)

## 联系方式

- 邮箱：qinrui4952@163.com
- GitHub：[CokeloveMiyo](https://github.com/CokeloveMiyo)
