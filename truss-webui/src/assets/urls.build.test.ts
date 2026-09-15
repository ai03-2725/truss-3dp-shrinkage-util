import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

/**
 * Build-configuration test for the embedding requirement (T11.4, PRD §6.3).
 *
 * The requirement is that asset URLs resolve against the app's **own script
 * URL**, never the page or domain root — otherwise the widget works standalone
 * and breaks the instant it is mounted under a sub-path, which is precisely the
 * failure that would not be noticed until deployment.
 *
 * The build below mirrors the shipped configuration: a non-lib Rollup input with
 * a relative base. It builds the *real* asset module, then resolves every emitted
 * reference against a deliberately deep sub-path.
 *
 * Note on `build.lib`: it is **not** used, and cannot be. Vite's asset plugin
 * short-circuits in library mode (`if (environment.config.build.lib) return
 * true`) and inlines every asset as a data URI, *ignoring* `assetsInlineLimit`.
 * That would base64 the 1.3MB of STLs into the entry chunk and turn the download
 * button into a `data:` URL — hence the "real files" test below.
 */

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

interface EmittedOutput {
  readonly fileName: string
  readonly type: string
  readonly code?: string
}

async function buildAssetModule(): Promise<readonly EmittedOutput[]> {
  const result = await build({
    root: appRoot,
    configFile: path.join(appRoot, 'vite.config.ts'),
    logLevel: 'silent',
    build: {
      write: false,
      rollupOptions: {
        input: { urls: path.join(appRoot, 'src/assets/urls.ts') },
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

  return result.output as unknown as readonly EmittedOutput[]
}
function chunkCode(outputs: readonly EmittedOutput[]): string {
  return outputs
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code ?? '')
    .join('\n')
}

/** The sub-path mount we must survive. */
const HOST_SCRIPT_URL = 'https://example.com/deep/sub/path/truss-calibrator.js'
const HOST_SCRIPT_DIR = '/deep/sub/path/'

describe('emitted asset references', () => {
  it('emit the models and figures as real files, not inlined data URIs', async () => {
    const outputs = await buildAssetModule()
    const assets = outputs
      .filter((output) => output.type === 'asset')
      .map((output) => output.fileName)

    expect(assets.filter((name) => name.endsWith('.stl'))).toHaveLength(2)
    expect(assets.filter((name) => name.endsWith('.webp'))).toHaveLength(28)

    const code = chunkCode(outputs)
    expect(code).not.toContain('data:image/webp;base64')
    expect(code).not.toContain('data:application/octet-stream;base64')
  })

  it('are never root-absolute', async () => {
    const code = chunkCode(await buildAssetModule())

    // A leading-slash reference would resolve against the host's origin.
    expect(code).not.toMatch(/["'`]\/[a-zA-Z0-9][^"'`]*\.(?:stl|webp)/)
  })

  it('resolve inside the host script’s own directory', async () => {
    const code = chunkCode(await buildAssetModule())

    // Asset references only: a *filename* string such as the STL names offered
    // for download also ends in `.stl`, and is not a URL.
    const references = [...code.matchAll(/["'`]([^"'`\s]+\.(?:stl|webp))["'`]/g)].map(
      (match) => match[1],
    )
    expect(references).toHaveLength(30)

    for (const reference of references) {
      expect(reference.startsWith('/'), reference).toBe(false)
      expect(reference.startsWith('http'), reference).toBe(false)

      const resolved = new URL(reference, HOST_SCRIPT_URL)
      expect(resolved.origin).toBe('https://example.com')
      expect(resolved.pathname.startsWith(HOST_SCRIPT_DIR), reference).toBe(true)
      // Assets sit beside the script, so the whole widget is one relocatable
      // directory the host page can mount anywhere.
      expect(path.posix.dirname(resolved.pathname), reference).toBe(`${HOST_SCRIPT_DIR}assets`)
    }
  })

  it('keeps `base` relative, which is what makes the above hold', async () => {
    // A guard on the configuration itself: with an absolute base Vite emits
    // `/assets/…` and every assertion above would fail.
    const { loadConfigFromFile } = await import('vite')
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      path.join(appRoot, 'vite.config.ts'),
      appRoot,
    )

    const config = loaded?.config as { base?: string } | undefined
    expect(config?.base).toBe('./')
  })
})
