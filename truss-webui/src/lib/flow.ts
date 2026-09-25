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

// 1-based position and effective total for the step indicator. Skipping the
// equipment check drops that step from both the count and the total.
export function flowProgress(
  step: string,
  skipEquipment: boolean,
): { current: number; total: number } | null {
  const isQuad = step.startsWith('quad')
  // Keep the equipment step while the user is on it, even if they just ticked
  // "skip", so the indicator does not disappear mid-screen.
  const skip = isQuad && skipEquipment && step !== 'quad-equipment'
  const list: readonly string[] = (isQuad ? QUAD_STEPS : SINGLE_STEPS).filter(
    (candidate) => !(skip && candidate === 'quad-equipment'),
  )
  const index = list.indexOf(step)
  return index < 0 ? null : { current: index + 1, total: list.length }
}
