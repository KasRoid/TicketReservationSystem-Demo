const db = require('../config/database');
const logger = require('../config/logger');

async function reserveSeat({
  seatId,
  userId,
  isolation = 'RC',
  lock = 'row',
  delayMs = 0,
}) {
  const connection = await db.getConnection();
  const start = Date.now();
  const transactionId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  try {
    await db.beginTransaction(connection, isolation);

    // 행 락 vs 테이블 락 선택
    if (lock === 'table') {
      await db.query(connection, 'LOCK TABLES seats WRITE, reservations WRITE');
    }

    // 현재 좌석 상태 조회 + 행 락(필요 시)
    const selectSql =
      lock === 'row'
        ? 'SELECT id, is_reserved, version FROM seats WHERE id = ? FOR UPDATE'
        : 'SELECT id, is_reserved, version FROM seats WHERE id = ?';
    const rows = await db.query(connection, selectSql, [seatId]);

    if (rows.length === 0) {
      await db.rollback(connection);
      return { success: false, code: 'NOT_FOUND', message: 'Seat not found' };
    }

    const seat = rows[0];
    if (seat.is_reserved) {
      await db.rollback(connection);
      return {
        success: false,
        code: 'ALREADY_RESERVED',
        message: 'Seat already reserved',
      };
    }

    if (delayMs && Number(delayMs) > 0) {
      await new Promise((resolve) => setTimeout(resolve, Number(delayMs)));
    }

    // 낙관적 락 버전 증가 시도
    const updateSql =
      'UPDATE seats SET is_reserved = TRUE, reserved_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND is_reserved = FALSE AND version = ?';
    const updateResult = await db.query(connection, updateSql, [
      seatId,
      seat.version,
    ]);

    const affected =
      updateResult && typeof updateResult.affectedRows === 'number'
        ? updateResult.affectedRows // mysql2 OkPacket
        : updateResult && typeof updateResult.rowCount === 'number'
        ? updateResult.rowCount // pg Result
        : 0;

    if (!affected || affected === 0) {
      await db.rollback(connection);
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Seat reservation conflict',
      };
    }

    // 예약 레코드 생성
    await db.query(
      connection,
      'INSERT INTO reservations (seat_id, user_id, reservation_status) VALUES (?, ?, "confirmed")',
      [seatId, userId],
    );

    await db.commit(connection);

    const duration = Date.now() - start;
    logger.transaction('reserveSeat:success', {
      user: userId,
      transactionId,
      isolation,
      lock_type: lock,
      seat_id: seatId,
      duration,
    });

    return { success: true, seatId, userId, duration };
  } catch (error) {
    await db.rollback(connection);
    const duration = Date.now() - start;
    logger.transaction('reserveSeat:error', {
      user: userId,
      transactionId,
      isolation,
      lock_type: lock,
      seat_id: seatId,
      error_message: error.message,
      duration,
    });
    return { success: false, code: 'ERROR', message: error.message };
  } finally {
    try {
      // 테이블 락 해제
      if (lock === 'table') {
        await db.query(connection, 'UNLOCK TABLES');
      }
    } catch (_) {}
    await db.releaseConnection(connection);
  }
}

module.exports = { reserveSeat };
