# 🎫 좌석 예매 시스템 - 트랜잭션 동시성 제어 실습

데이터베이스 트랜잭션과 동시성 제어를 학습하기 위한 실습 프로젝트입니다.

## 📚 학습 목표

- 데이터베이스 격리 수준(Isolation Level) 이해
- 락(Lock) 메커니즘 실습
- 동시성 문제 해결 방법 학습
- 실제 예매 시스템에서의 정합성 보장

## 🛠 기술 스택

- **Database**: MySQL 8.0
- **Backend**: Node.js
- **Container**: Docker & Docker Compose
- **Libraries**: mysql2, winston, dotenv

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Node.js (v14+)
- Git

### Installation

1. 저장소 클론

```bash
git clone https://github.com/your-username/seat-reservation.git
cd seat-reservation
```

2. 의존성 설치

```bash
npm install
```

3. 환경변수 (선택)

- 기본값이 설정되어 별도 파일 없이 동작합니다.
- 필요 시 아래 키로 `.env` 생성:
  - `DB_TYPE`(mysql|postgres) 기본: mysql
  - MySQL: `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME`
  - Postgres: `PG_HOST` `PG_PORT` `PG_USER` `PG_PASSWORD` `PG_NAME`
  - `LOG_LEVEL` 기본: info

4. 데이터베이스 시작

```bash
npm run db:up
```

5. 테스트 실행

```bash
# 동시성 테스트(좌석 1개 동시 예매 → 정확히 1명 성공)
npm test

# 격리수준/현상 테스트(RU/RC/RR)
npm run test:isolation

# 락 전략 비교 테스트(행 락 vs 테이블 락)
npm run test:locks
```

6. 초기 데이터 재적용(필요 시)

```bash
# 컨테이너 기동 후 좌석 데이터가 비어있다면 실행
npm run db:seed
```

## 📁 프로젝트 구조

```
seat-reservation/
├── docker-compose.yml      # Docker 설정
├── package.json            # Node.js 설정
├── database/
│   ├── 01-schema.sql       # DB 스키마
│   └── 02-init-data.sql    # 초기 데이터
├── src/
│   ├── config/             # 설정 파일
│   └── services/           # 비즈니스 로직
├── tests/                  # 테스트 코드
├── logs/                   # 로그 파일
└── .env (선택)             # 환경변수
```

## 🧪 테스트 시나리오

### 1. 격리 수준 테스트

- READ UNCOMMITTED (Dirty Read 가능)
- READ COMMITTED (Non-repeatable/Phantom 가능)
- REPEATABLE READ (Non-repeatable 완화, Phantom 관찰)
- SERIALIZABLE (필요 시 확장 가능)

### 2. 동시성 문제 재현

- Dirty Read
- Non-repeatable Read
- Phantom Read

### 3. 락 전략 비교

- 비관적 락 (행 락/테이블 락 비교: `tests/lock-compare-test.js`)
- 낙관적 락 (버전 컬럼 `seats.version`으로 충돌 방지)

### 4. 지연 주입(경합 유도)

- 서비스 호출 시 `delayMs` 옵션으로 트랜잭션 중간 지연 주입 가능
- 예: `reserveSeat({ seatId, userId, isolation: 'RC', lock: 'row', delayMs: 500 })`

## 🧭 테스트 실행 방법 (Step-by-step)

아래 순서대로 실행하면 됩니다. Docker Desktop이 켜져 있어야 합니다.

1. 데이터베이스 기동

```bash
npm run db:up
```

2. 초기 데이터 확인/재적용 (선택)

- 최초 실행에서 자동으로 적용되지만, 비어있다면 아래를 실행하세요.

```bash
npm run db:seed
```

3. 동시성 테스트 (좌석 1개, 2명 동시 예매 → 정확히 1명 성공)

```bash
npm test
```

- 기대 결과: 한 사용자는 성공, 다른 한 사용자는 `ALREADY_RESERVED`로 실패. 최종 좌석 상태는 예약됨(confirmed 1건).

4. 격리 수준/현상 테스트 (RU/RC/RR)

```bash
npm run test:isolation
```

- 기대 결과:
  - RU: Dirty Read 관찰 가능
  - RC: Non-repeatable/Phantom 관찰 가능
  - RR: 카운트 변화가 없거나 크게 줄어 팬텀 억제 관찰

5. 락 전략 비교 테스트 (행 락 vs 테이블 락)

```bash
npm run test:locks
```

- 기대 결과: 두 모드 모두 정확히 1명만 성공. 실행 시간(duration_ms)은 환경에 따라 차이.

6. 종료/정리 (선택)

```bash
npm run db:down
# 또는 완전 초기화 후 재기동
npm run db:reset
```

### 참고

- 로그는 `logs/` 디렉토리에 저장됩니다.
- `.env` 없이 기본값으로 동작합니다. 필요 시 `DB_TYPE`, `DB_HOST` 등 환경변수를 설정하세요.
- 컨테이너가 올라온 뒤에도 데이터가 비어 있으면 `npm run db:seed`를 한 번 실행하세요.

## 🧱 아키텍처 개요

- 애플리케이션은 단일 Node.js 프로세스로 동작하며, 데이터베이스(MySQL 기본, PostgreSQL 선택)를 대상으로 트랜잭션/락/격리 수준 실험을 수행합니다.
- 핵심 포인트는 트랜잭션 경계 설정, 격리 수준 제어, 락 전략(행/테이블), 낙관적 락(version 컬럼)입니다.

### 디렉터리 구조 (요약)

```
src/
  config/
    database.js      # DB 커넥션 풀, 트랜잭션/격리/쿼리 헬퍼
    logger.js        # 콘솔/파일 로거, 테스트 결과/테이블 출력
  services/
    reservationService.js  # 예매 트랜잭션 로직(행/테이블 락, 낙관적 락, 지연)
tests/
  concurrency-test.js      # 같은 좌석 동시 예매 → 1명 성공 검증
  isolation-test.js        # RU/RC/RR 현상 재현
  lock-compare-test.js     # 행 락 vs 테이블 락 비교
database/
  01-schema.sql            # 테이블/프로시저/뷰 생성(실습용)
  02-init-data.sql         # 이벤트/좌석/예약 초기 데이터
```

## 🔑 핵심 모듈/함수 설명

### `src/config/database.js`

- DB 타입 자동 선택: `process.env.DB_TYPE`(기본 mysql)
- 안전한 기본값 내장: `.env` 없이도 로컬 컨테이너 접속 가능
- 주요 메서드:
  - `initialize()`/`getConnection()`/`releaseConnection()`/`close()`
  - `beginTransaction(connection, isolation)`/`commit()`/`rollback()`
  - `setIsolationLevel(connection, level)`
    - 축약 코드 지원: RU, RC, RR, S → 실제 SQL 격리 수준으로 매핑
  - `query(connection, sql, params)`
    - MySQL과 PostgreSQL의 placeholder 차이를 흡수(?, $1 등)

### `src/services/reservationService.js`

- 함수: `reserveSeat({ seatId, userId, isolation='RC', lock='row', delayMs=0 })`
  - 트랜잭션 시작 전 격리 수준 설정
  - 락 전략 선택
    - `row`: `SELECT ... FOR UPDATE`로 행 단위 락
    - `table`: `LOCK TABLES seats WRITE, reservations WRITE`로 테이블 락
  - 정합성 보장
    - 빠른 실패: 이미 예약된 좌석은 즉시 롤백/실패 반환
    - 낙관적 락: `version` 조건으로 동시 업데이트 충돌 방지
    - 성공 시 `reservations`에 `confirmed` 레코드 생성
  - 실험용 지연: `delayMs`로 트랜잭션 내부 의도적 대기

### `src/config/logger.js`

- 콘솔 컬러 출력 + 파일 저장(`logs/app.log`, `logs/error.log`, `logs/transaction.log`)
- 테스트 결과 표출 헬퍼: `logger.testResult(title, results)`
- 표 형식 출력: `logger.table(title, data)`
- 트랜잭션 이벤트 로깅: `logger.transaction(action, metadata)`

## 🗄️ 데이터베이스 스키마 요점

- `events`(공연), `seats`(좌석), `reservations`(예매), `reservation_logs`(실험용 로그)
- 좌석 낙관적 락: `seats.version` 컬럼으로 동시 갱신 충돌 방지
- 조회 성능/실험 편의 인덱스: `idx_event_reserved`, `idx_reserved`, `idx_status` 등
- 실습용 프로시저/뷰
  - `check_isolation_level`, `set_isolation_level`, `delayed_reservation`
  - `v_seat_status`(상태 확인용 뷰)

## 🧠 동시성 전략 비교 관점

- 행 락(row lock): 필요한 행만 잠금 → 병행성 유리, 교착/대기 관찰에 적합
- 테이블 락(table lock): 간단하고 확실하지만 병렬성 저하 가능
- 격리 수준:
  - RU: Dirty Read 허용 → 데이터 불안정성 관찰용
  - RC: 대부분 서비스 기본값, Non-repeatable/Phantom 가능
  - RR: Non-repeatable 완화, Phantom 억제(InnoDB 구현 특성 반영)
  - S: 가장 엄격, 동시성 저하 가능(필요 시 확장)

## 🧪 포함된 테스트가 검증하는 것

- `tests/concurrency-test.js`: 좌석 1개, 2명 동시 예매 시 정확히 1명만 성공하고 오버셀 없음을 검증
- `tests/isolation-test.js`: RU/RC/RR에서 Dirty/Non-repeatable/Phantom 발생 여부 관찰
- `tests/lock-compare-test.js`: 행 락 vs 테이블 락 비교(두 모드 모두 정합성 유지, 실행 시간 차 비교)

## 📝 권장 실험/확장 아이디어

- `delayMs`/사용자 수/격리 수준/락 전략을 파라미터화하여 벤치마크 스크립트 추가
- PostgreSQL 전환(`DB_TYPE=postgres`) 후 동일 시나리오 비교
- Deadlock 케이스 재현 및 에러 처리/재시도 정책 실험

## 🎓 실습하며 반드시 익혀야 할 내용(요약)

- 트랜잭션 경계 설정과 정합성
  - 비즈니스 단위(예매)를 하나의 트랜잭션으로 묶어야 하는 이유
  - 커밋/롤백 타이밍이 데이터 정합성에 미치는 영향
- 격리 수준별 현상과 트레이드오프
  - RU/RC/RR/S의 의미와 Dirty/Non-repeatable/Phantom Read의 실제 재현
  - 서비스 레벨에서 허용 가능한 현상과 불가한 현상 구분
- 락 전략 선택
  - 행 락과 테이블 락의 차이(병행성 vs 단순성)
  - 낙관적 락(version) vs 비관적 락(SELECT ... FOR UPDATE)의 적용 기준
- MySQL(InnoDB) 특성 이해
  - RR의 Gap Lock/Next-Key Lock으로 팬텀 억제 동작
  - 트랜잭션 격리 설정이 세션·트랜잭션 범위에 미치는 영향
- 에러/경합 처리 패턴
  - 충돌(CONFLICT)·중복(ALREADY_RESERVED)·Deadlock·Lock wait timeout 구분
  - 재시도 정책과 멱등성(idempotency) 고려(중복 삽입 방지 키/상태 머신)
- 성능/가용성 고려
  - 락 홀드 시간 단축(쿼리 단순화, 지연 최소화)
  - 필요한 최소 범위/행만 잠그기, 인덱스 설계로 잠금 충돌 감소
- 관측/로깅
  - 트랜잭션 ID, 격리 수준, 락 타입, 소요 시간 기록으로 회귀 분석 가능하게 하기

## ✅ 학습 체크리스트(자가 점검)

- [ ] 같은 좌석 동시 예매 시 1명만 성공하는지 재현했다
- [ ] RU/RC/RR에서 Dirty/Non-repeatable/Phantom을 각각 관찰했다
- [ ] 행 락과 테이블 락의 차이(성공 결과 동일, 대기시간 차이)를 비교했다
- [ ] 낙관적 락(version) 충돌을 유발하고 처리 결과를 확인했다
- [ ] 지연(delayMs)로 경합을 의도적으로 만들고 대기/실패를 관찰했다
- [ ] 에러 유형별 처리(롤백/메시지/재시도 여부)를 설계했다
- [ ] 인덱스/쿼리 변경이 잠금 경쟁에 미치는 영향을 실험했다

## 🧩 추가 실습 문제(선택)

- Deadlock 재현: 두 트랜잭션이 서로 다른 좌석을 교차로 잠그도록 시나리오 구성 후 해결 전략(순서 정렬/재시도 Backoff) 설계
- 예약 취소/환불 트랜잭션 설계: 상태 전이(pending→confirmed→cancelled)와 멱등성 보장
- 대량 동시 트래픽: 10~100 동시 사용자로 스루풋/대기시간 측정 및 격리/락 조합별 비교

## 📊 실행 결과

```
==============================================
📊 Test: Isolation Level - READ COMMITTED
==============================================
✅ User1: Reservation successful
❌ User2: Seat already reserved
✅ Data consistency maintained
==============================================
```

## 🐛 트러블슈팅

### Docker 관련

- Docker Desktop이 실행 중인지 확인
- 포트 충돌 시 docker-compose.yml 수정

- 초기 데이터가 비어있으면 `npm run db:seed` 실행

### MySQL 관련

- 연결 실패 시 1-2분 대기 후 재시도
- 권한 문제 시 root 계정으로 접속

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

- 데이터베이스 수업 자료
- MySQL 공식 문서
- Docker 공식 문서
