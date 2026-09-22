import { STORE_VERSION } from './constants'
import type { Printer } from './types'

/** Build the versioned export payload (PRD §7.3). */
export function buildExportJson(printers: Printer[]): string {
  return JSON.stringify({ version: STORE_VERSION, printers }, null, 2)
}

/** Timestamped export filename, e.g. `truss-printers-20240102-030405.json`. */
export function exportFilename(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `truss-printers-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.json`
}
