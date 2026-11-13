import type { AppSettings } from '../types'

/**
 * 内置在线识别接口地址：用户无需填写，界面也不展示。
 * 更换服务商时只需改这一处常量。
 */
export const AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

const SEAL_TAG = 'ndmseal1'
const SEAL_SALT = 'family-nutritionist-local-seal-v1'

/** 是否已填入密钥 */
export function hasAiKey(settings: AppSettings): boolean {
  return Boolean(settings.aiKeyEncrypted)
}

/** 界面只显示状态，不明文回显、不显示尾号 */
export function aiKeyStatus(settings: AppSettings): string {
  return hasAiKey(settings) ? '已设置（加密保存）' : '未设置'
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text)
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function xorScramble(bytes: Uint8Array): Uint8Array {
  const salt = new TextEncoder().encode(SEAL_SALT)
  return bytes.map((value, index) => value ^ salt[index % salt.length])
}

async function deriveAesKey(subtle: SubtleCrypto): Promise<CryptoKey> {
  const salt = new TextEncoder().encode(SEAL_SALT)
  const material = await subtle.importKey('raw', salt, 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * 加密密钥后存本地。
 * 优先 Web Crypto AES-GCM；环境不支持时降级为可逆混淆并如实标注 obf。
 * 注意：纯前端方案下密钥仍可能被从本机提取，不等同于服务端级隐藏。
 */
export async function sealKey(plain: string): Promise<string> {
  const trimmed = plain.trim()
  if (!trimmed) return ''
  const data = new TextEncoder().encode(trimmed)
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    return `${SEAL_TAG}:obf:${bytesToBase64(xorScramble(data))}`
  }
  const iv = cryptoObj.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(cryptoObj.subtle)
  const cipher = await cryptoObj.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return `${SEAL_TAG}:aes:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`
}

/** 取回明文，仅供在线识别调用；界面不调用、不回显 */
export async function openKey(sealed: string | undefined): Promise<string | null> {
  if (!sealed) return null
  const parts = sealed.split(':')
  if (parts[0] !== SEAL_TAG) return null
  const cryptoObj = globalThis.crypto
  if (parts[1] === 'obf' && parts[2]) {
    return new TextDecoder().decode(xorScramble(base64ToBytes(parts[2])))
  }
  if (parts[1] === 'aes' && parts[2] && parts[3] && cryptoObj?.subtle) {
    const key = await deriveAesKey(cryptoObj.subtle)
    const plain = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parts[2]) },
      key,
      base64ToBytes(parts[3]),
    )
    return new TextDecoder().decode(new Uint8Array(plain))
  }
  return null
}
