import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'
import { toShadowStylesheet } from './shadow'

/**
 * The **shipped bundle's stylesheet**, as the browser will see it (T13.1).
 *
 * This test exists because of a real bug. The `:root` rewrite worked on the
 * unminified source and silently did nothing in the minified bundle — the
 * minifier emits `@import url(…);:root{…}`, where the character before the
 * selector is a semicolon, not the whitespace the rewrite expected — so every
 * design token was dropped and the widget rendered unstyled in production, with
 * the whole suite green.
 *
 * jsdom cannot be asked to cascade styles inside a shadow root, so the assertion
 * is made the only other way that is faithful: take the CSS text *out of the
 * built file* and put it through the *shipped* rewrite, then check the result.
 */

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const buildDir = path.join(appRoot, 'node_modules/.tmp/shadow-build')

interface BuiltArtefacts {
  readonly files: readonly string[]
  readonly bundle: string
  readonly css: string
}

let built: Promise<BuiltArtefacts> | null = null

/**
 * Pull the embedded stylesheet out of the bundle: it is the one template literal
 * that contains a design token.
 */
function extractStylesheet(bundle: string): string {
  const match = /`([^`]*--form-input-padding[^`]*)`/.exec(bundle)
  if (match === null) {
    throw new Error('No embedded stylesheet found in the built bundle')
  }
  return match[1]
}

function buildBundle(): Promise<BuiltArtefacts> {
  built ??= (async () => {
    await mkdir(buildDir, { recursive: true })
    const result = await build({
      root: appRoot,
      configFile: path.join(appRoot, 'vite.config.ts'),
      logLevel: 'silent',
      build: { outDir: buildDir, emptyOutDir: true, write: true, minify: true },
    })
    if (!('output' in result)) {
      throw new Error('Expected a completed build, received a watcher.')
    }

    const files = await readdir(buildDir)
    const bundle = await readFile(path.join(buildDir, 'truss-calibrator.js'), 'utf8')
    return { files, bundle, css: extractStylesheet(bundle) }
  })()
  return built
}

afterAll(async () => {
  await rm(buildDir, { recursive: true, force: true })
})

describe('the shipped bundle', () => {
  it('is one script plus its assets, with no stylesheet for the page to link', async () => {
    const { files } = await buildBundle()

    expect(files).toContain('truss-calibrator.js')
    // A linked stylesheet could not reach a shadow root, and its file name would
    // become something the host page has to know.
    expect(files.filter((name) => name.endsWith('.css'))).toEqual([])
  })

  it('carries the app’s stylesheet inside the script', async () => {
    const { css } = await buildBundle()

    expect(css).toContain('--form-input-padding')
    expect(css).toContain('.truss-calibrator-root')
    expect(css).toContain('box-sizing:border-box')
    // Relative imports were inlined by the build; what remains is absolute.
    expect(css).not.toMatch(/@import\s+["']\./)
  })

  it('is minified, which is the shape that broke the rewrite', async () => {
    const { css } = await buildBundle()

    // The minified form the rewrite must survive: a statement, then a selector.
    expect(css).toMatch(/;:root\{/)
  })

  it('becomes shadow-safe once the shipped rewrite is applied', async () => {
    const { css } = await buildBundle()
    const shadow = toShadowStylesheet(css)

    expect(shadow).toMatch(/:host\{[^}]*--form-input-padding/)
    expect(shadow).toMatch(/:host\{[^}]*--text-color-default/)
    expect(shadow).toContain('.truss-calibrator-root')
    // The failure condition: a token block still addressed to `:root`, which
    // matches nothing inside a shadow root.
    expect(shadow).not.toMatch(/[;{}]:root\{/)
    expect(shadow).not.toMatch(/[;{}]html\{/)
  })

  it("carries the app's layout corrections, not just the element stylesheets", async () => {
    const { css } = await buildBundle()

    /*
     * `local.css` has to come *after* the element stylesheets in the bundle: it
     * contains the app's corrections to rules those files set for a light-DOM
     * page. The one that matters most is the floated label — measured in a
     * browser, the scaffold's `label { float: left; width: 100% }` consumed the
     * whole line, leaving the flex row beside it with zero available width and
     * collapsing every measurement input to ~30px.
     *
     * A cascade-order regression here would be invisible to every DOM test, so
     * the assertion is that the correction is present *and* that it wins by
     * arriving last.
     */
    const correctionAt = css.lastIndexOf('label{float:none')
    const scaffoldAt = css.indexOf('float:left')

    expect(correctionAt).toBeGreaterThan(-1)
    expect(scaffoldAt).toBeGreaterThan(-1)
    expect(correctionAt).toBeGreaterThan(scaffoldAt)
  })

  it('keeps the visually hidden file input at 1px, not the element styles’ 100%', async () => {
    const { css } = await buildBundle()
    const style = document.createElement('style')
    style.textContent = toShadowStylesheet(css).replace(/:host/g, '.truss-calibrator-root')
    document.head.append(style)

    const input = document.createElement('input')
    input.type = 'file'
    input.className = 'sr-only'
    document.body.append(input)

    try {
      /*
       * Same cascade-order hazard as above, with a quieter symptom: `.sr-only` is
       * a lone class and `input[type='file']` sets `width: 100%`, so the
       * correction in `local.css` wins only by arriving last. A minifier is
       * entitled to rewrite the stylesheet, so the winner is *measured* here
       * rather than assumed. Left at 100%, the invisible import input reached 1px
       * past the viewport and put a horizontal scrollbar on the page.
       */
      expect(getComputedStyle(input).width).toBe('1px')
    } finally {
      style.remove()
      input.remove()
    }
  })
})
