const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/robots', require('./routes/robots'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dingtalk', require('./routes/dingtalk'));
app.use('/api/reports', require('./routes/reports'));

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(config.server.port, () => {
  logger.info(`ROBO::TRACK 2.0 后端启动成功: http://localhost:${config.server.port}`);

  // 如果配置了自动同步文档ID，自动启动定时同步
  if (process.env.DINGTALK_SYNC_DOCUMENT_ID) {
    config.syncConfig = {
      documentId: process.env.DINGTALK_SYNC_DOCUMENT_ID,
      sheetName: process.env.DINGTALK_SYNC_SHEET_NAME || '',
      operatorId: process.env.DINGTALK_OPERATOR_ID || '',
      folderId: process.env.DINGTALK_SYNC_FOLDER_ID || '',
      interval: parseInt(process.env.DINGTALK_SYNC_INTERVAL) || 1,
    };
    const scheduler = require('./services/scheduler');
    scheduler.start(config.syncConfig.interval);
    logger.info(`自动同步已启动，间隔 ${config.syncConfig.interval} 分钟`);
  }
});
