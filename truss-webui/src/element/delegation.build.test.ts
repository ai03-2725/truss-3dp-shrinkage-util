import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

/**
 * Build-configuration test for the embedding requirement (PRD §6.2, T36).
 *
 * ## Why this test exists at all
 *
 * Solid implements `onClick` in JSX as **event delegation**: the compiler emits
 * one `_$delegateEvents(["click"])` call for the module, and the handler is not
 * attached to the element at all — it is stored as a `$$click` property on the
 * element, to be looked up later by a single listener registered on `document`.
 *
 * That lookup starts from `event.target`. Inside a shadow root it must not: for a
 * listener registered *outside* the shadow tree, the browser **retargets**
 * `event.target` to the host element, so the walk begins at
 * `<truss-calibrator>` and never reaches the button that was clicked. The
 * shipped widget is then completely inert — no button, checkbox, or text field
 * responds — while every jsdom test still passes, because jsdom does not retarget
 * `event.target` for document-level listeners. This was a real, shipped bug,
 * found by clicking the built bundle in a browser.
 *
 * The fix is `solid({ solid: { delegateEvents: false } })` in `vite.config.ts`.
 * This test is the guard: it reads the *built output* and fails if the delegation
 * marker comes back. It is deliberately an assertion about the build artefacts
 * rather than about behaviour, because the behaviour cannot be observed in
 * jsdom — and a guard that cannot fail is worse than none.
 */

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

interface EmittedOutput {
  readonly fileName: string
  readonly type: string
  readonly code?: string
}

async function buildElement(): Promise<string> {
  const result = await build({
    root: appRoot,
    configFile: path.join(appRoot, 'vite.config.ts'),
    logLevel: 'silent',
    build: {
      write: false,
      rollupOptions: {
        input: { element: path.join(appRoot, 'src/element/truss-calibrator.tsx') },
        output: {
          format: 'es',
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  })

  if (!('output' in result)) {
    throw new Error('Expected a completed build, received a watcher.')
  }

  return (result.output as unknown as readonly EmittedOutput[])
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code ?? '')
    .join('\n')
}

describe('the shipped bundle does not delegate events to the document', () => {
  it('carries no delegated-handler markers', async () => {
    const code = await buildElement()

    // `$$click` and friends are the compiler's delegation markers. Property names
    // survive minification, so their presence is a reliable signal that the
    // handlers are on the document's delegation path — and therefore dead inside
    // the shadow root.
    for (const event of ['click', 'input', 'change', 'submit', 'keydown']) {
      expect(code).not.toContain(`$$${event}`)
    }
  })

  it('attaches the handlers to the elements instead', async () => {
    const code = await buildElement()

    // The other half of the claim: handler registration has to be present
    // *somewhere*. Without this, the test above would pass on an empty bundle.
    // The quote style is whatever the minifier chose, so match any of them.
    expect(code).toMatch(/addEventListener\([`"']click/)
  })
})
