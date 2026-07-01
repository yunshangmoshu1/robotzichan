const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] ?? levels.info;

function fmt(level, msg, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

module.exports = {
  error: (msg, meta) => currentLevel >= levels.error && console.error(fmt('error', msg, meta)),
  warn:  (msg, meta) => currentLevel >= levels.warn  && console.warn(fmt('warn', msg, meta)),
  info:  (msg, meta) => currentLevel >= levels.info  && console.log(fmt('info', msg, meta)),
  debug: (msg, meta) => currentLevel >= levels.debug && console.log(fmt('debug', msg, meta)),
};
