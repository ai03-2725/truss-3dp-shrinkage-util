import type { CalibrationDraft } from './draft'
import type { FlowId } from './types'

/**
 * Flow-engine contracts (PRD §9).
 *
 * The engine itself lands in T15; these are the shapes it and every step agree
 * on, defined here so the two never drift apart.
 */

/** App-level destinations. There is no routing: every one of these is internal state (PRD §6.1). */
export const SCREENS = ['landing', 'flow', 'printers'] as const

export type ScreenId = (typeof SCREENS)[number]

/** Steps shared by both flows (PRD §9.2). */
export type CommonStepId = 'C1' | 'C2'

/** Quad (first-time) flow steps (PRD §9.3). */
export type QuadStepId = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7' | 'Q8'

/** Single (quick) flow steps (PRD §9.4). */
export type SingleStepId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'

export type StepId = CommonStepId | QuadStepId | SingleStepId

/**
 * Whether a step may be left, and if not, the reason to show and associate with
 * the gated control (T16.2).
 *
 * A blocked gate is always accompanied by a reason: a disabled Next with no
 * explanation is the most common way a gated flow becomes unsupportable.
 */
export interface GateStatus {
  readonly allowed: boolean
  readonly reason: string | null
}

export const OPEN_GATE: GateStatus = { allowed: true, reason: null }

export function blockedGate(reason: string): GateStatus {
  return { allowed: false, reason }
}

/**
 * One step of a flow.
 *
 * `title` is the step heading and, per PRD §6.4, the focus target on entry —
 * the view is replaced wholesale, so without moving focus there, keyboard and
 * screen-reader users are stranded on a destroyed element.
 *
 * `back === null` means "leaving the flow", which is what makes the Back control
 * and the Exit control the same code path.
 */
export interface StepDefinition {
  readonly id: StepId
  readonly flow: FlowId
  readonly title: string
  /** Evaluated against the shared draft; never mutates it. */
  readonly gate: (draft: CalibrationDraft) => GateStatus
  readonly next: StepId | null
  readonly back: StepId | null
}

/*
 * The exit rule that used to live here (`exitDecision`) is gone.
 *
 * It confirmed once a measurement existed and stayed quiet before that, which
 * made one control mean two different things on two different screens with
 * nothing on screen to say which it would be. Cancelling the flow now always
 * asks; `hasMeasurements` in the engine decides only what the confirmation's
 * wording is honest about.
 */
