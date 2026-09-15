/**
 * Asset sync (T11.1).
 *
 * Copies the two in-scope STLs from the repo root and re-encodes the referenced
 * documentation images into the app's source tree, so that Vite can emit them as
 * part of the module graph. The generated directories are gitignored: the repo
 * root stays the single source of truth, and committed copies could only drift.
 *
 * Why not `public/`: a public asset is referenced root-absolutely, which breaks
 * the moment the widget is embedded under a sub-path (PRD §6.3). Files that go
 * through the module graph are referenced relative to the app's own script URL
 * instead — see `src/assets/urls.ts`.
 *
 * Run with `pnpm assets:sync`; it is wired as `predev`/`prebuild`.
 */
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(appRoot, '..')

const config = JSON.parse(await readFile(path.join(appRoot, 'assets.config.json'), 'utf8'))

const stlSourceDir = path.resolve(repoRoot, config.stlSourceDir)
const imageSourceDir = path.resolve(repoRoot, config.imageSourceDir)
const stlOutputDir = path.resolve(appRoot, config.stlOutputDir)
const imageOutputDir = path.resolve(appRoot, config.imageOutputDir)

await mkdir(stlOutputDir, { recursive: true })
await mkdir(imageOutputDir, { recursive: true })

function human(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(bytes / 1024)}KB`
}

/** Fail loudly rather than shipping an app whose download button 404s. */
async function requireFile(source, role) {
  if (!existsSync(source)) {
    throw new Error(`Missing ${role}: ${source}`)
  }
  return stat(source)
}

const { maxEdge, quality } = config.image

let sourceBytes = 0
let outputBytes = 0
let optimised = 0
let copied = 0

for (const [key, fileName] of Object.entries(config.stl)) {
  const source = path.join(stlSourceDir, fileName)
  const target = path.join(stlOutputDir, `${key}.stl`)
  const info = await requireFile(source, 'STL')
  await copyFile(source, target)

  sourceBytes += info.size
  outputBytes += info.size
  copied += 1
}

for (const fileName of config.images) {
  const source = path.join(imageSourceDir, fileName)
  const target = path.join(imageOutputDir, `${path.parse(fileName).name}.webp`)
  const info = await requireFile(source, 'documentation image')

  const encoded = await sharp(source)
    // Honour EXIF orientation before resizing: a rotated phone photo otherwise
    // gets its long edge measured in the wrong direction.
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()

  await writeFile(target, encoded)

  sourceBytes += info.size
  outputBytes += encoded.length
  optimised += 1
}

console.log(
  `assets:sync — ${copied} STLs copied, ${optimised} images optimised ` +
    `(${human(sourceBytes)} → ${human(outputBytes)} at ${maxEdge}px, WebP q${quality})`,
)
