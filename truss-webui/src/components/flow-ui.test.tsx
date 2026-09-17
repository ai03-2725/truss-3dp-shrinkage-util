import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createDraft, setMeasurement, type CalibrationDraft } from '../domain/draft'
import { buildGate } from '../flow/registry'
import { fieldWarnings } from '../domain/validation'
import { CheckboxGroup, DetailsBlock, MeasurementField, StepChrome } from './flow-ui'
import { LiveRegion } from './a11y'

/**
 * Flow UI component tests (T16.6).
 *
 * The load-bearing assertion in this file is that **warnings never block**: the
 * gate for a measurement step must stay open for a reading the app merely finds
 * unlikely, because that is the difference between guidance and a dead end.
 */

describe('StepChrome', () => {
  function chrome(overrides: Partial<Parameters<typeof StepChrome>[0]> = {}) {
    const props = {
      position: 4,
      total: 11,
      title: 'Measure the X beam',
      stepKey: 'Q5',
      gate: { allowed: true, reason: null },
      back: vi.fn(),
      next: vi.fn(),
      exit: vi.fn(),
      exitRequested: false,
      hasMeasurements: false,
      confirmExit: vi.fn(),
      cancelExit: vi.fn(),
      children: <p>content</p>,
      ...overrides,
    }
    return { props, ...render(() => <StepChrome {...props} />) }
  }

  it('shows where the user is in the flow', () => {
    chrome()
    expect(screen.getByTestId('step-progress')).toHaveTextContent('Step 4 of 11')
  })

  it('marks the heading as the focus target', () => {
    const { container } = chrome()
    const heading = container.querySelector('h2')!

    expect(heading).toHaveAttribute('data-step-heading')
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading).toHaveTextContent('Measure the X beam')
  })

  it('enables Next when the gate is open and calls through', async () => {
    const user = userEvent.setup()
    const { props } = chrome()

    const next = screen.getByTestId('next')
    expect(next).toBeEnabled()
    expect(screen.queryByTestId('gate-reason')).toBeNull()

    await user.click(next)
    expect(props.next).toHaveBeenCalledOnce()
  })

  it('disables Next while the gate is blocked and shows the reason', () => {
    chrome({ gate: { allowed: false, reason: 'Enter all the measurements to continue.' } })

    const next = screen.getByTestId('next')
    expect(next).toBeDisabled()
    expect(next).toHaveAttribute('aria-describedby', 'step-gate-reason')
    expect(screen.getByTestId('gate-reason')).toHaveTextContent(
      'Enter all the measurements to continue.',
    )
    // The reason must be a real element, not just an attribute value.
    expect(document.getElementById('step-gate-reason')).not.toBeNull()
  })

  it('offers Cancel calibration instead of Back on the first step', async () => {
    const user = userEvent.setup()
    const { props } = chrome({ back: null })

    await user.click(screen.getByRole('button', { name: 'Cancel calibration' }))
    expect(props.exit).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('puts Cancel calibration below the navigation row, styled as an outline', () => {
    chrome()

    const next = screen.getByTestId('next')
    const cancel = screen.getByTestId('exit')

    // Not in the row with Back and Next…
    expect(next.parentElement).not.toContainElement(cancel)
    // …but after it in document order, at the bottom of the step.
    expect(next.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cancel).toHaveClass('button-outline')
    expect(cancel.parentElement).toHaveClass('flow-cancel')
  })

  it('hides Next on steps that leave through their own action', () => {
    chrome({ showNext: false })
    expect(screen.queryByTestId('next')).toBeNull()
  })

  it('asks before discarding measurements, defaulting focus to Stay', async () => {
    const user = userEvent.setup()
    const { props } = chrome({ exitRequested: true, hasMeasurements: true })

    expect(screen.getByTestId('exit-confirmation')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Focus on the safe action: a stray Enter must not discard eight readings.
    expect(document.activeElement).toBe(screen.getByTestId('stay'))

    await user.click(screen.getByTestId('leave'))
    expect(props.confirmExit).toHaveBeenCalledOnce()
  })

  it('shows the confirmation as a modal dialog over the step', () => {
    chrome({ exitRequested: true, hasMeasurements: true })

    const dialog = screen.getByRole('dialog', { name: 'Leave the calibration?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveClass('modal-card')
    expect(screen.getByTestId('exit-overlay')).toHaveClass('modal-overlay')
  })

  it('takes the step behind the dialog out of the tab order while it is open', () => {
    const { container } = chrome({ exitRequested: true, hasMeasurements: true })

    const background = container.querySelector('[inert]')
    expect(background).not.toBeNull()
    // Everything but the dialog: the navigation controls cannot be reached.
    expect(background).toContainElement(screen.getByTestId('next'))
    expect(background).not.toContainElement(screen.getByTestId('exit-confirmation'))
  })

  it('leaves the step interactive when no dialog is open', () => {
    const { container } = chrome()

    expect(container.querySelector('[inert]')).toBeNull()
  })

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    chrome({ exitRequested: true, hasMeasurements: true })

    expect(screen.getByTestId('stay')).toHaveFocus()
    await user.tab()
    expect(screen.getByTestId('leave')).toHaveFocus()
    // Past the last control, focus wraps rather than walking into the step.
    await user.tab()
    expect(screen.getByTestId('stay')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByTestId('leave')).toHaveFocus()
  })

  it('cancels on Escape, because dismissing the question must not answer it', async () => {
    const user = userEvent.setup()
    const { props } = chrome({ exitRequested: true, hasMeasurements: true })

    await user.keyboard('{Escape}')

    expect(props.cancelExit).toHaveBeenCalledOnce()
    expect(props.confirmExit).not.toHaveBeenCalled()
  })

  it('cancels when the wash behind the card is clicked, but not when the card is', async () => {
    const user = userEvent.setup()
    const { props } = chrome({ exitRequested: true, hasMeasurements: true })

    await user.click(screen.getByRole('heading', { name: 'Leave the calibration?' }))
    expect(props.cancelExit).not.toHaveBeenCalled()

    await user.click(screen.getByTestId('exit-overlay'))
    expect(props.cancelExit).toHaveBeenCalledOnce()
  })

  it('promises to discard measurements only when there are some', () => {
    chrome({ exitRequested: true, hasMeasurements: true })

    expect(screen.getByTestId('exit-confirmation')).toHaveTextContent(
      'Your measurements will be discarded',
    )
    expect(screen.getByTestId('leave')).toHaveTextContent('Leave and discard')
  })

  it('asks anyway on a step where nothing has been entered, and says so', () => {
    chrome({ exitRequested: true, hasMeasurements: false })

    // The confirmation is not conditional — only its wording is.
    expect(screen.getByTestId('exit-confirmation')).toHaveTextContent(
      'Nothing has been entered yet',
    )
    expect(screen.getByTestId('leave')).toHaveTextContent('Leave')
  })
})

describe('CheckboxGroup', () => {
  const items = [
    { key: 'a', label: 'A decent pair of calipers' },
    { key: 'b', label: 'A calibrated printer', description: 'Build plate of at least 150×150mm.' },
  ]

  function group(checked: Record<string, boolean> = {}) {
    const onToggle = vi.fn()
    const utils = render(() => (
      <CheckboxGroup
        legend="Before you start"
        items={items}
        isChecked={(key) => checked[key] === true}
        onToggle={onToggle}
      />
    ))
    return { onToggle, ...utils }
  }

  it('names the group with a fieldset and legend', () => {
    const { container } = group()

    expect(container.querySelector('fieldset')).not.toBeNull()
    expect(screen.getByRole('group', { name: 'Before you start' })).toBeInTheDocument()
  })

  it('gives every checkbox an accessible name', () => {
    group()

    expect(screen.getByRole('checkbox', { name: 'A decent pair of calipers' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'A calibrated printer' })).toBeInTheDocument()
  })

  it('associates a description with its checkbox', () => {
    group()

    const printer = screen.getByRole('checkbox', { name: 'A calibrated printer' })
    const described = printer.getAttribute('aria-describedby')!
    expect(described).toBeTruthy()
    expect(document.getElementById(described)).toHaveTextContent('150×150mm')
  })

  it('reports toggles by key', async () => {
    const user = userEvent.setup()
    const { onToggle } = group()

    await user.click(screen.getByRole('checkbox', { name: 'A decent pair of calipers' }))
    expect(onToggle).toHaveBeenCalledWith('a', true)
  })

  it('reflects the checked state it is given', () => {
    group({ b: true })
    expect(screen.getByRole('checkbox', { name: 'A calibrated printer' })).toBeChecked()
  })
})

describe('MeasurementField', () => {
  function field(value: string, warnings: ReturnType<typeof fieldWarnings> = []) {
    const onInput = vi.fn()
    const utils = render(() => (
      <>
        <LiveRegion />
        <MeasurementField
          id="x-outer"
          label="X outer"
          value={value}
          onInput={onInput}
          warnings={warnings}
        />
      </>
    ))
    return { onInput, ...utils }
  }

  it('labels the field, gives it a decimal keyboard and states the unit', () => {
    field('')

    const input = screen.getByLabelText('X outer')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByText('mm')).toBeInTheDocument()
  })

  it('reports typed text without reformatting it', async () => {
    const user = userEvent.setup()
    const { onInput } = field('')

    await user.type(screen.getByLabelText('X outer'), '137,5')
    // The comma is preserved: rewriting what the user typed under the cursor is
    // how a numeric field becomes unusable.
    expect(onInput).toHaveBeenLastCalledWith('137,5')
  })

  it('blocks garbage with an associated error', () => {
    field('abc')

    const input = screen.getByLabelText('X outer')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const described = input.getAttribute('aria-describedby')!.split(' ')
    const errorId = described.find((id) => id === 'x-outer-error')
    expect(errorId).toBeDefined()
    expect(document.getElementById('x-outer-error')!).toHaveAttribute('role', 'alert')
    expect(screen.getByText('“abc” is not a number.')).toBeInTheDocument()
  })

  it('blocks zero and negatives', () => {
    field('0')
    expect(screen.getByText('Enter a length greater than zero.')).toBeInTheDocument()
  })

  it('stays quiet while a value is being typed', () => {
    // '137.' is a legitimate intermediate state, not an error to shout about.
    field('137.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('X outer')).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows a warning without marking the field invalid', () => {
    const warnings = fieldWarnings('200', '200', '199')
    field('200', warnings)

    const input = screen.getByLabelText('X outer')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText(/unlikely/)).toBeInTheDocument()
    // A warning is guidance, so it must not announce itself as an alarm.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('announces a warning when it appears', async () => {
    const user = userEvent.setup()
    const onInput = vi.fn()
    // 137 is fine; typing the extra 0 makes it 1370, which is not.
    const warnings = fieldWarnings('1370', '1370', '136.5')
    render(() => (
      <>
        <LiveRegion />
        <MeasurementField
          id="x-outer"
          label="X outer"
          value="1370"
          onInput={onInput}
          warnings={warnings}
        />
      </>
    ))

    expect(warnings[0]?.message).toContain('unlikely')

    await user.type(screen.getByLabelText('X outer'), '5')

    await vi.waitFor(() =>
      expect(screen.getByTestId('live-region-polite').textContent).toContain('unlikely'),
    )
  })
})

describe('warnings never block progression (T16.6)', () => {
  it('counts an improbable reading as entered, keeping the gate open', () => {
    const gate = buildGate({ kind: 'measurements', axes: ['X'] })
    let draft: CalibrationDraft = createDraft('quad')
    // 200mm is outside the plausible band, and inner > outer is impossible —
    // both are warnings, so the step's gate must still open.
    draft = setMeasurement(setMeasurement(draft, 'X', 'outer', '200'), 'X', 'inner', '205')

    expect(fieldWarnings('200', '200', '205').length).toBeGreaterThan(0)
    expect(gate(draft)).toEqual({ allowed: true, reason: null })
  })
})

describe('DetailsBlock', () => {
  it('renders label/value rows with tabular numerals', () => {
    render(() => (
      <DetailsBlock
        title="How this was calculated"
        rows={[
          { label: 'Average of all 8 measurements', value: '137.46' },
          { label: 'Extrapolation factor', value: '0.9997272727', emphasis: true },
        ]}
      />
    ))

    expect(screen.getByText('Average of all 8 measurements')).toBeInTheDocument()
    expect(screen.getByText('0.9997272727')).toHaveClass('numeric')
    expect(screen.getByText('0.9997272727')).toHaveAttribute('data-emphasis', 'true')
    expect(screen.getByRole('heading', { name: 'How this was calculated' })).toBeInTheDocument()
  })

  it('uses definition list semantics, so the pairing is not just visual', () => {
    const { container } = render(() => (
      <DetailsBlock rows={[{ label: 'Ratio', value: '0.98188' }]} />
    ))

    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelector('dt')).toHaveTextContent('Ratio')
    expect(container.querySelector('dd')).toHaveTextContent('0.98188')
  })
})
