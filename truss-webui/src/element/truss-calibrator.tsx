import { render } from 'solid-js/web'
import { Calibrator } from '../components/Calibrator'
import { installStyles } from '../styles/shadow'

/**
 * The custom element (PRD §6.1, decisions 13–14).
 *
 * `<truss-calibrator>` is **zero-config**: no attributes, no events, no
 * imperative API, no routing. The host page writes the tag and that is the whole
 * contract, so nothing here reads an attribute or dispatches anything.
 *
 * Two lifecycle details carry weight:
 *
 * - The Solid root is disposed on disconnect, because a host page may mount and
 *   unmount the widget freely and a leaked root would keep reacting to nothing.
 *   A consequence worth knowing: re-connecting renders a *fresh* root, so a host
 *   that moves the element within the DOM restarts the flow. That is consistent
 *   with the "no mid-flow recovery" rule (PRD §12) rather than an exception to it.
 * - `delegatesFocus: true` is required for keyboard users: without it, focusing
 *   the host element does nothing, and tabbing *into* a shadow root from outside
 *   skips its contents.
 */

export const ELEMENT_TAG = 'truss-calibrator'

export class TrussCalibratorElement extends HTMLElement {
  #dispose: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
  }

  connectedCallback(): void {
    if (this.#dispose !== null) {
      return
    }
    const root = this.shadowRoot
    if (root === null) {
      // Only reachable if something detached the shadow root before we got here.
      return
    }
    // Styles first, so the first paint is already styled rather than flashing an
    // unstyled tree.
    installStyles(root)
    this.#dispose = render(() => <Calibrator />, root)
  }

  disconnectedCallback(): void {
    this.#dispose?.()
    this.#dispose = null
  }
}

/**
 * Register the element, tolerating a second registration.
 *
 * A host page may include this script alongside another bundle that already
 * registered the tag; throwing on a duplicate definition would break the page for
 * no benefit.
 */
export function defineTrussCalibrator(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(ELEMENT_TAG)) {
    registry.define(ELEMENT_TAG, TrussCalibratorElement)
  }
}

// Registering on import is the point of a zero-config element: the host page's
// only action is including this file.
defineTrussCalibrator()

declare global {
  interface HTMLElementTagNameMap {
    'truss-calibrator': TrussCalibratorElement
  }
}
