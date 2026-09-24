// Flow step identifiers and ordering. Kept out of components so storage can
// reject unknown steps and App can compute Back/Next deterministically.

export const QUAD_STEPS = [
  'quad-equipment',
  'quad-filament',
  'quad-slice',
  'quad-print',
  'quad-locate',
  'quad-x',
  'quad-yab',
  'quad-name',
  'quad-result',
] as const

export const SINGLE_STEPS = [
  'single-printer',
  'single-filament',
  'single-slice',
  'single-print',
  'single-measure',
  'single-result',
] as const

export type FlowStep = (typeof QUAD_STEPS)[number] | (typeof SINGLE_STEPS)[number]

export function isKnownStep(step: string): step is FlowStep {
  return (QUAD_STEPS as readonly string[]).includes(step) || (SINGLE_STEPS as readonly string[]).includes(step)
}

export function isResultStep(step: string): boolean {
  return step === 'quad-result' || step === 'single-result'
}

export function previousStep(step: string): string | null {
  const list: readonly string[] = step.startsWith('quad') ? QUAD_STEPS : SINGLE_STEPS
  const index = list.indexOf(step)
  return index > 0 ? list[index - 1] : null
}
