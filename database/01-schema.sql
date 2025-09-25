-- Drop existing tables if they exist
DROP TABLE IF EXISTS reservation_logs;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS events;

-- 이벤트 테이블 (공연, 영화 등)
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(200) NOT NULL,
    event_date DATETIME NOT NULL,
    total_seats INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 좌석 테이블
CREATE TABLE seats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_row CHAR(1),
    seat_column INT,
    is_reserved BOOLEAN DEFAULT FALSE,
    reserved_at TIMESTAMP NULL,
    version INT DEFAULT 0,  -- 낙관적 락용
    price DECIMAL(10, 2) DEFAULT 50000.00,
    UNIQUE KEY unique_event_seat (event_id, seat_number),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_reserved (is_reserved),
    INDEX idx_event_reserved (event_id, is_reserved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 예매 테이블
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seat_id INT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    reservation_status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE RESTRICT,
    INDEX idx_user (user_id),
    INDEX idx_status (reservation_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 트랜잭션 로그 테이블 (동시성 테스트용)
CREATE TABLE reservation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(36),
    user_id VARCHAR(50),
    seat_id INT,
    action VARCHAR(50),
    status VARCHAR(20),
    isolation_level VARCHAR(20),
    lock_type VARCHAR(20),
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_transaction (transaction_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 격리 수준 확인용 프로시저
DELIMITER //

DROP PROCEDURE IF EXISTS check_isolation_level //
CREATE PROCEDURE check_isolation_level()
BEGIN
    SELECT @@transaction_isolation AS current_isolation_level;
END//

DROP PROCEDURE IF EXISTS set_isolation_level //
CREATE PROCEDURE set_isolation_level(IN level VARCHAR(20))
BEGIN
    CASE level
        WHEN 'RU' THEN SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        WHEN 'RC' THEN SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
        WHEN 'RR' THEN SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
        WHEN 'S' THEN SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    END CASE;
    SELECT @@transaction_isolation AS new_isolation_level;
END//

-- 동시성 테스트용 지연 프로시저
DROP PROCEDURE IF EXISTS delayed_reservation //
CREATE PROCEDURE delayed_reservation(
    IN p_seat_id INT,
    IN p_user_id VARCHAR(50),
    IN p_delay_seconds INT
)
BEGIN
    DECLARE exit handler for SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'Transaction failed' AS result;
    END;

    START TRANSACTION;

    -- 좌석 조회 및 락
    SELECT * FROM seats WHERE id = p_seat_id FOR UPDATE;

    -- 인위적 지연
    DO SLEEP(p_delay_seconds);

    -- 예약 처리
    UPDATE seats
    SET is_reserved = TRUE,
        reserved_at = CURRENT_TIMESTAMP
    WHERE id = p_seat_id
      AND is_reserved = FALSE;

    IF ROW_COUNT() > 0 THEN
        INSERT INTO reservations (seat_id, user_id)
        VALUES (p_seat_id, p_user_id);
        COMMIT;
        SELECT 'Success' AS result;
    ELSE
        ROLLBACK;
        SELECT 'Seat already reserved' AS result;
    END IF;
END//

DELIMITER ;
