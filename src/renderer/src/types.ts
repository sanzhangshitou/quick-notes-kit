export type ToolId =
  | 'local-notes'
  | 'totp-manager'
  | 'json-php-array'
  | 'text-stats'
  | 'json-formatter'
  | 'timestamp-converter'
  | 'base64'
  | 'url-codec'
  | 'password-generator'
  | 'hash-generator'
  | 'unit-converter'
  | 'color-converter'
  | 'regex-tester'

export interface ToolMeta {
  id: ToolId
  name: string
  summary: string
  category: string
}
