const logger = require('./config/logger');
const db = require('./config/database');

async function healthCheck() {
  const conn = await db.getConnection();
  try {
    const rows = await db.query(conn, 'SELECT 1 AS ok');
    logger.success('App started and DB reachable', {
      dbType: db.dbType,
      ok: rows[0].ok,
    });
  } finally {
    await db.releaseConnection(conn);
    await db.close();
  }
}

healthCheck().catch((e) => {
  console.error(e);
  process.exit(1);
});
