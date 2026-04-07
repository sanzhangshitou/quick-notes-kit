import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface NoteRecord {
  id: number
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface NoteInput {
  title: string
  content: string
  tags: string[]
}

export class NotesDatabase {
  private readonly db: DatabaseSync

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true })
    this.db = new DatabaseSync(filePath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    this.ensureTagsColumn()
  }

  list(): NoteRecord[] {
    const statement = this.db.prepare(`
      SELECT id, title, content, tags, created_at, updated_at
      FROM notes
      ORDER BY updated_at DESC, id DESC
    `)

    return statement.all().map(this.mapNote)
  }

  create(input: NoteInput): NoteRecord {
    const timestamp = new Date().toISOString()
    const title = input.title.trim() || '未命名笔记'
    const content = input.content
    const tags = JSON.stringify(this.normalizeTags(input.tags))
    const statement = this.db.prepare(`
      INSERT INTO notes (title, content, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = statement.run(title, content, tags, timestamp, timestamp)
    return this.getById(Number(result.lastInsertRowid))
  }

  update(id: number, input: NoteInput): NoteRecord {
    const timestamp = new Date().toISOString()
    const title = input.title.trim() || '未命名笔记'
    const content = input.content
    const tags = JSON.stringify(this.normalizeTags(input.tags))
    const statement = this.db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `)

    const result = statement.run(title, content, tags, timestamp, id)
    if (result.changes === 0) {
      throw new Error(`Note ${id} not found`)
    }

    return this.getById(id)
  }

  delete(id: number): void {
    const statement = this.db.prepare('DELETE FROM notes WHERE id = ?')
    statement.run(id)
  }

  close(): void {
    this.db.close()
  }

  private getById(id: number): NoteRecord {
    const statement = this.db.prepare(`
      SELECT id, title, content, tags, created_at, updated_at
      FROM notes
      WHERE id = ?
    `)

    const row = statement.get(id)
    if (!row) {
      throw new Error(`Note ${id} not found`)
    }

    return this.mapNote(row)
  }

  private readonly mapNote = (row: Record<string, unknown>): NoteRecord => ({
    id: Number(row.id),
    title: String(row.title),
    content: String(row.content),
    tags: this.parseTags(row.tags),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  })

  private ensureTagsColumn(): void {
    const columns = this.db.prepare('PRAGMA table_info(notes)').all() as Array<{ name: string }>
    if (!columns.some((column) => column.name === 'tags')) {
      this.db.exec(`ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`)
    }
  }

  private normalizeTags(tags: string[]): string[] {
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
  }

  private parseTags(value: unknown): string[] {
    try {
      const parsed = JSON.parse(String(value ?? '[]')) as unknown
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    } catch {
      return []
    }
  }
}
