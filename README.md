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

3. 환경변수 설정

```bash
cp .env.example .env
# .env 파일 수정
```

4. 데이터베이스 시작

```bash
npm run db:up
```

5. 테스트 실행

```bash
npm test
```

## 📁 프로젝트 구조

```
seat-reservation/
├── docker-compose.yml      # Docker 설정
├── package.json           # Node.js 설정
├── .env                   # 환경변수
├── database/
│   ├── 01-schema.sql     # DB 스키마
│   └── 02-init-data.sql  # 초기 데이터
├── src/
│   ├── config/           # 설정 파일
│   ├── services/         # 비즈니스 로직
│   └── tests/            # 테스트 코드
└── logs/                  # 로그 파일
```

## 🧪 테스트 시나리오

### 1. 격리 수준 테스트

- READ UNCOMMITTED
- READ COMMITTED
- REPEATABLE READ
- SERIALIZABLE

### 2. 동시성 문제 재현

- Dirty Read
- Non-repeatable Read
- Phantom Read

### 3. 락 전략 비교

- 비관적 락 (Pessimistic Lock)
- 낙관적 락 (Optimistic Lock)

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

### MySQL 관련

- 연결 실패 시 1-2분 대기 후 재시도
- 권한 문제 시 root 계정으로 접속

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

- 데이터베이스 수업 자료
- MySQL 공식 문서
- Docker 공식 문서
