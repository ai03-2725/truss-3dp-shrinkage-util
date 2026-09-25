// Pure numerical rules shared by both flows and printer management.
// No UI, DOM, or persistence here.

import type { BeamInput } from './types.ts'

export const DESIGN_LENGTH = 140

// A period-separated positive decimal (leading digit optional). Rejects commas,
// signs, exponents, whitespace-only, and anything non-numeric.
const DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/

export function parsePositiveDecimal(raw: string): number | null {
  const text = raw.trim()
  if (!DECIMAL.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function quadAverage(readings: number[]): number {
  return average(readings)
}

export function xAverage(outer: number, inner: number): number {
  return average([outer, inner])
}

export function calcPrinterFactor(quadAvg: number, xAvg: number): number {
  return quadAvg / xAvg
}

export function calcQuadShrinkage(quadAvg: number): number {
  return quadAvg / DESIGN_LENGTH
}

export function calcSingleShrinkage(xAvg: number, printerFactor: number): number {
  return (xAvg * printerFactor) / DESIGN_LENGTH
}

export function calcRecommendedXYPercent(currentXYPercent: number, shrinkage: number): number {
  return currentXYPercent * shrinkage
}

// Warnings are non-blocking. Round the gap before comparing so a true 0.4 mm
// difference is not flagged by floating-point error.
export function isLengthOutOfRange(length: number): boolean {
  return length < 135 || length > 142
}

export function isGapWarning(outer: number, inner: number): boolean {
  return Number(Math.abs(outer - inner).toFixed(6)) > 0.4
}

export function beamHasGapWarning(beam: BeamInput): boolean {
  const outer = parsePositiveDecimal(beam.outer)
  const inner = parsePositiveDecimal(beam.inner)
  return outer !== null && inner !== null && isGapWarning(outer, inner)
}

export function isPercentOutOfRange(percent: number): boolean {
  return percent < 90 || percent > 110
}

export function isFactorOutOfRange(factor: number): boolean {
  return factor < 0.9 || factor > 1.1
}

export function normalizeName(name: string): string {
  return name.trim()
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}

// Display-only rounding. Stored/derived numbers stay full precision.
function roundDisplay(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)))
}

export function formatShrinkage(value: number): string {
  return roundDisplay(value, 10)
}

export function formatPercent(value: number): string {
  return roundDisplay(value, 4)
}
