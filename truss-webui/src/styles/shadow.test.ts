import { describe, expect, it } from 'vitest'
// Importing the element registers the tag, exactly as the host page's script
// tag does — the shadow-root behaviour below is only meaningful once it is.
import '../element/truss-calibrator'
import { installStyles, toShadowStylesheet } from './shadow'

/**
 * Shadow-root styling (T13.1, T13.2, T13.5).
 *
 * The failure this guards against is silent and total: if the stylesheet's
 * page-level selectors survive into the shadow root, `:root` matches nothing,
 * every design token is undefined, and the app renders unstyled with no error
 * anywhere.
 */

const stylesheet = toShadowStylesheet()

describe('the stylesheet is rewritten for a shadow tree', () => {
  it('has no :root selector left, which would match nothing inside a shadow root', () => {
    expect(stylesheet).not.toMatch(/:root\b/)
  })

  it('has no bare html or body selector left', () => {
    expect(stylesheet).not.toMatch(/(^|[\s,{};>+~])(html|body)(?=[\s,{;>+~:]|$)/m)
  })

  it('defines the tokens on :host instead', () => {
    expect(stylesheet).toMatch(/:host\s*\{/)
    // A token from vars.css, proving the block that defines it was reached.
    expect(stylesheet).toContain('--text-color-default')
    expect(stylesheet).toContain('--button-bg-primary')
  })

  it('keeps the selectors it is meant to keep', () => {
    // Guards the rewrite itself: replacing too much would strip real rules.
    expect(stylesheet).toMatch(/h1\s*\{/)
    expect(stylesheet).toMatch(/button/)
    expect(stylesheet).toMatch(/\.container\s*\{/)
  })
})

describe('the rewrite handles a minified stylesheet', () => {
  /*
   * Regression. The shipped CSS is minified, so a rule follows the previous one
   * as `@import url(…);:root{--x:1}` — a `;`, not a newline. The first version of
   * this rewrite required a whitespace or brace delimiter, so it worked on the
   * source and did nothing in the built bundle: every design token was dropped
   * and the widget rendered unstyled, silently, in production only.
   */
  it('rewrites :root that directly follows a statement', () => {
    expect(toShadowStylesheet('@import url("x.css");:root{--x:1}')).toBe(
      '@import url("x.css");:host{--x:1}',
    )
  })

  it('rewrites html and body in minified form', () => {
    expect(toShadowStylesheet('}html{font-size:1rem}body{margin:0}')).toBe(
      '}:host{font-size:1rem}:host{margin:0}',
    )
  })

  it('leaves identifiers that merely contain those words alone', () => {
    expect(toShadowStylesheet('.html-like{color:red}')).toBe('.html-like{color:red}')
    expect(toShadowStylesheet('meta:root-ish{color:red}')).toBe('meta:root-ish{color:red}')
  })
})

describe('the bundled stylesheet contains the app’s stylesheet set (T13.2)', () => {
  it('includes element styles', () => {
    // button.css, form.css, text.css
    expect(stylesheet).toContain('--button-padding')
    expect(stylesheet).toContain('--form-input-border')
    expect(stylesheet).toMatch(/h1,\s*h2,\s*h3/)
  })

  it('includes the spacing utilities', () => {
    expect(stylesheet).toMatch(/\.mt-1\s*[,{]/)
    expect(stylesheet).toMatch(/\.mb-1\s*[,{]/)
  })

  it('includes the app’s own styles', () => {
    expect(stylesheet).toContain('.truss-calibrator-root')
    expect(stylesheet).toContain('.readout')
    expect(stylesheet).toContain('.sr-only')
  })

  it('has no relative @import left, which could not be resolved from a shadow root', () => {
    // Commented-out imports (the stylesheet set keeps a few) are not real ones.
    const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
    const imports = [...withoutComments.matchAll(/@import\s+(?:url\()?["']?([^"')]+)/g)].map(
      (match) => match[1],
    )

    expect(imports.length).toBeGreaterThan(0)
    for (const specifier of imports) {
      // Relative specifiers are inlined by the build; anything remaining must be
      // an absolute URL the browser can fetch on its own.
      expect(specifier, specifier).toMatch(/^https?:/)
    }
  })
})

describe('the app-level reset the shadow boundary removes (T13.4)', () => {
  it('restores border-box sizing for shadow content', () => {
    // The host page's `* { box-sizing: border-box }` never crosses the boundary,
    // and the element stylesheets assume it.
    expect(stylesheet).toMatch(/\*,[\s\S]{0,40}\{[\s\S]{0,80}box-sizing:\s*border-box/)
  })

  it('constrains media, which nothing in the host page can do for us', () => {
    expect(stylesheet).toMatch(/img,\s*svg,[\s\S]{0,60}max-width:\s*100%/)
    expect(stylesheet).toMatch(/overflow-x:\s*auto/)
  })

  it('lets the host element shrink rather than push its container wider', () => {
    expect(stylesheet).toMatch(/:host\s*\{[^}]*max-width:\s*100%/)
    expect(stylesheet).toMatch(/:host\s*\{[^}]*min-width:\s*0/)
  })

  it('re-establishes inherited properties inside the tree, where the page cannot win', () => {
    /*
     * Outer-tree rules beat `:host` in the cascade, so a host page's
     * `* { color: … }` reaches every shadow descendant through inheritance. The
     * baseline therefore has to live on the app's own root element.
     */
    const root = /\.truss-calibrator-root\s*\{([^}]*)\}/.exec(stylesheet)?.[1] ?? ''

    expect(root).toMatch(/color:\s*var\(--text-color-default\)/)
    expect(root).toMatch(/font-family:\s*var\(--font-body\)/)
    expect(root).toMatch(/font-size:\s*1rem/)
  })
})

describe('installStyles', () => {
  function shadowRoot(): ShadowRoot {
    const host = document.createElement('div')
    document.body.append(host)
    return host.attachShadow({ mode: 'open' })
  }

  it('installs one style element into the shadow root', () => {
    const root = shadowRoot()
    installStyles(root)

    const styles = root.querySelectorAll('style')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain('--text-color-default')
  })

  it('is idempotent, so a re-connect cannot stack stylesheets', () => {
    const root = shadowRoot()
    installStyles(root)
    installStyles(root)

    expect(root.querySelectorAll('style')).toHaveLength(1)
  })

  it('puts the stylesheet before any content, so the first paint is styled', () => {
    const root = shadowRoot()
    const content = document.createElement('p')
    root.append(content)
    installStyles(root)

    expect(root.firstChild).toBe(root.querySelector('style'))
  })

  it('styles the widget when it renders into a shadow root', () => {
    // End-to-end through the element, which is what actually ships (T13.2).
    const element = document.createElement('truss-calibrator')
    document.body.append(element)

    const style = element.shadowRoot?.querySelector('style')
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain('.truss-calibrator-root')

    element.remove()
  })
})
