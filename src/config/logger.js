const winston = require('winston');
const chalk = require('chalk');
const path = require('path');

// 커스텀 포맷터
const customFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  },
);

// 콘솔 출력용 컬러 포맷터
const consoleFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    const colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray,
      success: chalk.green,
    };

    const colorize = colors[level] || chalk.white;
    let msg = `${chalk.gray(timestamp)} ${colorize(
      `[${level.toUpperCase()}]`,
    )}: ${message}`;

    if (metadata.duration) {
      msg += chalk.cyan(` (${metadata.duration}ms)`);
    }

    if (metadata.user) {
      msg += chalk.magenta(` [${metadata.user}]`);
    }

    if (metadata.isolation) {
      msg += chalk.yellow(` {${metadata.isolation}}`);
    }

    return msg;
  },
);

// Logger 설정
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
  ),
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(consoleFormat),
    }),
    // 파일 출력 - 전체 로그
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/app.log'),
      format: customFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // 파일 출력 - 에러 로그
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: customFormat,
    }),
    // 파일 출력 - 트랜잭션 로그
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/transaction.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// 커스텀 레벨 추가
logger.success = (message, metadata = {}) => {
  logger.log('info', chalk.green('✅ ' + message), metadata);
};

logger.transaction = (action, metadata = {}) => {
  const logData = {
    action,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  logger.info(`[TRANSACTION] ${action}`, logData);
};

// 테스트 결과 출력용 헬퍼
logger.testResult = (testName, results) => {
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold(`📊 Test: ${testName}`));
  console.log(chalk.cyan('='.repeat(60)));

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? chalk.green : chalk.red;
    console.log(`${icon} ${color(result.message)}`);

    if (result.details) {
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(chalk.gray(`   ${key}: ${value}`));
      });
    }
  });

  console.log(chalk.cyan('='.repeat(60) + '\n'));
};

// 테이블 형식 출력
logger.table = (title, data) => {
  console.log(chalk.yellow('\n' + title));
  console.table(data);
};

module.exports = logger;
