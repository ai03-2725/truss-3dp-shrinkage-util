import { createSignal } from 'solid-js'
import {
  CHECKS,
  createDraft,
  hasAnyMeasurementText,
  isChecked,
  type CalibrationDraft,
} from '../domain/draft'
import { exitDecision, type GateStatus, type ScreenId, type StepId } from '../domain/flow'
import type { SettingsStore } from '../storage/settings'
import {
  branchTarget,
  entryStep,
  FLOW_DEFINITIONS,
  stepById,
  type RegisteredStep,
} from './registry'

/**
 * The flow engine (T15, PRD §9.3, decisions 1–2).
 *
 * One shared in-memory draft, Back and Next over a registry of steps, no routing
 * and no persistence. Four rules live here and nowhere else:
 *
 * 1. **Next is gated, Back is free.** Back never re-validates: a user who wants
 *    to go back and re-read a step must never be told they cannot.
 * 2. **No mid-flow persistence.** The draft is created at flow entry and dies
 *    with the screen, so a reload restarts at step 1 by construction rather than
 *    by remembering to clear something (decision 1, §12's accepted limitation).
 * 3. **Exit confirmation is a function of the draft, not of the step number.**
 *    It appears once measurements exist and before the flow completes, so the
 *    rule cannot drift out of step with the flow's shape as steps are added.
 * 4. **Navigation is internal state.** No URL, no history, no deep links — the
 *    browser's Back button is explicitly not a navigation mechanism here, and
 *    touching it would rewrite the *host page's* URL (PRD §6.1).
 */

export interface FlowEngine {
  /* State */
  screen(): ScreenId
  /** The current step, or `null` when not in a calibration flow. */
  step(): RegisteredStep | null
  draft(): CalibrationDraft
  /** The current step's gate, evaluated against the live draft. */
  gate(): GateStatus
  /** Whether the run has reached its results or final step. */
  isComplete(): boolean

  /* Navigation */
  goToLanding(): void
  goToPrinters(): void
  /** Enter the calibration flow with a fresh draft. */
  startCalibration(): void
  next(): void
  back(): void

  /* Exit */
  exitRequested(): boolean
  /** Ask to leave the flow; may set the confirmation flag instead of leaving. */
  requestExit(): void
  confirmExit(): void
  cancelExit(): void

  /* Draft */
  updateDraft(update: (draft: CalibrationDraft) => CalibrationDraft): void
}

export interface FlowEngineDependencies {
  readonly settings: Pick<SettingsStore, 'skipPrerequisites'>
}

export function createFlowEngine(dependencies: FlowEngineDependencies): FlowEngine {
  const [screen, setScreen] = createSignal<ScreenId>('landing')
  const [stepId, setStepId] = createSignal<StepId | null>(null)
  const [draft, setDraft] = createSignal<CalibrationDraft>(createDraft('quad'))
  const [exitRequested, setExitRequested] = createSignal(false)

  function currentStep(): RegisteredStep | null {
    const id = stepId()
    return id === null ? null : stepById(id)
  }

  function isComplete(): boolean {
    const current = currentStep()
    if (current === null) {
      return false
    }
    const definition = FLOW_DEFINITIONS[draft().flow]
    return current.id === definition.resultsStep || current.id === definition.lastStep
  }

  function goToLanding(): void {
    setExitRequested(false)
    setStepId(null)
    // The draft dies with the flow: leaving and re-entering starts clean, which
    // is the same rule as a page reload.
    setDraft(createDraft('quad'))
    setScreen('landing')
  }

  function requestExit(): void {
    const decision = exitDecision({
      hasMeasurements: hasAnyMeasurementText(draft()),
      isComplete: isComplete(),
    })
    if (decision === 'confirm') {
      setExitRequested(true)
      return
    }
    goToLanding()
  }

  return {
    screen,
    step: currentStep,
    draft,
    isComplete,

    gate(): GateStatus {
      const current = currentStep()
      return current === null ? { allowed: false, reason: null } : current.gate(draft())
    },

    goToLanding,

    goToPrinters(): void {
      setExitRequested(false)
      setScreen('printers')
    },

    startCalibration(): void {
      // A fresh draft every time: this is what "flow re-entry resets the draft"
      // and "reload restarts at step 1" reduce to (T15.3).
      setDraft(createDraft('quad'))
      setStepId(entryStep(dependencies.settings.skipPrerequisites()))
      setExitRequested(false)
      setScreen('flow')
    },

    next(): void {
      const current = currentStep()
      if (current === null || !current.gate(draft()).allowed) {
        return
      }

      if (current.id === 'C2') {
        // The branch: the only step whose destination is the user's answer. The
        // draft's flow switches here, which is what makes the results screens and
        // the exit rule agree about which flow is running.
        const target = branchTarget({ firstTime: isChecked(draft(), CHECKS.firstTime) })
        setDraft((previous) => ({ ...previous, flow: target.flow }))
        setStepId(target.step)
        return
      }

      if (current.next === null) {
        return
      }
      setStepId(current.next)
    },

    back(): void {
      const current = currentStep()
      if (current === null) {
        return
      }
      if (current.back === null) {
        // The first step's Back *is* Exit, routed through the same rule so the
        // two paths cannot disagree about when to confirm.
        requestExit()
        return
      }
      setStepId(current.back)
    },

    exitRequested,

    requestExit,

    confirmExit(): void {
      goToLanding()
    },

    cancelExit(): void {
      setExitRequested(false)
    },

    updateDraft(update: (current: CalibrationDraft) => CalibrationDraft): void {
      setDraft((current) => update(current))
    },
  }
}
