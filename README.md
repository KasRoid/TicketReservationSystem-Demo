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
