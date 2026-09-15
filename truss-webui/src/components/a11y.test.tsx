import { render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import {
  announce,
  describedBy,
  elementBelongsToFocus,
  FieldMessagesView,
  fieldIds,
  focusElement,
  focusFirstControl,
  focusStepHeading,
  LiveRegion,
  prefersReducedMotion,
  resetAnnouncements,
  STEP_HEADING_ATTRIBUTE,
} from './a11y'

afterEach(() => {
  resetAnnouncements()
  document.body.innerHTML = ''
})

/** A step-shaped view: heading, one labelled field, one control. */
function StepFixture() {
  const ids = fieldIds('x-outer')
  const messages = { hint: 'Across the outer faces.', error: 'Enter a number.' }

  return (
    <div>
      <h2 tabindex="-1" {...{ [STEP_HEADING_ATTRIBUTE]: '' }}>
        Measure X
      </h2>
      <label for={ids.control}>X outer</label>
      <input
        id={ids.control}
        type="text"
        aria-describedby={describedBy(ids, messages)}
        aria-invalid="true"
      />
      <FieldMessagesView ids={ids} {...messages} />
      <input id="agree" type="checkbox" />
      <label class="check" for="agree">
        I have read the warnings
      </label>
      <button type="button" disabled>
        Back
      </button>
      <button type="button">Next</button>
    </div>
  )
}

describe('focusStepHeading', () => {
  it('moves focus to the step heading', () => {
    const { container } = render(() => <StepFixture />)

    expect(focusStepHeading(container)).toBe(true)
    expect(document.activeElement?.textContent).toBe('Measure X')
  })

  it('reports failure rather than throwing when there is no heading', () => {
    const { container } = render(() => <div />)

    expect(focusStepHeading(container)).toBe(false)
    expect(focusStepHeading(null)).toBe(false)
  })

  it('sees focus that landed inside a shadow root, where document.activeElement does not', () => {
    // The whole app lives in a shadow root, so a naive `document.activeElement`
    // check would report "nothing focused" after every step transition.
    const host = document.createElement('div')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const heading = document.createElement('h2')
    heading.setAttribute(STEP_HEADING_ATTRIBUTE, '')
    heading.tabIndex = -1
    root.append(heading)

    expect(focusStepHeading(root)).toBe(true)
    expect(elementBelongsToFocus(heading)).toBe(true)
    // The document reports the *host*, which is exactly why the helper exists.
    expect(document.activeElement).toBe(host)
  })
})

describe('focusElement and focusFirstControl', () => {
  it('skips disabled and hidden controls', () => {
    const { container } = render(() => <StepFixture />)

    expect(focusFirstControl(container)).toBe(true)
    // The first field, not the disabled Back button and not the heading.
    expect((document.activeElement as HTMLElement).id).toBe('x-outer-input')
  })

  it('returns false for nothing to focus', () => {
    expect(focusElement(null)).toBe(false)
    expect(focusFirstControl(document.createElement('div'))).toBe(false)
  })
})

describe('live region', () => {
  it('exists before anything is announced, so the first message is heard', () => {
    render(() => <LiveRegion />)

    const region = screen.getByTestId('live-region-polite')
    expect(region).toHaveAttribute('role', 'status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
  })

  it('announces a message', async () => {
    render(() => <LiveRegion />)

    announce('Measurement 137.5 is outside the plausible range.')
    await Promise.resolve()

    expect(screen.getByTestId('live-region-polite')).toHaveTextContent(
      'outside the plausible range',
    )
  })

  it('re-announces the same message when it happens again', async () => {
    render(() => <LiveRegion />)
    const message = 'Inner reading is not smaller than the outer reading.'

    announce(message)
    await Promise.resolve()
    expect(screen.getByTestId('live-region-polite')).toHaveTextContent(message)

    // A live region only announces *changes*, so a repeat has to pass through an
    // empty state or it is silently ignored.
    announce(message)
    expect(screen.getByTestId('live-region-polite').textContent).toBe('')
    await Promise.resolve()
    expect(screen.getByTestId('live-region-polite')).toHaveTextContent(message)
  })

  it('keeps assertive announcements separate from polite ones', async () => {
    render(() => (
      <>
        <LiveRegion />
        <LiveRegion politeness="assertive" />
      </>
    ))

    announce('Blocking error', 'assertive')
    await Promise.resolve()

    expect(screen.getByTestId('live-region-assertive')).toHaveTextContent('Blocking error')
    expect(screen.getByTestId('live-region-polite')).toHaveTextContent('')
  })

  it('ignores blank text', async () => {
    render(() => <LiveRegion />)

    announce('   ')
    await Promise.resolve()

    expect(screen.getByTestId('live-region-polite')).toHaveTextContent('')
  })
})

describe('field association', () => {
  const ids = fieldIds('x-outer')

  it('derives one id per element from a base', () => {
    expect(ids).toEqual({
      control: 'x-outer-input',
      hint: 'x-outer-hint',
      error: 'x-outer-error',
      warning: 'x-outer-warning',
    })
  })

  it('lists only the messages that exist, hint first', () => {
    expect(describedBy(ids, {})).toBeUndefined()
    expect(describedBy(ids, { hint: 'h' })).toBe(ids.hint)
    expect(describedBy(ids, { error: 'e', hint: 'h' })).toBe(`${ids.hint} ${ids.error}`)
    expect(describedBy(ids, { warning: 'w', error: 'e', hint: 'h' })).toBe(
      `${ids.hint} ${ids.error} ${ids.warning}`,
    )
  })

  it('treats blank-but-present text as absent', () => {
    expect(describedBy(ids, { error: '   ' })).toBeUndefined()
    expect(describedBy(ids, { error: null })).toBeUndefined()
  })

  it('announces a blocking error immediately but not a warning', () => {
    render(() => <FieldMessagesView ids={ids} error="Required." warning="Check this." />)

    expect(screen.getByText('Required.')).toHaveAttribute('role', 'alert')
    // A warning is inline guidance; interrupting on every keystroke would make
    // the warnings worse than useless.
    expect(screen.getByText('Check this.')).not.toHaveAttribute('role')
  })

  it('associates the field with its messages through aria-describedby', () => {
    render(() => (
      <>
        <input id={ids.control} aria-describedby={describedBy(ids, { hint: 'h', error: 'e' })} />
        <FieldMessagesView ids={ids} hint="h" error="e" />
      </>
    ))

    const input = document.getElementById(ids.control)!
    const described = input.getAttribute('aria-describedby')!.split(' ')
    for (const id of described) {
      expect(document.getElementById(id), id).not.toBeNull()
    }
  })
})

describe('reduced motion', () => {
  it('reports no preference when the platform cannot be asked', () => {
    // jsdom has no matchMedia; the permissive default must not throw.
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('keyboard-only operation (T14.5)', () => {
  it('reaches every control with Tab and activates with the keyboard', async () => {
    const user = userEvent.setup()
    render(() => <StepFixture />)

    // Tab into the view: the field first, because the disabled Back button is
    // skipped and the heading is programmatically focusable only.
    await user.tab()
    expect(document.activeElement?.id).toBe('x-outer-input')

    await user.type(document.activeElement as HTMLElement, '137.5')
    expect((document.activeElement as HTMLInputElement).value).toBe('137.5')

    await user.tab()
    expect(document.activeElement?.id).toBe('agree')

    await user.keyboard(' ')
    expect((document.activeElement as HTMLInputElement).checked).toBe(true)

    await user.tab()
    expect(document.activeElement?.textContent).toBe('Next')
  })

  it('activates the Next button with Enter and with Space', async () => {
    const user = userEvent.setup()
    const activations: string[] = []
    render(() => <button onClick={() => activations.push('next')}>Next</button>)

    await user.tab()
    expect(document.activeElement?.textContent).toBe('Next')

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(activations).toEqual(['next', 'next'])
  })

  it('moves focus to the step heading when the view is replaced', async () => {
    const user = userEvent.setup()
    const { container } = render(() => <StepFixture />)

    await user.tab()
    expect(document.activeElement?.id).toBe('x-outer-input')

    // What a step transition does: swap the view, then focus its heading.
    expect(focusStepHeading(container)).toBe(true)
    expect(document.activeElement?.textContent).toBe('Measure X')
  })
})
