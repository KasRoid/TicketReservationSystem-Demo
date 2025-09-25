const db = require('../src/config/database');
const logger = require('../src/config/logger');
const { reserveSeat } = require('../src/services/reservationService');

async function prepareFreshSeat() {
  const conn = await db.getConnection();
  try {
    // 테스트용 이벤트(좌석 5개)에서 아직 예약되지 않은 좌석 하나 선정
    const [seat] = await db.query(
      conn,
      'SELECT id FROM seats WHERE event_id = 4 AND is_reserved = FALSE LIMIT 1',
    );
    return seat ? seat.id : null;
  } finally {
    await db.releaseConnection(conn);
  }
}

async function runScenario({ lock }) {
  const seatId = await prepareFreshSeat();
  if (!seatId) {
    return { lock, success: false, error: 'No free seat for event_id=4' };
  }

  const start = Date.now();
  const p1 = reserveSeat({
    seatId,
    userId: `lock-${lock}-A`,
    isolation: 'RC',
    lock,
  });
  const p2 = reserveSeat({
    seatId,
    userId: `lock-${lock}-B`,
    isolation: 'RC',
    lock,
  });
  const [r1, r2] = await Promise.all([p1, p2]);
  const duration = Date.now() - start;

  const successCount = [r1, r2].filter((r) => r.success).length;
  return { lock, duration, successCount, r1, r2 };
}

async function main() {
  // 행 락 시나리오
  const rowResult = await runScenario({ lock: 'row' });
  // 테이블 락 시나리오
  const tableResult = await runScenario({ lock: 'table' });

  logger.table('Lock compare - results', [
    {
      lock: rowResult.lock,
      duration_ms: rowResult.duration,
      successCount: rowResult.successCount,
    },
    {
      lock: tableResult.lock,
      duration_ms: tableResult.duration,
      successCount: tableResult.successCount,
    },
  ]);

  logger.testResult('Lock mode compare (row vs table)', [
    {
      success: rowResult.successCount === 1,
      message: `Row lock: exactly one success (got ${rowResult.successCount})`,
    },
    {
      success: tableResult.successCount === 1,
      message: `Table lock: exactly one success (got ${tableResult.successCount})`,
    },
  ]);

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
