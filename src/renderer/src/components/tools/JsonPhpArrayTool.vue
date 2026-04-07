<script setup lang="ts">
import { ref } from 'vue'

const mode = ref<'json-to-php' | 'php-to-json'>('json-to-php')
const pretty = ref(true)
const input = ref(
  '{\n  "name": "quick-notes-kit",\n  "tags": ["desktop", "tools"],\n  "enabled": true,\n  "count": 2\n}'
)
const output = ref('')
const error = ref('')

function convert(): void {
  try {
    output.value =
      mode.value === 'json-to-php'
        ? stringifyPhpArray(JSON.parse(input.value), 0, pretty.value)
        : JSON.stringify(parsePhpValue(input.value), null, pretty.value ? 2 : 0)
    error.value = ''
  } catch (err) {
    output.value = ''
    error.value = err instanceof Error ? err.message : '转换失败'
  }
}

async function copyOutput(): Promise<void> {
  if (output.value) {
    await navigator.clipboard.writeText(output.value)
  }
}

function fillExample(): void {
  input.value =
    mode.value === 'json-to-php'
      ? '{\n  "user": {\n    "name": "Alice",\n    "roles": ["admin", "editor"],\n    "active": true\n  },\n  "count": 2\n}'
      : "[\n  'user' => [\n    'name' => 'Alice',\n    'roles' => ['admin', 'editor'],\n    'active' => true,\n  ],\n  'count' => 2,\n]"
  convert()
}

function stringifyPhpArray(value: unknown, indent = 0, formatted = true): string {
  const space = '  '.repeat(indent)
  const nextSpace = '  '.repeat(indent + 1)
  const newline = formatted ? '\n' : ''
  const separator = formatted ? ',\n' : ', '

  if (value === null) return 'null'
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((item) =>
      formatted
        ? `${nextSpace}${stringifyPhpArray(item, indent + 1, formatted)}`
        : stringifyPhpArray(item, indent + 1, formatted)
    )
    return formatted
      ? `[${newline}${items.join(separator)}${newline}${space}]`
      : `[${items.join(separator)}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '[]'
    const items = entries.map(([key, item]) => {
      const rendered = `'${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' => ${stringifyPhpArray(item, indent + 1, formatted)}`
      return formatted ? `${nextSpace}${rendered}` : rendered
    })
    return formatted
      ? `[${newline}${items.join(separator)}${newline}${space}]`
      : `[${items.join(separator)}]`
  }

  throw new Error('存在不支持的值类型')
}

type PhpToken =
  | { type: '[' | ']' | '(' | ')' | ',' | ';' | '=>' }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }

function tokenize(source: string): PhpToken[] {
  const tokens: PhpToken[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (
      char === '[' ||
      char === ']' ||
      char === '(' ||
      char === ')' ||
      char === ',' ||
      char === ';'
    ) {
      tokens.push({ type: char })
      index += 1
      continue
    }

    if (char === '=' && source[index + 1] === '>') {
      tokens.push({ type: '=>' })
      index += 2
      continue
    }

    if (char === "'" || char === '"') {
      const quote = char
      index += 1
      let value = ''
      while (index < source.length) {
        const next = source[index]
        if (next === '\\') {
          value += source[index + 1] ?? ''
          index += 2
          continue
        }
        if (next === quote) {
          index += 1
          break
        }
        value += next
        index += 1
      }
      tokens.push({ type: 'string', value })
      continue
    }

    if (/[0-9-]/.test(char)) {
      const match = source.slice(index).match(/^-?\d+(\.\d+)?/)
      if (!match) throw new Error('数字格式无效')
      tokens.push({ type: 'number', value: Number(match[0]) })
      index += match[0].length
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_-]*/)
      if (!match) throw new Error('标识符格式无效')
      tokens.push({ type: 'identifier', value: match[0] })
      index += match[0].length
      continue
    }

    throw new Error(`无法识别的字符: ${char}`)
  }

  return tokens
}

function parsePhpValue(source: string): unknown {
  const tokens = tokenize(source)
  let index = 0

  function peek(): PhpToken | undefined {
    return tokens[index]
  }

  function consume<T extends PhpToken['type']>(type?: T): PhpToken {
    const token = tokens[index]
    if (!token) throw new Error('输入提前结束')
    if (type && token.type !== type) throw new Error(`期望 ${type}，实际为 ${token.type}`)
    index += 1
    return token
  }

  function parseValue(): unknown {
    const token = peek()
    if (!token) throw new Error('缺少值')

    if (token.type === '[') return parseArrayBracket()
    if (token.type === 'identifier' && token.value.toLowerCase() === 'array')
      return parseArrayFunction()
    if (token.type === 'string') {
      const stringToken = consume('string') as Extract<PhpToken, { type: 'string' }>
      return stringToken.value
    }
    if (token.type === 'number') {
      const numberToken = consume('number') as Extract<PhpToken, { type: 'number' }>
      return numberToken.value
    }
    if (token.type === 'identifier') {
      const identifierToken = consume('identifier') as Extract<PhpToken, { type: 'identifier' }>
      const value = identifierToken.value.toLowerCase()
      if (value === 'true') return true
      if (value === 'false') return false
      if (value === 'null') return null
      throw new Error(`不支持的标识符: ${value}`)
    }

    throw new Error(`无法解析 token: ${token.type}`)
  }

  function parseArrayEntries(closeToken: ']' | ')'): unknown {
    const items: Array<{ keyed: boolean; key?: string | number; value: unknown }> = []

    while (peek() && peek()?.type !== closeToken) {
      const first = parseValue()
      if (peek()?.type === '=>') {
        consume('=>')
        const nextValue = parseValue()
        if (typeof first !== 'string' && typeof first !== 'number') {
          throw new Error('PHP 数组键仅支持字符串或数字')
        }
        items.push({ keyed: true, key: first, value: nextValue })
      } else {
        items.push({ keyed: false, value: first })
      }

      if (peek()?.type === ',' || peek()?.type === ';') {
        consume()
      }
    }

    consume(closeToken)

    const hasKeyed = items.some((item) => item.keyed)
    if (!hasKeyed) {
      return items.map((item) => item.value)
    }

    const record: Record<string, unknown> = {}
    items.forEach((item, itemIndex) => {
      const key = item.keyed ? String(item.key) : String(itemIndex)
      record[key] = item.value
    })
    return record
  }

  function parseArrayBracket(): unknown {
    consume('[')
    return parseArrayEntries(']')
  }

  function parseArrayFunction(): unknown {
    consume('identifier')
    consume('(')
    return parseArrayEntries(')')
  }

  const result = parseValue()
  if (index < tokens.length) {
    throw new Error('存在未解析的剩余内容')
  }
  return result
}

convert()
</script>

<template>
  <div class="tool-panel">
    <div class="toolbar">
      <select v-model="mode">
        <option value="json-to-php">JSON 转 PHP 数组</option>
        <option value="php-to-json">PHP 数组转 JSON</option>
      </select>
      <select v-model="pretty">
        <option :value="true">美化输出</option>
        <option :value="false">压缩输出</option>
      </select>
      <button type="button" class="ghost-button" @click="fillExample">示例</button>
      <button type="button" class="ghost-button" @click="convert">执行转换</button>
      <button type="button" class="ghost-button" @click="copyOutput">复制结果</button>
    </div>
    <textarea
      v-model="input"
      rows="10"
      spellcheck="false"
      :placeholder="
        mode === 'json-to-php' ? '输入 JSON' : '输入 PHP 数组，例如 array(...) 或 [...]'
      "
    />
    <p v-if="error" class="error-text">{{ error }}</p>
    <textarea :value="output" rows="10" readonly placeholder="转换结果" />
  </div>
</template>
