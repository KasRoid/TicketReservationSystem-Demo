-- 테스트 이벤트 생성
INSERT INTO events (event_name, event_date, total_seats) VALUES
('박효신 콘서트', '2025-02-01 19:00:00', 50),
('아이유 콘서트', '2025-02-15 20:00:00', 30),
('테스트 이벤트 (좌석 1개)', '2025-01-20 19:00:00', 1),
('테스트 이벤트 (좌석 5개)', '2025-01-21 19:00:00', 5);

-- 박효신 콘서트 좌석 생성 (50석)
INSERT INTO seats (event_id, seat_number, seat_row, seat_column, price)
SELECT
    1 as event_id,
    CONCAT(row_letter, column_num) as seat_number,
    row_letter,
    column_num,
    CASE
        WHEN row_letter IN ('A', 'B') THEN 150000
        WHEN row_letter IN ('C', 'D', 'E') THEN 100000
        ELSE 50000
    END as price
FROM (
    SELECT 'A' as row_letter UNION SELECT 'B' UNION SELECT 'C'
    UNION SELECT 'D' UNION SELECT 'E'
) r
CROSS JOIN (
    SELECT 1 as column_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
    UNION SELECT 9 UNION SELECT 10
) c;

-- 아이유 콘서트 좌석 생성 (30석, 일부 예약됨)
INSERT INTO seats (event_id, seat_number, seat_row, seat_column, is_reserved, reserved_at, price)
SELECT
    2 as event_id,
    CONCAT(row_letter, column_num) as seat_number,
    row_letter,
    column_num,
    CASE WHEN column_num <= 3 THEN TRUE ELSE FALSE END as is_reserved,
    CASE WHEN column_num <= 3 THEN NOW() ELSE NULL END as reserved_at,
    120000 as price
FROM (
    SELECT 'A' as row_letter UNION SELECT 'B' UNION SELECT 'C'
) r
CROSS JOIN (
    SELECT 1 as column_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
    UNION SELECT 9 UNION SELECT 10
) c;

-- 테스트용 단일 좌석 (경합 테스트용)
INSERT INTO seats (event_id, seat_number, seat_row, seat_column, price)
VALUES (3, 'A1', 'A', 1, 100000);

-- 테스트용 5개 좌석
INSERT INTO seats (event_id, seat_number, seat_row, seat_column, price)
VALUES
    (4, 'A1', 'A', 1, 100000),
    (4, 'A2', 'A', 2, 100000),
    (4, 'A3', 'A', 3, 100000),
    (4, 'A4', 'A', 4, 100000),
    (4, 'A5', 'A', 5, 100000);

-- 기존 예약 데이터 생성 (아이유 콘서트)
INSERT INTO reservations (seat_id, user_id, reservation_status)
SELECT
    id as seat_id,
    CONCAT('early_bird_', id) as user_id,
    'confirmed' as reservation_status
FROM seats
WHERE event_id = 2 AND is_reserved = TRUE;

-- 상태 확인 쿼리
SELECT
    e.event_name,
    COUNT(s.id) as total_seats,
    SUM(CASE WHEN s.is_reserved = TRUE THEN 1 ELSE 0 END) as reserved_seats,
    SUM(CASE WHEN s.is_reserved = FALSE THEN 1 ELSE 0 END) as available_seats
FROM events e
LEFT JOIN seats s ON e.id = s.event_id
GROUP BY e.id, e.event_name;

-- 격리 수준 테스트를 위한 뷰 생성
CREATE VIEW v_seat_status AS
SELECT
    s.id,
    e.event_name,
    s.seat_number,
    s.is_reserved,
    s.version,
    r.user_id,
    r.created_at as reservation_time
FROM seats s
JOIN events e ON s.event_id = e.id
LEFT JOIN reservations r ON s.id = r.seat_id AND r.reservation_status = 'confirmed'
ORDER BY e.id, s.seat_number;
