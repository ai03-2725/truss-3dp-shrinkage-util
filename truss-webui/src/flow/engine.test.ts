import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHECKS,
  chooseExclusively,
  createDraft,
  setChecked,
  setMeasurement,
  type CalibrationDraft,
} from '../domain/draft'
import type { StepId } from '../domain/flow'
import { createFlowEngine, type FlowEngine } from './engine'
import { buildGate, FLOW_DEFINITIONS, stepById, stepRegistry } from './registry'

/**
 * Flow engine tests (T15.6): gating, back/next, the exit-confirmation matrix,
 * and reload-restarts-at-step-1.
 */

function setup(skipPrerequisites = false): FlowEngine {
  return createFlowEngine({ settings: { skipPrerequisites: () => skipPrerequisites } })
}

/** Tick every check a gated step is waiting for, so Next unlocks. */
function satisfyChecks(engine: FlowEngine, keys: readonly string[]): void {
  engine.updateDraft((draft) =>
    keys.reduce((current, key) => setChecked(current, key, true), draft),
  )
}

function satisfyMeasurements(engine: FlowEngine, axes: readonly ('X' | 'Y' | 'A' | 'B')[]): void {
  engine.updateDraft((draft) =>
    axes.reduce(
      (current, axis) =>
        setMeasurement(setMeasurement(current, axis, 'outer', '137.5'), axis, 'inner', '136.5'),
      draft,
    ),
  )
}

/** Walk the flow to a given step, satisfying whatever each step requires. */
function advanceTo(
  engine: FlowEngine,
  target: StepId,
  branch: 'firstTime' | 'returning' = 'firstTime',
): void {
  const guard = 40
  for (let hop = 0; hop < guard && engine.step()?.id !== target; hop += 1) {
    const current = engine.step()
    if (current === null) {
      engine.startCalibration()
      continue
    }
    switch (current.id) {
      case 'C1':
        satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
        break
      case 'C2':
        satisfyChecks(engine, [branch === 'firstTime' ? CHECKS.firstTime : CHECKS.returning])
        break
      case 'Q1':
      case 'S2':
        satisfyChecks(engine, [
          CHECKS.filamentTemperature,
          CHECKS.filamentPressureAdvance,
          CHECKS.filamentFlowRate,
        ])
        break
      case 'Q2':
      case 'S3':
        satisfyChecks(engine, [CHECKS.sliced])
        break
      case 'Q3':
      case 'S4':
        satisfyChecks(engine, [CHECKS.printed])
        break
      case 'Q5':
      case 'S5':
      case 'S6':
        satisfyMeasurements(engine, ['X'])
        break
      case 'Q6':
        satisfyMeasurements(engine, ['Y', 'A', 'B'])
        break
      case 'Q7':
        satisfyChecks(engine, [CHECKS.printerSaved])
        break
      case 'Q8':
        satisfyMeasurements(engine, ['X', 'Y', 'A', 'B'])
        break
      case 'S1':
        satisfyChecks(engine, [CHECKS.printerSelected])
        break
      default:
        break
    }
    engine.next()
  }
}

describe('registry', () => {
  it('registers every step of both flows', () => {
    const ids = [...stepRegistry().keys()]

    for (const definition of Object.values(FLOW_DEFINITIONS)) {
      for (const step of definition.steps) {
        expect(ids, step).toContain(step)
      }
    }
  })

  it('links every step forward and back consistently', () => {
    for (const definition of Object.values(FLOW_DEFINITIONS)) {
      for (const [index, id] of definition.steps.entries()) {
        const step = stepById(id)
        const previous = definition.steps[index - 1]
        const following = definition.steps[index + 1]

        expect(step.back, `${id} back`).toBe(previous ?? null)
        // C2 branches, so its `next` is decided at runtime.
        if (id !== 'C2') {
          expect(step.next, `${id} next`).toBe(following ?? null)
        }
      }
    }
  })

  it('gives every step a title, since the heading is the focus target', () => {
    for (const step of stepRegistry().values()) {
      expect(step.title.trim().length, step.id).toBeGreaterThan(0)
    }
  })
})

describe('gate construction', () => {
  it('blocks on an unticked prerequisite and opens when all are ticked', () => {
    const gate = buildGate({ kind: 'all', keys: ['a', 'b'], reason: 'Tick both.' })
    const empty: CalibrationDraft = createDraft('quad')

    expect(gate(empty)).toEqual({ allowed: false, reason: 'Tick both.' })
    expect(gate({ ...empty, checks: { a: true } })).toEqual({
      allowed: false,
      reason: 'Tick both.',
    })
    expect(gate({ ...empty, checks: { a: true, b: true } })).toEqual({
      allowed: true,
      reason: null,
    })
  })

  it('opens an "any" gate on a single tick', () => {
    const gate = buildGate({ kind: 'any', keys: ['yes', 'no'], reason: 'Choose one.' })
    const draft = createDraft('quad')

    expect(gate(draft).allowed).toBe(false)
    expect(gate({ ...draft, checks: { no: true } }).allowed).toBe(true)
  })

  it('counts the readings still missing', () => {
    const gate = buildGate({ kind: 'measurements', axes: ['X'] })

    expect(gate(createDraft('quad'))).toEqual({
      allowed: false,
      reason: 'Enter all the measurements to continue.',
    })
  })

  it('reports partial progress only once something has been entered', () => {
    const gate = buildGate({ kind: 'measurements', axes: ['X', 'Y', 'A', 'B'] })
    let draft = createDraft('quad')
    draft = setMeasurement(draft, 'X', 'outer', '137.5')

    expect(gate(draft)).toEqual({ allowed: false, reason: '7 of 8 readings still needed.' })

    for (const axis of ['X', 'Y', 'A', 'B'] as const) {
      draft = setMeasurement(setMeasurement(draft, axis, 'outer', '137.5'), axis, 'inner', '136.5')
    }
    expect(gate(draft)).toEqual({ allowed: true, reason: null })
  })

  it('does not count an invalid reading as entered', () => {
    const gate = buildGate({ kind: 'measurements', axes: ['X'] })
    let draft = createDraft('quad')
    draft = setMeasurement(setMeasurement(draft, 'X', 'outer', '0'), 'X', 'inner', 'abc')

    expect(gate(draft).allowed).toBe(false)
  })
})

describe('entry and flow re-entry', () => {
  it('starts on the landing screen', () => {
    const engine = setup()

    expect(engine.screen()).toBe('landing')
    expect(engine.step()).toBeNull()
  })

  it('enters at C1 by default and at C2 when the flag is set', () => {
    const first = setup()
    first.startCalibration()
    expect(first.step()?.id).toBe('C1')

    const returning = setup(true)
    returning.startCalibration()
    expect(returning.step()?.id).toBe('C2')
  })

  it('resets the draft on re-entry, so nothing carries over', () => {
    const engine = setup()
    engine.startCalibration()
    satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
    engine.next()
    expect(engine.draft().checks[CHECKS.caliper]).toBe(true)

    engine.goToLanding()
    engine.startCalibration()

    expect(engine.step()?.id).toBe('C1')
    expect(engine.draft().checks).toEqual({})
  })

  it('restarts at step 1 rather than resuming, as a reload does', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q6')
    expect(engine.step()?.id).toBe('Q6')

    // A reload constructs a new engine: no draft, no step.
    const reloaded = setup()
    expect(reloaded.screen()).toBe('landing')
    reloaded.startCalibration()
    expect(reloaded.step()?.id).toBe('C1')
  })
})

describe('next and back', () => {
  let engine: FlowEngine

  beforeEach(() => {
    engine = setup()
    engine.startCalibration()
  })

  it('refuses to advance while the gate is blocked', () => {
    expect(engine.gate().allowed).toBe(false)
    engine.next()

    expect(engine.step()?.id).toBe('C1')
  })

  it('advances once the gate opens', () => {
    satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
    expect(engine.gate().allowed).toBe(true)

    engine.next()
    expect(engine.step()?.id).toBe('C2')
  })

  it('goes back without re-validating', () => {
    satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
    engine.next()
    satisfyChecks(engine, [CHECKS.firstTime])
    engine.next()
    expect(engine.step()?.id).toBe('Q1')

    // Back from a step whose own gate is unsatisfied must still work.
    engine.back()
    expect(engine.step()?.id).toBe('C2')
  })

  it('routes the branch to the quad flow', () => {
    satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
    engine.next()
    satisfyChecks(engine, [CHECKS.firstTime])
    engine.next()

    expect(engine.step()?.id).toBe('Q1')
    expect(engine.draft().flow).toBe('quad')
  })

  it('routes the branch to the quick flow', () => {
    satisfyChecks(engine, [CHECKS.caliper, CHECKS.printer, CHECKS.slicer])
    engine.next()
    engine.updateDraft((draft) =>
      chooseExclusively(draft, CHECKS.returning, [CHECKS.firstTime, CHECKS.returning]),
    )
    engine.next()

    expect(engine.step()?.id).toBe('S1')
    expect(engine.draft().flow).toBe('single')
  })

  it('treats the branch choice as exclusive, so a stale answer cannot satisfy it', () => {
    // Entering at C2 directly, so `gate()` is the branch's gate.
    const branchEngine = setup(true)
    branchEngine.startCalibration()
    expect(branchEngine.step()?.id).toBe('C2')

    branchEngine.updateDraft((draft) => setChecked(draft, CHECKS.firstTime, true))
    expect(branchEngine.gate().allowed).toBe(true)

    branchEngine.updateDraft((draft) =>
      chooseExclusively(draft, CHECKS.returning, [CHECKS.firstTime, CHECKS.returning]),
    )

    // The stale "yes" is gone, so it cannot be the answer that unlocks Next.
    expect(branchEngine.draft().checks[CHECKS.firstTime]).toBeUndefined()
    expect(branchEngine.draft().checks[CHECKS.returning]).toBe(true)
    expect(branchEngine.gate().allowed).toBe(true)
  })

  it('does nothing at the final step, which leaves through its own control', () => {
    advanceTo(engine, 'Q9')
    expect(engine.step()?.id).toBe('Q9')

    engine.next()
    expect(engine.step()?.id).toBe('Q9')
  })

  it('keeps entered measurements when going back', () => {
    advanceTo(engine, 'Q6')
    engine.back()

    expect(engine.step()?.id).toBe('Q5')
    expect(engine.draft().entries.X.outer).toBe('137.5')
  })
})

describe('exit confirmation matrix', () => {
  it('leaves without confirming before any measurement exists', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q4')

    expect(engine.isComplete()).toBe(false)
    engine.requestExit()

    expect(engine.exitRequested()).toBe(false)
    expect(engine.screen()).toBe('landing')
  })

  it('confirms once a measurement exists', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q5')
    satisfyMeasurements(engine, ['X'])

    engine.requestExit()

    expect(engine.exitRequested()).toBe(true)
    expect(engine.screen()).toBe('flow')
  })

  it('confirms on the factor step, before the result exists', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q7')

    engine.requestExit()
    expect(engine.exitRequested()).toBe(true)
  })

  it('does not confirm once the result has been reached', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q8')

    expect(engine.isComplete()).toBe(true)
    engine.requestExit()
    expect(engine.exitRequested()).toBe(false)
    expect(engine.screen()).toBe('landing')
  })

  it('does not confirm on the final step', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q9')

    engine.requestExit()
    expect(engine.screen()).toBe('landing')
  })

  it('cancelling the confirmation stays on the step with the measurements intact', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q5')
    satisfyMeasurements(engine, ['X'])

    engine.requestExit()
    engine.cancelExit()

    expect(engine.exitRequested()).toBe(false)
    expect(engine.screen()).toBe('flow')
    expect(engine.step()?.id).toBe('Q5')
    expect(engine.draft().entries.X.outer).toBe('137.5')
  })

  it('confirming leaves the flow and discards the draft', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q5')
    satisfyMeasurements(engine, ['X'])

    engine.requestExit()
    engine.confirmExit()

    expect(engine.screen()).toBe('landing')
    expect(engine.step()).toBeNull()
    expect(engine.draft().entries.X.outer).toBe('')
  })

  it('applies the same rule when Back is used to leave the first step', () => {
    const engine = setup()
    engine.startCalibration()
    expect(engine.step()?.id).toBe('C1')

    engine.back()
    expect(engine.screen()).toBe('landing')
    expect(engine.exitRequested()).toBe(false)
  })

  it('holds for the quick flow too, whose first step allows no measurements', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'S5', 'returning')
    satisfyMeasurements(engine, ['X'])

    engine.requestExit()
    expect(engine.exitRequested()).toBe(true)
  })
})

describe('screen navigation', () => {
  it('reaches the printer-data screen and back to landing', () => {
    const engine = setup()

    engine.goToPrinters()
    expect(engine.screen()).toBe('printers')

    // PRD §9.2/decision 17: leaving the printer screen always lands on landing.
    engine.goToLanding()
    expect(engine.screen()).toBe('landing')
  })

  it('clears a pending exit confirmation when leaving the flow', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q5')
    satisfyMeasurements(engine, ['X'])
    engine.requestExit()

    engine.goToLanding()
    expect(engine.exitRequested()).toBe(false)
  })
})

describe('a full quad run end to end', () => {
  it('reaches the results step with all eight readings intact', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'Q8')

    const draft = engine.draft()
    expect(draft.flow).toBe('quad')
    expect(engine.step()?.id).toBe('Q8')
    expect(engine.gate().allowed).toBe(true)
    expect(Object.values(draft.entries).every((e) => e.outer === '137.5')).toBe(true)
  })
})

describe('a full quick run end to end', () => {
  it('reaches the results step with the two readings intact', () => {
    const engine = setup()
    engine.startCalibration()
    advanceTo(engine, 'S6', 'returning')

    const draft = engine.draft()
    expect(draft.flow).toBe('single')
    expect(engine.step()?.id).toBe('S6')
    expect(draft.entries.X.outer).toBe('137.5')
  })
})
