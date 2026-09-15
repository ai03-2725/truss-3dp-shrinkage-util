import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineTrussCalibrator, ELEMENT_TAG, TrussCalibratorElement } from './truss-calibrator'

/**
 * The element shell (T12.1, T12.4, decisions 13–14).
 *
 * `import './truss-calibrator'` has already registered the element as a side
 * effect — that is the shipped behaviour — so the tests below assert on the
 * registration that exists rather than creating their own.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

function mount(): TrussCalibratorElement {
  const element = document.createElement(ELEMENT_TAG)
  document.body.append(element)
  return element
}

describe('registration', () => {
  it('registers the tag on import', () => {
    expect(customElements.get(ELEMENT_TAG)).toBe(TrussCalibratorElement)
  })

  it('survives being defined twice, so a duplicate script tag cannot break a page', () => {
    expect(() => defineTrussCalibrator()).not.toThrow()
    expect(customElements.get(ELEMENT_TAG)).toBe(TrussCalibratorElement)
  })

  it('uses an open shadow root', () => {
    expect(mount().shadowRoot?.mode).toBe('open')
  })
})

describe('zero-config contract (decision 14)', () => {
  it('observes no attributes', () => {
    // `observedAttributes` is what makes `attributeChangedCallback` fire; the
    // element must have no configuration surface at all.
    expect(
      (TrussCalibratorElement as unknown as { observedAttributes?: string[] }).observedAttributes,
    ).toBeUndefined()
  })

  it('ignores attributes a host page might set anyway', () => {
    const element = document.createElement(ELEMENT_TAG)
    element.setAttribute('base-path', '/something')
    element.setAttribute('printer', 'X1C')
    document.body.append(element)

    // Renders normally, and the shadow root contains no trace of the attribute.
    expect(element.shadowRoot?.textContent).toContain('Truss Calibrator')
    expect(element.shadowRoot?.innerHTML).not.toContain('/something')
  })

  it('dispatches no events', () => {
    const listener = vi.fn()
    const element = document.createElement(ELEMENT_TAG)
    for (const type of ['ready', 'complete', 'exit', 'change']) {
      element.addEventListener(type, listener)
      document.addEventListener(type, listener)
    }
    document.body.append(element)
    element.remove()

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('rendering into the shadow root', () => {
  it('renders the app when connected', () => {
    const element = mount()

    expect(element.shadowRoot?.querySelector('.truss-calibrator-root')).not.toBeNull()
    expect(element.shadowRoot?.textContent).toContain('Truss Calibrator')
  })

  it('renders nothing into the light DOM', () => {
    const element = mount()
    expect(element.innerHTML).toBe('')
  })

  it('keeps the host page’s DOM untouched', () => {
    // A `<p>` that must survive the widget mounting and unmounting.
    const bystander = document.createElement('p')
    bystander.textContent = 'host content'
    document.body.prepend(bystander)

    const element = mount()
    element.remove()

    expect(bystander.isConnected).toBe(true)
    expect(document.body.textContent).toContain('host content')
  })

  it('tears the root down on disconnect', () => {
    const element = mount()
    element.remove()

    expect(element.shadowRoot?.childNodes.length ?? 0).toBe(0)
  })

  it('can be remounted freely, which is what a host page may do', () => {
    const element = mount()
    element.remove()
    document.body.append(element)

    expect(element.shadowRoot?.querySelector('.truss-calibrator-root')).not.toBeNull()
  })

  it('does not double-render when connect fires twice without a disconnect', () => {
    const element = mount()
    // `connectedCallback` with no intervening disconnect: the second call must be
    // a no-op, not a second root.
    element.connectedCallback()

    expect(element.shadowRoot?.querySelectorAll('.truss-calibrator-root')).toHaveLength(1)
  })
})

describe('interaction with the app the element builds itself', () => {
  /*
   * These tests deliberately use the **real** path: no injected dependencies, so
   * the element builds its own storage, stores and engine, exactly as it does when
   * a host page mounts it.
   *
   * That path had a shipped bug that every injected-dependency test missed. The app
   * root accepted a dependency seam for testing and, in the branch where nothing is
   * injected, assembled its engine *lazily* — so every read created a new, empty
   * engine, and the widget rendered correctly while responding to nothing. The
   * first click is therefore a functional requirement, not a smoke test.
   */
  function shadow(): ShadowRoot {
    const root = mount().shadowRoot
    if (root === null) {
      throw new Error('expected an open shadow root')
    }
    return root
  }

  const heading = (root: ShadowRoot): string =>
    root.querySelector('[data-step-heading]')?.textContent ?? ''

  it('advances from the landing screen when its own button is clicked', () => {
    const root = shadow()

    expect(heading(root)).toBe('Truss Calibrator')

    root.querySelector<HTMLButtonElement>('[data-testid="start"]')?.click()

    expect(heading(root)).toBe('Before you start')
  })

  it('opens the printer screen and comes back', () => {
    const root = shadow()

    root.querySelector<HTMLButtonElement>('[data-testid="printers"]')?.click()
    expect(root.querySelector('[data-testid="add-printer"]')).not.toBeNull()

    root.querySelector<HTMLButtonElement>('[data-testid="back-to-landing"]')?.click()
    expect(heading(root)).toBe('Truss Calibrator')
  })

  it('gates a step on the checkbox it rendered, using the app it built itself', () => {
    const root = shadow()
    root.querySelector<HTMLButtonElement>('[data-testid="start"]')?.click()

    const next = (): HTMLButtonElement => {
      const button = root.querySelector<HTMLButtonElement>('[data-testid="next"]')
      if (button === null) {
        throw new Error('expected a Next button')
      }
      return button
    }

    expect(next().disabled).toBe(true)

    for (const box of root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      if (box.id !== 'dont-ask-again') {
        box.click()
      }
    }

    expect(next().disabled).toBe(false)
  })
})

describe('focus behaviour', () => {
  it('sets delegatesFocus when it attaches its own root', () => {
    /*
     * Asserted on the constructor's own call rather than on the rendered result:
     * jsdom does not implement focus delegation, and what this test can usefully
     * pin is that the app asks for it. Real tab-order behaviour is verified in a
     * browser (T34).
     */
    const calls: ShadowRootInit[] = []
    const original = Element.prototype.attachShadow
    Element.prototype.attachShadow = function (init: ShadowRootInit) {
      calls.push(init)
      return original.call(this, init)
    }

    try {
      document.createElement(ELEMENT_TAG)
    } finally {
      Element.prototype.attachShadow = original
    }

    expect(calls).toEqual([{ mode: 'open', delegatesFocus: true }])
  })
})
