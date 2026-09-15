import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import assetsConfig from '../../assets.config.json'
import { IMAGES, STL, STL_DOWNLOAD_NAMES, type ImageKey } from './urls'

/**
 * The asset resolver's contract (T11.3) and its agreement with the pipeline that
 * produces the files (T11.1).
 *
 * In the test environment Vite resolves the `new URL(asset, import.meta.url)`
 * pattern to a URL on the dev server, so what is asserted here is the *path*: the
 * asset must sit beside the module in the app's own directory. The production
 * behaviour — a reference that stays inside the host script's directory under an
 * arbitrary sub-path — is verified by a real build in `urls.build.test.ts`.
 */

/** Vitest serves modules from the project root; `cwd` is that root. */
const projectRoot = process.cwd()
const ASSET_DIRECTORY = path.join(projectRoot, 'src/assets')

function resolved(url: string): URL {
  return new URL(url)
}

/** The on-disk path an asset URL points at, as resolved in the test environment. */
function diskPath(url: string): string {
  return path.join(projectRoot, resolved(url).pathname.replace(/^\//, ''))
}

/** The asset must live in the app's own `src/assets/<directory>/`, by name. */
function expectBesideModule(url: string, directory: string, name: string): void {
  expect(diskPath(url)).toBe(path.join(ASSET_DIRECTORY, directory, name))
}

describe('asset URLs', () => {
  it('resolves every image beside this module, never at the domain root', () => {
    for (const [key, url] of Object.entries(IMAGES)) {
      const fileName = `${path.basename(resolved(url).pathname)}`
      expect(resolved(url).pathname, key).toMatch(/\/src\/assets\/img\/[a-z0-9-]+\.webp$/)
      expectBesideModule(url, 'img', fileName)
    }
  })

  it('resolves both STLs beside this module', () => {
    for (const key of Object.keys(STL)) {
      const url = STL[key as keyof typeof STL]
      expect(resolved(url).pathname, key).toMatch(/\/src\/assets\/stl\/[a-z]+\.stl$/)
      expectBesideModule(url, 'stl', `${key}.stl`)
    }
  })

  it('points at files the asset pipeline has actually produced', () => {
    for (const url of [...Object.values(IMAGES), ...Object.values(STL)]) {
      const file = diskPath(url)
      expect(existsSync(file), `${file} is missing — run pnpm assets:sync`).toBe(true)
    }
  })

  it('offers downloads under the guides’ own filenames', () => {
    expect(STL_DOWNLOAD_NAMES).toEqual({
      quad: 'Truss Calibration Beam Quad.stl',
      single: 'Truss Calibration Beam Single.stl',
    })
  })
})

describe('the resolver table and the pipeline manifest agree', () => {
  it('covers exactly the configured images', () => {
    const referenced = Object.values(IMAGES).map((url) =>
      path.basename(resolved(url).pathname, '.webp'),
    )
    const configured = assetsConfig.images.map((name) => path.parse(name).name)

    expect([...referenced].sort()).toEqual([...configured].sort())
  })

  it('has no two keys pointing at the same file', () => {
    expect(new Set(Object.values(IMAGES)).size).toBe(Object.keys(IMAGES).length)
  })

  it('never ships a deliberately excluded image', () => {
    const referenced = new Set(
      Object.values(IMAGES).map((url) => path.basename(resolved(url).pathname, '.webp')),
    )
    for (const excluded of assetsConfig.unused) {
      expect(referenced.has(path.parse(excluded).name), excluded).toBe(false)
    }
  })

  it('excludes the Dual model, which is out of scope', () => {
    expect(Object.keys(STL)).toEqual(['quad', 'single'])
    expect(JSON.stringify(assetsConfig.unused)).toContain('truss-dual')
  })

  it('types every referenced key', () => {
    const keys: ImageKey[] = ['trussQuad', 'xOuterDiagram', 'calipersIncorrectGap']
    for (const key of keys) {
      expect(IMAGES[key]).toBeTruthy()
    }
  })
})

describe('no root-absolute asset references exist in the source', () => {
  it('finds no literal path that would resolve against the host origin', async () => {
    const { readdir, readFile } = await import('node:fs/promises')
    const sourceRoot = path.join(projectRoot, 'src')

    async function walk(directory: string): Promise<string[]> {
      const entries = await readdir(directory, { withFileTypes: true })
      const files = await Promise.all(
        entries.map(async (entry) => {
          const full = path.join(directory, entry.name)
          if (entry.isDirectory()) return walk(full)
          // Test files legitimately quote the banned pattern to assert on it,
          // and comments discuss it — only shipped code is scanned.
          return /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : []
        }),
      )
      return files.flat()
    }

    /** Crude but sufficient: the guard is about code, not about prose. */
    function stripComments(source: string): string {
      return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    }

    const offences: string[] = []
    for (const file of await walk(sourceRoot)) {
      const code = stripComments(await readFile(file, 'utf8'))
      // The documented breakage: `/Truss%20Calibration%20Beam%20Quad.stl` and
      // friends resolve against the *page* origin, not the widget's.
      for (const match of code.matchAll(/["'`(]\/(?:assets|img|stl|Truss)[^"'`)]*["'`)]/g)) {
        offences.push(`${path.relative(projectRoot, file)}: ${match[0]}`)
      }
    }

    expect(offences).toEqual([])
  })
})
