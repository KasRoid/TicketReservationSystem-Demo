const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'mysql';
    this.pool = null;
    this.config = this.getConfig();
  }

  getConfig() {
    if (this.dbType === 'mysql') {
      return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'dbuser',
        password: process.env.DB_PASSWORD || 'dbpass1234',
        database: process.env.DB_NAME || 'reservation_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      };
    } else {
      return {
        host: process.env.PG_HOST || '127.0.0.1',
        port: parseInt(process.env.PG_PORT || '5432'),
        user: process.env.PG_USER || 'dbuser',
        password: process.env.PG_PASSWORD || 'dbpass1234',
        database: process.env.PG_NAME || 'reservation_db',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }
  }

  async initialize() {
    try {
      if (this.dbType === 'mysql') {
        this.pool = await mysql.createPool(this.config);
        console.log('✅ MySQL connection pool created');

        // Test connection
        const connection = await this.pool.getConnection();
        const [rows] = await connection.query('SELECT 1 as test');
        connection.release();
        console.log('✅ MySQL connection test successful');
      } else {
        this.pool = new Pool(this.config);
        console.log('✅ PostgreSQL connection pool created');

        // Test connection
        const client = await this.pool.connect();
        const result = await client.query('SELECT 1 as test');
        client.release();
        console.log('✅ PostgreSQL connection test successful');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async getConnection() {
    if (!this.pool) {
      await this.initialize();
    }

    if (this.dbType === 'mysql') {
      return await this.pool.getConnection();
    } else {
      return await this.pool.connect();
    }
  }

  // 격리 수준 설정 헬퍼
  async setIsolationLevel(connection, level) {
    const isolationLevels = {
      RU: 'READ UNCOMMITTED',
      RC: 'READ COMMITTED',
      RR: 'REPEATABLE READ',
      S: 'SERIALIZABLE',
    };

    const sqlLevel = isolationLevels[level] || level;

    if (this.dbType === 'mysql') {
      await connection.query(`SET TRANSACTION ISOLATION LEVEL ${sqlLevel}`);
    } else {
      await connection.query(`SET TRANSACTION ISOLATION LEVEL ${sqlLevel}`);
    }

    console.log(`🔧 Isolation level set to: ${sqlLevel}`);
  }

  // 현재 격리 수준 확인
  async getCurrentIsolationLevel(connection) {
    let result;
    if (this.dbType === 'mysql') {
      [result] = await connection.query(
        'SELECT @@transaction_isolation as level',
      );
      return result[0].level;
    } else {
      result = await connection.query('SHOW transaction_isolation');
      return result.rows[0].transaction_isolation;
    }
  }

  // 트랜잭션 시작
  async beginTransaction(connection, isolationLevel = null) {
    if (isolationLevel) {
      await this.setIsolationLevel(connection, isolationLevel);
    }

    if (this.dbType === 'mysql') {
      await connection.beginTransaction();
    } else {
      await connection.query('BEGIN');
    }
  }

  // 트랜잭션 커밋
  async commit(connection) {
    if (this.dbType === 'mysql') {
      await connection.commit();
    } else {
      await connection.query('COMMIT');
    }
  }

  // 트랜잭션 롤백
  async rollback(connection) {
    if (this.dbType === 'mysql') {
      await connection.rollback();
    } else {
      await connection.query('ROLLBACK');
    }
  }

  // 연결 해제
  async releaseConnection(connection) {
    if (this.dbType === 'mysql') {
      connection.release();
    } else {
      connection.release();
    }
  }

  // 쿼리 실행 헬퍼
  async query(connection, sql, params = []) {
    if (this.dbType === 'mysql') {
      const [rows] = await connection.query(sql, params);
      return rows;
    } else {
      // PostgreSQL parameter binding: $1, $2, ...
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      const result = await connection.query(pgSql, params);
      return result.rows;
    }
  }

  // 풀 종료
  async close() {
    if (this.pool) {
      if (this.dbType === 'mysql') {
        await this.pool.end();
      } else {
        await this.pool.end();
      }
      console.log('✅ Database pool closed');
    }
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
