import type { ScreenId } from './types'

/** Ordered Quad flow steps. Q1 can be skipped via the saved preference. */
export const QUAD_STEPS: ScreenId[] = [
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
  'q9',
]

export const SINGLE_STEPS: ScreenId[] = ['s1', 's2', 's3', 's4', 's5', 's6']

/** Quad steps with Q1 removed when the prerequisite check is skipped. */
export function quadScreens(skipPrerequisiteCheck: boolean): ScreenId[] {
  return skipPrerequisiteCheck
    ? QUAD_STEPS.filter((screen) => screen !== 'q1')
    : QUAD_STEPS
}
