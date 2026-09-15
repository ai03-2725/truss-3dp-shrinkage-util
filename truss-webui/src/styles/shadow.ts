/**
 * Shadow-root styling (T13.1, PRD §6.2, decision 13).
 *
 * The app carries its own styles into the shadow root, which **repeals** the
 * brief's "add reusable styles to `global.css`" rule for anything selector-based:
 * a parent page's rules cannot reach a shadow root, and the app's rules cannot
 * leak out. `src/styles/**` is therefore the app's private stylesheet set.
 *
 * The whole set is imported as a string (`?inline`) rather than linked, because a
 * shadow root has no stylesheet links of its own — and because a `<link>` emitted
 * by the build would be a URL the host page has to know about.
 *
 * ## The `:root` rewrite
 *
 * The stylesheets were authored for a page, where design tokens live under
 * `:root`. Inside a shadow root `:root` matches nothing — there is no root
 * *element* in a shadow tree, only a fragment — so every token would be
 * undefined and the app would render unstyled. `:host` is the shadow tree's
 * equivalent (it is the element that owns the tree, and custom properties set on
 * it inherit to everything inside), so the page-level selectors are rewritten to
 * it on the way in.
 *
 * ## Known, bounded deviation
 *
 * `rem` resolves against the *document* root element even inside a shadow tree,
 * so a host page with a non-default root font-size scales the widget's
 * `rem`-based type scale. `:host`'s own font-size ramp does not correct that.
 * Making the widget immune would mean converting the shared stylesheet set from
 * `rem` to `em`, which is a larger change than the risk warrants; it is recorded
 * in the PRD rather than left to be discovered.
 */

import appStyles from './shadow.css?inline'

/**
 * Rewrite page-level selectors to their shadow-tree equivalents.
 *
 * Exported for testing: the specific failure this prevents — an unreachable
 * `:root` block silently dropping every design token — is invisible in a browser
 * until something looks wrong.
 *
 * The leading character class is "whatever can precede a selector": whitespace, a
 * combinator, or the end of the previous rule. `;` is in the list because that is
 * what a *minified* stylesheet looks like — `@import url(…);:root{--x:1}` — and
 * leaving it out produced a rewrite that worked on the source and silently did
 * nothing in the built bundle.
 */
export function toShadowStylesheet(css: string = appStyles): string {
  return (
    css
      // `:root` and `html` both mean "the tree's root" as far as this stylesheet
      // is concerned; in a shadow tree that is the host element.
      .replace(/(^|[\s,{};>+~)])(:root|html)(?=[\s,{;>+~:]|$)/gm, '$1:host')
      // A `<body>` selector has no counterpart at all and would be dead weight.
      .replace(/(^|[\s,{};>+~)])body(?=[\s,{;>+~:]|$)/gm, '$1:host')
  )
}

const STYLE_MARKER = 'data-truss-calibrator'

/**
 * Install the stylesheet into a shadow root.
 *
 * Idempotent, so a re-connect cannot accumulate duplicate stylesheets, and
 * marked with an attribute so the stylesheet is distinguishable from rendered
 * content when debugging.
 */
export function installStyles(root: ShadowRoot): void {
  if (root.querySelector(`style[${STYLE_MARKER}]`) !== null) {
    return
  }
  const style = root.ownerDocument.createElement('style')
  style.setAttribute(STYLE_MARKER, '')
  style.textContent = toShadowStylesheet()
  root.prepend(style)
}
