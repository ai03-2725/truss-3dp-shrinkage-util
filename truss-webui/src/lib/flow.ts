import type { ScreenId } from './types'

/** Ordered Quad (first-time) steps (PRD §10). */
export const QUAD_STEPS: ScreenId[] = [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'Q8',
  'Q9',
]

/** Ordered Single (repeat) steps (PRD §10). */
export const SINGLE_STEPS: ScreenId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

/** Screens with no Back and Finish as the only action (PRD §9). */
export const FINAL_SCREENS: ReadonlySet<ScreenId> = new Set(['Q9', 'S6'])

/** Quad step list, dropping Q1 when the skip preference is set (PRD §10). */
export function quadSteps(skipPrerequisiteCheck: boolean): ScreenId[] {
  return skipPrerequisiteCheck
    ? QUAD_STEPS.filter((screen) => screen !== 'Q1')
    : [...QUAD_STEPS]
}

/** The ordered step list containing `screen`, or null when not in a flow. */
export function stepsFor(
  screen: ScreenId,
  skipPrerequisiteCheck: boolean,
): ScreenId[] | null {
  if (screen.startsWith('Q')) return quadSteps(skipPrerequisiteCheck)
  if (screen.startsWith('S')) return [...SINGLE_STEPS]
  return null
}
