const db = require('../src/config/database');
const logger = require('../src/config/logger');

async function simulateDirtyRead() {
  const conn1 = await db.getConnection();
  const conn2 = await db.getConnection();
  try {
    await db.beginTransaction(conn1, 'RU');
    await db.beginTransaction(conn2, 'RU');

    const [seat] = await db.query(
      conn1,
      'SELECT id FROM seats WHERE event_id = 4 AND is_reserved = FALSE LIMIT 1',
    );
    if (!seat)
      return { name: 'Dirty Read', success: false, message: 'No free seat' };

    await db.query(conn1, 'UPDATE seats SET is_reserved = TRUE WHERE id = ?', [
      seat.id,
    ]);

    const [row2] = await db.query(
      conn2,
      'SELECT is_reserved FROM seats WHERE id = ?',
      [seat.id],
    );

    await db.rollback(conn1);
    await db.commit(conn2);

    return {
      name: 'Dirty Read',
      success: row2.is_reserved === 1 || row2.is_reserved === true,
      details: { observed_reserved: row2.is_reserved },
    };
  } finally {
    await db.releaseConnection(conn1);
    await db.releaseConnection(conn2);
  }
}

async function simulateNonRepeatableRead() {
  const conn1 = await db.getConnection();
  const conn2 = await db.getConnection();
  try {
    await db.beginTransaction(conn1, 'RC');
    await db.beginTransaction(conn2, 'RC');

    const [seat] = await db.query(
      conn1,
      'SELECT id, is_reserved FROM seats WHERE event_id = 4 LIMIT 1',
    );
    const firstRead = seat.is_reserved;

    await db.query(
      conn2,
      'UPDATE seats SET is_reserved = NOT is_reserved WHERE id = ?',
      [seat.id],
    );
    await db.commit(conn2);

    const [seatAgain] = await db.query(
      conn1,
      'SELECT is_reserved FROM seats WHERE id = ?',
      [seat.id],
    );
    await db.commit(conn1);

    return {
      name: 'Non-repeatable Read',
      success: firstRead !== seatAgain.is_reserved,
      details: { firstRead, secondRead: seatAgain.is_reserved },
    };
  } finally {
    await db.releaseConnection(conn1);
    await db.releaseConnection(conn2);
  }
}

async function simulatePhantomRead() {
  const conn1 = await db.getConnection();
  const conn2 = await db.getConnection();
  try {
    await db.beginTransaction(conn1, 'RC');
    await db.beginTransaction(conn2, 'RC');

    const rows1 = await db.query(
      conn1,
      'SELECT COUNT(*) AS cnt FROM seats WHERE event_id = 4 AND is_reserved = FALSE',
    );
    await db.query(
      conn2,
      'INSERT INTO seats (event_id, seat_number, seat_row, seat_column, price) VALUES (4, CONCAT("TMP", FLOOR(RAND()*10000)), "Z", 99, 100000)',
    );
    await db.commit(conn2);

    const rows2 = await db.query(
      conn1,
      'SELECT COUNT(*) AS cnt FROM seats WHERE event_id = 4 AND is_reserved = FALSE',
    );
    await db.commit(conn1);

    return {
      name: 'Phantom Read',
      success: rows1[0].cnt !== rows2[0].cnt,
      details: { before: rows1[0].cnt, after: rows2[0].cnt },
    };
  } finally {
    await db.releaseConnection(conn1);
    await db.releaseConnection(conn2);
  }
}

async function main() {
  const results = [];
  results.push(await simulateDirtyRead());
  results.push(await simulateNonRepeatableRead());
  results.push(await simulatePhantomRead());
  // RR: Non-repeatable/Phantom 방지 기대
  const conn = await db.getConnection();
  try {
    await db.beginTransaction(conn, 'RR');
    const before = await db.query(
      conn,
      'SELECT COUNT(*) AS cnt FROM seats WHERE event_id = 4',
    );
    const beforeCnt = before[0].cnt;
    const conn2 = await db.getConnection();
    try {
      await db.beginTransaction(conn2, 'RR');
      await db.query(
        conn2,
        'INSERT INTO seats (event_id, seat_number, seat_row, seat_column, price) VALUES (4, CONCAT("RR", FLOOR(RAND()*10000)), "Z", 100, 100000)',
      );
      await db.commit(conn2);
    } finally {
      await db.releaseConnection(conn2);
    }
    const after = await db.query(
      conn,
      'SELECT COUNT(*) AS cnt FROM seats WHERE event_id = 4',
    );
    const afterCnt = after[0].cnt;
    // MySQL RR에서는 팬텀 가능성이 줄지만 완전 차단은 아님 (InnoDB 구현에 따라). 결과만 보고한다.
    results.push({
      name: 'RR Phantom check',
      success: beforeCnt === afterCnt,
      details: { beforeCnt, afterCnt },
    });
    await db.commit(conn);
  } finally {
    await db.releaseConnection(conn);
  }
  logger.testResult('Isolation phenomena (RU/RC)', results);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
