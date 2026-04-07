import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

export interface TotpInput {
  issuer: string
  accountName: string
  secret: string
  digits?: number
  period?: number
}

export interface TotpRecord {
  id: number
  issuer: string
  accountName: string
  secret: string
  digits: number
  period: number
  createdAt: string
}

export interface TotpDisplayRecord {
  id: number
  issuer: string
  accountName: string
  digits: number
  period: number
  code: string
  remainingSeconds: number
}

export interface TotpImportResult {
  imported: number
  skipped: number
}

export class TotpStore {
  private readonly db: DatabaseSync

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true })
    this.db = new DatabaseSync(filePath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS totp_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issuer TEXT NOT NULL,
        account_name TEXT NOT NULL,
        secret TEXT NOT NULL,
        digits INTEGER NOT NULL DEFAULT 6,
        period INTEGER NOT NULL DEFAULT 30,
        created_at TEXT NOT NULL
      )
    `)
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_totp_unique_account
      ON totp_accounts (issuer, account_name, secret, digits, period)
    `)
  }

  list(): TotpDisplayRecord[] {
    const now = Math.floor(Date.now() / 1000)
    const statement = this.db.prepare(`
      SELECT id, issuer, account_name, secret, digits, period, created_at
      FROM totp_accounts
      ORDER BY issuer COLLATE NOCASE ASC, account_name COLLATE NOCASE ASC
    `)

    return statement.all().map((row) => {
      const record = this.mapRow(row as Record<string, unknown>)
      const remainder = now % record.period
      return {
        id: record.id,
        issuer: record.issuer,
        accountName: record.accountName,
        digits: record.digits,
        period: record.period,
        code: generateTotpCode(record.secret, record.digits, record.period, now),
        remainingSeconds: remainder === 0 ? record.period : record.period - remainder
      }
    })
  }

  create(input: TotpInput): TotpDisplayRecord {
    const normalized = this.normalize(input)
    const createdAt = new Date().toISOString()
    const statement = this.db.prepare(`
      INSERT INTO totp_accounts (issuer, account_name, secret, digits, period, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const result = statement.run(
      normalized.issuer,
      normalized.accountName,
      normalized.secret,
      normalized.digits,
      normalized.period,
      createdAt
    )

    return this.getDisplayById(Number(result.lastInsertRowid))
  }

  exportAll(): Omit<TotpRecord, 'id' | 'createdAt'>[] {
    const statement = this.db.prepare(`
      SELECT issuer, account_name, secret, digits, period
      FROM totp_accounts
      ORDER BY issuer COLLATE NOCASE ASC, account_name COLLATE NOCASE ASC
    `)

    return statement.all().map((row) => {
      const record = row as Record<string, unknown>
      return {
        issuer: String(record.issuer),
        accountName: String(record.account_name),
        secret: String(record.secret),
        digits: Number(record.digits),
        period: Number(record.period)
      }
    })
  }

  importMany(inputs: TotpInput[]): TotpImportResult {
    let imported = 0
    let skipped = 0

    const statement = this.db.prepare(`
      INSERT OR IGNORE INTO totp_accounts (issuer, account_name, secret, digits, period, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const input of inputs) {
      const normalized = this.normalize(input)
      const result = statement.run(
        normalized.issuer,
        normalized.accountName,
        normalized.secret,
        normalized.digits,
        normalized.period,
        new Date().toISOString()
      )

      if (Number(result.changes) > 0) {
        imported += 1
      } else {
        skipped += 1
      }
    }

    return { imported, skipped }
  }

  delete(id: number): void {
    const statement = this.db.prepare('DELETE FROM totp_accounts WHERE id = ?')
    statement.run(id)
  }

  close(): void {
    this.db.close()
  }

  private getDisplayById(id: number): TotpDisplayRecord {
    const statement = this.db.prepare(`
      SELECT id, issuer, account_name, secret, digits, period, created_at
      FROM totp_accounts
      WHERE id = ?
    `)
    const row = statement.get(id)
    if (!row) {
      throw new Error(`TOTP account ${id} not found`)
    }

    const record = this.mapRow(row as Record<string, unknown>)
    const now = Math.floor(Date.now() / 1000)
    const remainder = now % record.period
    return {
      id: record.id,
      issuer: record.issuer,
      accountName: record.accountName,
      digits: record.digits,
      period: record.period,
      code: generateTotpCode(record.secret, record.digits, record.period, now),
      remainingSeconds: remainder === 0 ? record.period : record.period - remainder
    }
  }

  private normalize(input: TotpInput): TotpRecord {
    const issuer = input.issuer.trim() || '未命名服务'
    const accountName = input.accountName.trim() || '未命名账号'
    const secret = input.secret.replace(/\s+/g, '').toUpperCase()
    if (!/^[A-Z2-7]+=*$/.test(secret)) {
      throw new Error('密钥格式无效，请输入 Base32 格式的 Google 验证器密钥')
    }

    const digits = input.digits === 8 ? 8 : 6
    const period = input.period === 60 ? 60 : 30

    return {
      id: 0,
      issuer,
      accountName,
      secret,
      digits,
      period,
      createdAt: new Date().toISOString()
    }
  }

  private mapRow(row: Record<string, unknown>): TotpRecord {
    return {
      id: Number(row.id),
      issuer: String(row.issuer),
      accountName: String(row.account_name),
      secret: String(row.secret),
      digits: Number(row.digits),
      period: Number(row.period),
      createdAt: String(row.created_at)
    }
  }
}

function generateTotpCode(
  secret: string,
  digits: number,
  period: number,
  timestampSeconds: number
): string {
  const key = decodeBase32(secret)
  const counter = Math.floor(timestampSeconds / period)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buffer.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', key).update(buffer).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(binary % 10 ** digits).padStart(digits, '0')
}

function decodeBase32(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const normalized = input.replace(/=+$/g, '')
  let bits = ''

  for (const char of normalized) {
    const value = alphabet.indexOf(char)
    if (value < 0) {
      throw new Error('密钥格式无效，请输入 Base32 格式的 Google 验证器密钥')
    }
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2))
  }

  return Buffer.from(bytes)
}
