import { createSignal, getOwner, onCleanup, Show, type JSX } from 'solid-js'

/**
 * Accessibility primitives (T14, PRD §6.4).
 *
 * Accessibility is a functional requirement here, not an intention, and the
 * specific hazard the PRD names is structural: **a step transition replaces the
 * entire view**, so without deliberate focus management a keyboard or
 * screen-reader user is left standing on a destroyed element — the step looks
 * like it did nothing. The mirror-image hazard is that warnings are non-modal by
 * design, so a visually-inline warning is invisible to assistive technology
 * unless it is explicitly announced.
 *
 * Both are handled here, once, so that individual steps cannot get them wrong.
 */

/* -------------------------------------------------------------------------- */
/* Focus management                                                            */
/* -------------------------------------------------------------------------- */

/** Marks the element each step must move focus to on entry. */
export const STEP_HEADING_ATTRIBUTE = 'data-step-heading'

/**
 * Move focus to a step heading.
 *
 * The heading must carry {@link STEP_HEADING_ATTRIBUTE} and `tabindex="-1"`; a
 * non-focusable heading cannot receive focus, and a *programmatically* focusable
 * one does not join the tab order, which is exactly the intent — focus lands
 * there on entry, and the next Tab continues into the step's content rather than
 * stopping on the heading again.
 *
 * Returns whether focus actually moved, so a caller can fall back (and so a test
 * can assert it happened rather than that it was merely asked for).
 */
export function focusStepHeading(container: ParentNode | null | undefined): boolean {
  const heading = container?.querySelector<HTMLElement>(`[${STEP_HEADING_ATTRIBUTE}]`)
  return focusElement(heading)
}

/**
 * Focus an element without scrolling the host page more than necessary.
 *
 * `preventScroll` keeps a tall host page from jumping when a step changes: the
 * step's own container is scrolled into view deliberately elsewhere, and a
 * browser-initiated scroll would fight it.
 */
export function focusElement(element: HTMLElement | null | undefined): boolean {
  if (element === null || element === undefined) {
    return false
  }
  element.focus({ preventScroll: true })
  return elementBelongsToFocus(element)
}

/**
 * Whether the element (or something inside it) actually holds focus.
 *
 * Needed because focus inside a shadow tree is not visible to
 * `document.activeElement`, which reports the *host*. Without this, every
 * focus assertion in a shadow root reads as "nothing was focused".
 */
export function elementBelongsToFocus(element: HTMLElement): boolean {
  if (element.ownerDocument.activeElement === element) {
    return true
  }
  const root = element.getRootNode()
  return root instanceof ShadowRoot && root.activeElement === element
}

/**
 * Move focus to the first focusable control inside a container.
 *
 * Used when a step's content *is* the interaction (a measurement form) and the
 * most useful next action is the first field rather than the heading. Kept
 * explicit rather than automatic so each step states its own intent.
 */
export function focusFirstControl(container: ParentNode | null | undefined): boolean {
  const control = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  return focusElement(control)
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Keep Tab inside a container — the focus trap a modal dialog needs.
 *
 * Tab from the last control in a dialog must not walk into the screen behind it:
 * that is the content the user is being asked to decide about, and a keyboard
 * user who lands there has no way to tell the question is still open. This is
 * the *second* line of defence — the step behind the dialog is also marked
 * `inert`, so in a browser the tab order never reaches it — but `inert` is not
 * something jsdom enforces, and a trap that exists only in browsers is a trap no
 * test can see.
 *
 * Visibility is deliberately not checked. jsdom performs no layout, so an
 * `offsetParent`/`getClientRects` filter would empty the control list and disable
 * the trap in exactly the environment the tests run in; the dialogs this is used
 * for are small and hold nothing hidden.
 *
 * Returns whether it moved focus, so a caller (or a test) can tell "handled" from
 * "nothing to do". The caller is responsible for `preventDefault`ing — it is
 * done here only when focus actually moves.
 */
export function trapFocus(container: ParentNode | null | undefined, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab' || container === null || container === undefined) {
    return false
  }

  const controls = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  const first = controls[0] ?? null
  const last = controls[controls.length - 1] ?? null
  if (first === null || last === null) {
    return false
  }

  // Focus inside a shadow root is invisible to `document.activeElement`, so the
  // index is found through the shadow-aware helper rather than by identity.
  const index = controls.findIndex((control) => elementBelongsToFocus(control))

  let target: HTMLElement | null = null
  if (index === -1) {
    // Focus is outside the dialog (or on `<body>`): pull it back in, from
    // whichever end the user was heading towards.
    target = event.shiftKey ? last : first
  } else if (event.shiftKey && index === 0) {
    target = last
  } else if (!event.shiftKey && index === controls.length - 1) {
    target = first
  }

  if (target === null) {
    return false
  }
  event.preventDefault()
  return focusElement(target)
}

/* -------------------------------------------------------------------------- */
/* Reduced motion                                                              */
/* -------------------------------------------------------------------------- */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Whether the user has asked for reduced motion.
 *
 * Exposed for the JavaScript that CSS cannot cover — chiefly whether a focus
 * move is allowed to scroll, since a scroll is motion.
 *
 * Safe where `matchMedia` does not exist (older test environments, unusual
 * embedders): the answer is then "no preference stated", which is the
 * permissive default and never throws.
 */
export function prefersReducedMotion(): boolean {
  const query = mediaQuery(REDUCED_MOTION_QUERY)
  return query?.matches ?? false
}

function mediaQuery(media: string): MediaQueryList | null {
  const global = globalThis as { matchMedia?: (query: string) => MediaQueryList }
  return typeof global.matchMedia === 'function' ? global.matchMedia(media) : null
}

/** Reactive form of {@link prefersReducedMotion}, for components that animate. */
export function useReducedMotion(): () => boolean {
  const query = mediaQuery(REDUCED_MOTION_QUERY)
  const [matches, setMatches] = createSignal(query?.matches ?? false)

  if (query !== null && getOwner() !== null) {
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    query.addEventListener('change', listener)
    onCleanup(() => query.removeEventListener('change', listener))
  }

  return matches
}

/* -------------------------------------------------------------------------- */
/* Live region                                                                 */
/* -------------------------------------------------------------------------- */

export type Politeness = 'polite' | 'assertive'

interface Announcement {
  readonly text: string
  readonly politeness: Politeness
  /** Bumped on every announcement so a repeated message still re-announces. */
  readonly sequence: number
}

const [announcement, setAnnouncement] = createSignal<Announcement | null>(null)
let sequence = 0

/**
 * Announce a message to assistive technology.
 *
 * Module-level rather than passed down through props: warnings are raised deep
 * inside step content while the live region lives at the app root, and threading
 * an announce callback through every layer is how warnings end up silently
 * unannounced.
 *
 * Repeat announcements are handled explicitly. Setting the same text twice
 * produces no DOM change, and a live region only announces *changes* — so the
 * region is cleared first and refilled on the next microtask, which makes "the
 * same warning appeared again" actually speak.
 */
export function announce(text: string, politeness: Politeness = 'polite'): void {
  if (text.trim() === '') {
    return
  }
  sequence += 1
  setAnnouncement({ text: '', politeness, sequence })
  queueMicrotask(() => {
    setAnnouncement((current) =>
      current !== null && current.sequence === sequence ? { text, politeness, sequence } : current,
    )
  })
}

/** Drop any pending announcement; for tests and for teardown. */
export function resetAnnouncements(): void {
  setAnnouncement(null)
}

export interface LiveRegionProps {
  /** `assertive` interrupts; reserve it for blocking errors. */
  readonly politeness?: Politeness
}

/**
 * The live region the app mounts once at its root.
 *
 * Rendered for both politeness levels at all times, because a live region that
 * is added to the DOM at the same moment it is filled is not reliably announced
 * — the region has to exist first.
 */
export function LiveRegion(props: LiveRegionProps): JSX.Element {
  const current = () => {
    const value = announcement()
    return value !== null && value.politeness === (props.politeness ?? 'polite') ? value.text : ''
  }

  return (
    <div
      role="status"
      aria-live={props.politeness ?? 'polite'}
      aria-atomic="true"
      class="sr-only"
      data-testid={`live-region-${props.politeness ?? 'polite'}`}
    >
      {current()}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Field association                                                           */
/* -------------------------------------------------------------------------- */

export interface FieldIds {
  readonly control: string
  readonly hint: string
  readonly error: string
  readonly warning: string
}

export function fieldIds(base: string): FieldIds {
  return {
    control: `${base}-input`,
    hint: `${base}-hint`,
    error: `${base}-error`,
    warning: `${base}-warning`,
  }
}

export interface FieldMessages {
  readonly hint?: string | null
  readonly error?: string | null
  readonly warning?: string | null
}

/**
 * The `aria-describedby` value for a field, listing only the messages that exist.
 *
 * Order matters to a screen reader: the hint explains the field, the error says
 * what is wrong, and the warning says what to double-check — so a reader that
 * only takes the first description still gets the most useful one first.
 *
 * Returning `undefined` rather than `''` matters too: an empty `aria-describedby`
 * is invalid and some readers announce the literal attribute value.
 */
export function describedBy(ids: FieldIds, messages: FieldMessages): string | undefined {
  const parts: string[] = []
  if (nonEmpty(messages.hint)) parts.push(ids.hint)
  if (nonEmpty(messages.error)) parts.push(ids.error)
  if (nonEmpty(messages.warning)) parts.push(ids.warning)
  return parts.length > 0 ? parts.join(' ') : undefined
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * The message elements a field points at.
 *
 * A *blocking* error is `role="alert"` so it is announced the moment it appears,
 * while a non-blocking warning is deliberately not: it is inline guidance, and
 * interrupting the user on every keystroke would make the warnings worse than
 * useless.
 */
export function FieldMessagesView(props: {
  readonly ids: FieldIds
  readonly hint?: string | null
  readonly error?: string | null
  readonly warning?: string | null
}): JSX.Element {
  return (
    <>
      <Show when={nonEmpty(props.hint)}>
        <p class="muted" id={props.ids.hint}>
          {props.hint}
        </p>
      </Show>
      <Show when={nonEmpty(props.error)}>
        <p class="error" id={props.ids.error} role="alert">
          {props.error}
        </p>
      </Show>
      <Show when={nonEmpty(props.warning)}>
        <p class="warning" id={props.ids.warning} data-warning="true">
          {props.warning}
        </p>
      </Show>
    </>
  )
}
