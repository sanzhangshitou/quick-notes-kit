import type { ToolMeta } from '../types'

export const tools: ToolMeta[] = [
  {
    id: 'local-notes',
    name: '本地记事本',
    summary: '基于 SQLite 的本地笔记管理。',
    category: '笔记'
  },
  {
    id: 'totp-manager',
    name: '二次验证码',
    summary: '管理 Google Authenticator 风格的动态验证码。',
    category: '安全'
  },
  {
    id: 'json-php-array',
    name: 'JSON / PHP 数组',
    summary: '在 JSON 与 PHP 数组语法之间双向转换。',
    category: '开发'
  },
  {
    id: 'text-stats',
    name: '文本统计',
    summary: '统计字符、词数、行数与字节数。',
    category: '文本'
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    summary: '格式化或压缩 JSON 内容。',
    category: '开发'
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    summary: '在时间戳与可读时间之间切换。',
    category: '时间'
  },
  { id: 'base64', name: 'Base64 编解码', summary: '处理常见文本编码转换。', category: '编码' },
  { id: 'url-codec', name: 'URL 编解码', summary: '快速转换 URL 和查询参数。', category: '编码' },
  {
    id: 'password-generator',
    name: '密码生成器',
    summary: '生成高强度随机密码。',
    category: '安全'
  },
  { id: 'hash-generator', name: '哈希校验', summary: '生成 SHA 摘要用于校验。', category: '安全' },
  {
    id: 'unit-converter',
    name: '单位换算',
    summary: '支持长度、重量和存储换算。',
    category: '换算'
  },
  { id: 'color-converter', name: '颜色转换', summary: '查看 HEX、RGB 和 HSL。', category: '设计' },
  { id: 'regex-tester', name: '正则测试', summary: '测试表达式并查看匹配结果。', category: '开发' }
]
