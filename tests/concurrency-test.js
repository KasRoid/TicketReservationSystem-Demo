const db = require('../src/config/database');
const logger = require('../src/config/logger');
const { reserveSeat } = require('../src/services/reservationService');

async function main() {
  // 테스트 대상: 이벤트 3 (좌석 1개)에서 단일 좌석의 동시 예약 시도
  const [seat] = await (async () => {
    const conn = await db.getConnection();
    try {
      const rows = await db.query(
        conn,
        'SELECT id FROM seats WHERE event_id = 3 LIMIT 1',
      );
      return rows;
    } finally {
      await db.releaseConnection(conn);
    }
  })();

  if (!seat) {
    console.error(
      'No target seat found for event_id=3. Did you run the DB with init data?',
    );
    process.exit(1);
  }

  const seatId = seat.id;
  logger.table('Target seat', [{ seatId }]);

  // 동시에 두 사용자 예매 시도
  const p1 = reserveSeat({
    seatId,
    userId: 'user-A',
    isolation: 'RC',
    lock: 'row',
  });
  const p2 = reserveSeat({
    seatId,
    userId: 'user-B',
    isolation: 'RC',
    lock: 'row',
  });

  const [r1, r2] = await Promise.all([p1, p2]);

  logger.testResult('Concurrency - two users one seat (RC, row lock)', [
    {
      success: r1.success,
      message: `User-A: ${
        r1.success ? 'Reservation successful' : `Failed (${r1.code})`
      }`,
    },
    {
      success: !r1.success && r2.success ? true : r2.success ? false : true,
      message: `User-B: ${
        r2.success ? 'Reservation successful' : `Failed (${r2.code})`
      }`,
    },
  ]);

  // 정합성 검증: 좌석은 예약 상태여야 하고, reservations는 1건이어야 한다
  const conn = await db.getConnection();
  try {
    const seatRows = await db.query(
      conn,
      'SELECT is_reserved FROM seats WHERE id = ?',
      [seatId],
    );
    const resRows = await db.query(
      conn,
      'SELECT COUNT(*) as cnt FROM reservations WHERE seat_id = ? AND reservation_status = "confirmed"',
      [seatId],
    );
    logger.table('Post-state', [
      { is_reserved: seatRows[0].is_reserved, confirmed_count: resRows[0].cnt },
    ]);
  } finally {
    await db.releaseConnection(conn);
    await db.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
