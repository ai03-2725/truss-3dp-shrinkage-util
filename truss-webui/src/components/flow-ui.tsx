import { createEffect, For, on, onMount, Show, type JSX } from 'solid-js'
import {
  announce,
  describedBy,
  FieldMessagesView,
  fieldIds,
  focusStepHeading,
  STEP_HEADING_ATTRIBUTE,
  trapFocus,
} from './a11y'
import { parseNumber } from '../domain/number'
import type { MeasurementWarning } from '../domain/validation'

/**
 * The shared flow UI components (T16, PRD §9–§10).
 *
 * Built once, used by every step. The alternative — each step rolling its own
 * numeric input — is how a product acquires eight slightly different text boxes
 * with eight different warning behaviours, and the difference is only visible to
 * the user who hits the one that behaves differently.
 */

/* -------------------------------------------------------------------------- */
/* Step chrome (T16.1, T16.2)                                                  */
/* -------------------------------------------------------------------------- */

export interface StepChromeProps {
  /** 1-based position, for the progress indicator. Omitted on shared steps. */
  readonly position?: number
  readonly total?: number
  readonly title: string
  /** Changes whenever the entered step changes, which is what re-focuses. */
  readonly stepKey: string
  /** Whether Next may be pressed, and if not, why. */
  readonly gate: { readonly allowed: boolean; readonly reason: string | null }
  /** `null` on the first step, where the control means "leave the flow". */
  readonly back: (() => void) | null
  readonly next: () => void
  readonly exit: () => void
  /** Whether the exit confirmation is showing. */
  readonly exitRequested: boolean
  /**
   * Whether the draft holds anything that leaving would lose.
   *
   * Read only by the confirmation's wording: pressing Cancel always asks, but a
   * step where nothing has been entered must not be told its measurements are
   * about to be discarded.
   */
  readonly hasMeasurements: boolean
  readonly confirmExit: () => void
  readonly cancelExit: () => void
  /** Hide the Next control on steps that leave through their own button. */
  readonly showNext?: boolean
  readonly nextLabel?: string
  readonly children: JSX.Element
}

/**
 * The frame every step renders inside: heading, progress, content, navigation.
 *
 * The heading carries `tabindex="-1"` and the step-heading marker, which is what
 * {@link focusStepHeading} targets — a step transition replaces the whole view,
 * so focus has to be moved deliberately or a keyboard user is left on a
 * destroyed element (PRD §6.4). The focus move is keyed on `stepKey`, so it
 * happens on entry and on every transition, and *not* on unrelated re-renders
 * (which would steal focus out of a field the user is typing in).
 */
export function StepChrome(props: StepChromeProps): JSX.Element {
  const reasonId = 'step-gate-reason'
  const blocked = () => !props.gate.allowed && props.gate.reason !== null

  let root: HTMLElement | undefined
  let background: HTMLDivElement | undefined

  createEffect(
    on(
      () => [props.stepKey, props.exitRequested] as const,
      ([, exitRequested]) => {
        // The confirmation owns focus while it is open — moving focus to the
        // heading underneath it would both hide what the user is being asked and
        // put the keyboard back on the content they are deciding about. When it
        // closes (either way), focus comes back here, which is also what makes
        // cancelling land somewhere sensible rather than on `<body>`.
        if (exitRequested) {
          return
        }
        queueMicrotask(() => focusStepHeading(root ?? null))
      },
    ),
  )

  /*
   * While the confirmation is open, the step it is asking about goes `inert`: out
   * of the tab order and out of the accessibility tree, so the question cannot be
   * answered by accident on the screen behind it.
   *
   * Set as an attribute rather than as a property because that is what `inert`
   * is, and the jsdom these tests run in has no IDL reflection for it — a
   * property write would be an unverifiable claim about the shipped widget.
   */
  createEffect(() => {
    if (background === undefined) {
      return
    }
    if (props.exitRequested) {
      background.setAttribute('inert', '')
    } else {
      background.removeAttribute('inert')
    }
  })

  return (
    <section
      aria-label={props.title}
      ref={(element) => {
        root = element
      }}
    >
      {/*
       * One wrapper around everything the dialog is *not*, so that the modal can
       * be marked as the only live region of the step without the two nests
       * fighting over who owns `inert`.
       */}
      <div
        class="stack"
        ref={(element) => {
          background = element
        }}
      >
        <Show when={props.position !== undefined && props.total !== undefined}>
          <p class="muted" data-testid="step-progress">
            Step {props.position} of {props.total}
          </p>
        </Show>

        <h2 tabindex="-1" {...{ [STEP_HEADING_ATTRIBUTE]: '' }}>
          {props.title}
        </h2>

        {props.children}

        <div class="row">
          <Show when={props.back !== null}>
            <button type="button" onClick={() => props.back?.()}>
              Back
            </button>
          </Show>

          <Show when={props.showNext ?? true}>
            <button
              type="button"
              onClick={() => props.next()}
              disabled={!props.gate.allowed}
              aria-describedby={blocked() ? reasonId : undefined}
              data-testid="next"
            >
              {props.nextLabel ?? 'Next'}
            </button>
          </Show>
        </div>

        <Show when={blocked()}>
          <p class="muted" id={reasonId} data-testid="gate-reason">
            {props.gate.reason}
          </p>
        </Show>

        {/*
         * Cancel is offered on every step, not only on the first: the flow is the
         * only thing the user came here to do, and making them walk Back through
         * eight screens to find the way out is not a navigation scheme.
         *
         * It sits *below* the navigation row, under its own spacing, rather than
         * beside Next: Back and Next are pressed repeatedly and half-attentively,
         * and the one control on the screen that throws the readings away must not
         * be one mis-aimed press away from the one pressed to continue. The outline
         * treatment says the same thing visually — this is the way out of the
         * screen, not the way through it.
         */}
        <div class="flow-cancel">
          <button
            type="button"
            class="button-outline"
            onClick={() => props.exit()}
            data-testid="exit"
          >
            Cancel calibration
          </button>
        </div>
      </div>

      <Show when={props.exitRequested}>
        <ExitConfirmation
          hasMeasurements={props.hasMeasurements}
          onConfirm={props.confirmExit}
          onCancel={props.cancelExit}
        />
      </Show>
    </section>
  )
}

/** The confirmation heading's id, which `aria-labelledby` points at. */
const EXIT_TITLE_ID = 'exit-confirmation-title'

/**
 * The exit confirmation, as a modal.
 *
 * Focus lands on **Stay**, not on the destructive action: a confirmation that
 * defaults to discarding measurements turns a stray Enter into data loss. The
 * measurements being discarded are eight caliper readings that cannot be
 * recovered — by design (PRD §12) — so the safe default matters more here than
 * the convenience of confirming with one keystroke.
 *
 * Every other way out of a dialog means the same thing. Escape and a click on the
 * wash behind the card both cancel it, because the answer to "are you sure you
 * want to throw this away?" must never be *given* by the gesture that dismisses
 * the question. Leaving stays an explicit press of a labelled button.
 *
 * Hand-rolled rather than a native `<dialog>`: `showModal()` is the browser API
 * for exactly this, but the jsdom the tests run in has no implementation of it,
 * so the shipped behaviour — focus containment above all — could not be tested at
 * all. What the native element would have given for free (top layer, `inert`
 * background, focus containment) is done explicitly here instead.
 *
 * The dialog appears on every step, so its wording has to be true on every step:
 * on the checklist and the instructional screens there is nothing to discard
 * yet, and being told otherwise would teach the user to dismiss the one warning
 * that does matter.
 */
function ExitConfirmation(props: {
  hasMeasurements: boolean
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  let card: HTMLDivElement | undefined
  let stay: HTMLButtonElement | undefined

  // Focus after mount, not from the ref callback: a ref fires while the subtree
  // is still detached, and focusing a detached element does nothing.
  onMount(() => stay?.focus())

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      props.onCancel()
      return
    }
    trapFocus(card ?? null, event)
  }

  return (
    <div
      class="modal-overlay"
      data-testid="exit-overlay"
      onClick={(event) => {
        // Only the wash itself: a click that lands on the card — including its
        // padding — is a click *inside* the question, not on the way out of it.
        if (event.target === event.currentTarget) {
          props.onCancel()
        }
      }}
      onKeyDown={(event) => onKeyDown(event)}
    >
      <div
        class="modal-card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby={EXIT_TITLE_ID}
        data-testid="exit-confirmation"
        ref={(element) => {
          card = element
        }}
      >
        <h2 class="modal-title" id={EXIT_TITLE_ID}>
          Leave the calibration?
        </h2>

        <Show
          when={props.hasMeasurements}
          fallback={<p>Nothing has been entered yet, so there is nothing to lose.</p>}
        >
          <p>
            Your measurements will be discarded, and this flow does not save them (there is nothing
            to resume).
          </p>
        </Show>

        <div class="row">
          <button
            type="button"
            ref={(element) => {
              stay = element
            }}
            onClick={() => props.onCancel()}
            data-testid="stay"
          >
            Stay
          </button>
          <button type="button" onClick={() => props.onConfirm()} data-testid="leave">
            {props.hasMeasurements ? 'Leave and discard' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Checklist (T16.3)                                                           */
/* -------------------------------------------------------------------------- */

export interface CheckboxItem {
  /** The draft check key. */
  readonly key: string
  readonly label: string
  /** Optional explanatory text, associated with the checkbox. */
  readonly description?: string
}

export interface CheckboxGroupProps {
  readonly legend: string
  readonly items: readonly CheckboxItem[]
  readonly isChecked: (key: string) => boolean
  readonly onToggle: (key: string, checked: boolean) => void
}

/**
 * A group of checkboxes in a `fieldset`.
 *
 * The fieldset/legend pair is what gives the group an accessible name: a bare
 * list of checkboxes is announced as three unrelated controls, and the user never
 * hears what they are prerequisites *for*.
 */
export function CheckboxGroup(props: CheckboxGroupProps): JSX.Element {
  return (
    <fieldset>
      <legend>{props.legend}</legend>
      <For each={props.items}>
        {(item) => {
          const ids = fieldIds(`check-${item.key}`)
          return (
            <div>
              <label class="check" for={ids.control}>
                <input
                  id={ids.control}
                  type="checkbox"
                  checked={props.isChecked(item.key)}
                  aria-describedby={item.description === undefined ? undefined : ids.hint}
                  onChange={(event) => props.onToggle(item.key, event.currentTarget.checked)}
                />
                <span>{item.label}</span>
              </label>
              <Show when={item.description !== undefined}>
                <p class="muted" id={ids.hint}>
                  {item.description}
                </p>
              </Show>
            </div>
          )
        }}
      </For>
    </fieldset>
  )
}

/* -------------------------------------------------------------------------- */
/* Measurement field (T16.4)                                                   */
/* -------------------------------------------------------------------------- */

export interface MeasurementFieldProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly onInput: (text: string) => void
  /**
   * Warnings for this field, computed by the owning step from the whole axis.
   *
   * Passed in rather than derived here because the ordering and divergence
   * warnings are about the *pair* of readings: a field that only knew its own
   * value could not tell whether the calipers were seated wrong.
   */
  readonly warnings?: readonly MeasurementWarning[]
  /** Free-text hints or examples rendered under the label. */
  readonly hint?: string
}

/**
 * A numeric caliper reading.
 *
 * Everything about this component is about making one number trustworthy:
 *
 * - The parser accepts `,` or `.` and rejects half-typed values, so a partial
 *   edit reads as "not entered yet" rather than as a wrong number.
 * - A parse failure is **blocking** (`aria-invalid`, error text, alarm role).
 * - A warning never blocks: it is guidance about a number that is perfectly
 *   usable, and blocking on it would leave the user with no way past a
 *   plausible-looking reading the app merely finds unlikely.
 * - A warning that *appears* is announced once through the live region, because
 *   an inline warning is invisible to assistive technology otherwise. It is
 *   announced on appearance rather than on every keystroke: repeating it while
 *   the user edits would turn the warnings into noise.
 */
export function MeasurementField(props: MeasurementFieldProps): JSX.Element {
  // `props.id` is read once on purpose: it is the field's stable identity (as an
  // HTML `id` must be), not a value that changes during the field's life. A
  // reactive read here would only invite an id that changes under the ARIA
  // references pointing at it.
  // eslint-disable-next-line solid/reactivity
  const ids = fieldIds(props.id)

  const error = (): string | null => {
    if (props.value.trim() === '') {
      return null
    }
    const parsed = parseNumber(props.value)
    if (parsed.ok) {
      return parsed.value > 0 ? null : 'Enter a length greater than zero.'
    }
    // 'incomplete' means the user is mid-keystroke (`137.`), not that they typed
    // something wrong. Next stays blocked either way — the gate reads the same
    // parser — so the only question is whether to scold them while they type.
    return parsed.error.code === 'incomplete' ? null : `“${props.value.trim()}” is not a number.`
  }

  /**
   * The warning currently shown.
   *
   * Only the first: a field with three warnings stacked under it is harder to
   * read than one with the most important, and the pair checks subsume the
   * length check in practice.
   */
  const warning = (): MeasurementWarning | null => props.warnings?.[0] ?? null

  let lastAnnounced: string | null = null

  // Announce a *new* warning once. Called from the input handler rather than
  // from an effect, so it fires on the user's action and not on re-render.
  const onInput = (text: string): void => {
    props.onInput(text)
    const message = warning()?.message ?? null
    if (message !== null && message !== lastAnnounced) {
      announce(message)
    }
    lastAnnounced = message
  }

  return (
    <div class="stack">
      <label for={ids.control}>{props.label}</label>
      <Show when={props.hint !== undefined}>
        <p class="muted" id={ids.hint}>
          {props.hint}
        </p>
      </Show>
      <div class="row">
        <input
          id={ids.control}
          type="text"
          inputmode="decimal"
          autocomplete="off"
          value={props.value}
          aria-invalid={error() === null ? 'false' : 'true'}
          aria-describedby={describedBy(ids, {
            hint: props.hint,
            error: error(),
            warning: warning()?.message,
          })}
          onInput={(event) => onInput(event.currentTarget.value)}
        />
        <span class="muted" aria-hidden="true">
          mm
        </span>
      </div>
      <FieldMessagesView ids={ids} error={error()} warning={warning()?.message} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Details block (T16.5)                                                       */
/* -------------------------------------------------------------------------- */

export interface DetailRow {
  readonly label: string
  readonly value: string
  /** Emphasise the row that matters most in this block. */
  readonly emphasis?: boolean
}

/**
 * Secondary values, as label/value rows with tabular numerals (PRD §10).
 *
 * Tabular figures are not decoration: this block is read as a column of numbers
 * by a user transcribing one of them, and proportional digits make the column
 * ragged.
 */
export function DetailsBlock(props: {
  readonly rows: readonly DetailRow[]
  readonly title?: string
}): JSX.Element {
  return (
    <div>
      <Show when={props.title !== undefined}>
        <h3>{props.title}</h3>
      </Show>
      <dl class="stack" data-testid="details">
        <For each={props.rows}>
          {(row) => (
            <div class="detail-row">
              <dt class="muted">{row.label}</dt>
              <dd class="numeric" data-emphasis={row.emphasis === true ? 'true' : undefined}>
                {row.value}
              </dd>
            </div>
          )}
        </For>
      </dl>
    </div>
  )
}
