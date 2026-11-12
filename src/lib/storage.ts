import { openDB, type IDBPDatabase } from 'idb'
import type { AppData } from '../types'

const DB_NAME = 'family-nutritionist'
const STORE_NAME = 'app-data'
const STORAGE_KEY = 'family-nutritionist-data'
const DB_TIMEOUT_MS = 1500

let dbPromise: Promise<IDBPDatabase | null> | null = null

function getDb(): Promise<IDBPDatabase | null> | null {
  if (typeof indexedDB === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    }).catch(error => {
      console.warn('IndexedDB 不可用，改用备用存储', error)
      dbPromise = null
      return null
    })
  }
  return dbPromise
}

// IndexedDB 在部分浏览器环境下可能既不成功也不失败（一直 pending），
// 加超时保证初始化不会永久卡住。
function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), DB_TIMEOUT_MS)),
  ])
}

function fallbackLoad(): AppData | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as AppData
    }
  } catch (error) {
    console.warn('备用存储读取失败', error)
  }
  return null
}

function fallbackSave(data: AppData): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch (error) {
    console.warn('备用存储写入失败', error)
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const db = getDb()
  if (db) {
    try {
      const database = await withTimeout(db, null)
      if (database) {
        await database.put(STORE_NAME, data, 'current')
        return
      }
    } catch (error) {
      console.warn('写入 IndexedDB 失败，改用备用存储', error)
      dbPromise = null
    }
  }
  fallbackSave(data)
}

export async function loadAppData(): Promise<AppData | null> {
  const db = getDb()
  if (db) {
    try {
      const database = await withTimeout(db, null)
      if (database) {
        const result = await withTimeout(
          database.get(STORE_NAME, 'current') as Promise<AppData | undefined>,
          undefined,
        )
        if (result) return result
      }
    } catch (error) {
      console.warn('读取 IndexedDB 失败，改用备用存储', error)
      dbPromise = null
    }
  }
  return fallbackLoad()
}

export async function clearAppData(): Promise<void> {
  const db = getDb()
  if (db) {
    try {
      const database = await withTimeout(db, null)
      if (database) {
        await database.delete(STORE_NAME, 'current')
        return
      }
    } catch (error) {
      console.warn('清理 IndexedDB 失败，改用备用存储', error)
      dbPromise = null
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('备用存储清理失败', error)
  }
}
