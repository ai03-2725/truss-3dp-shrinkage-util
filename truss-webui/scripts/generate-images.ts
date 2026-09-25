// Generates the AVIF copies of the guide images used by the web app.
//
// Source of truth: Documentation/Images/. Outputs are written next to the
// existing Vite asset imports under src/assets/images/ and are intentionally
// untracked. Existing outputs are skipped, so reruns never re-encode them.
// Sources are assumed immutable: changing conversion settings or sources
// requires deleting the affected outputs before regenerating.
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

export const DEFAULT_SOURCE_DIR = resolve(SCRIPT_DIR, '..', '..', 'Documentation', 'Images')
export const DEFAULT_OUTPUT_DIR = resolve(SCRIPT_DIR, '..', 'src', 'assets', 'images')

export const MAX_DIMENSION = 2560
export const AVIF_QUALITY = 60

// The 30 images imported by src/lib/assets.ts. `truss-dual.png` is deliberately
// absent: the app does not use it.
export const SOURCE_FILENAMES = [
  'caliper-enter-top.jpg',
  'calipers-incorrect-gap.jpg',
  'calipers-incorrect-side.jpg',
  'finished-print.jpg',
  'inner-correct-1.jpg',
  'inner-correct-2.jpg',
  'inner-measurement-single.png',
  'inner-measurement-walls.png',
  'outer-measurement-single.png',
  'outer-measurement-walls.png',
  'outer-seam-example.png',
  'print-prepared.png',
  'printing-quad.png',
  'printing-single.png',
  'seam-tool.png',
  'seam-visibility.png',
  'shrinkage-adjust-1.png',
  'shrinkage-adjust-2.png',
  'single-measurement-inner.jpg',
  'single-measurement-outer.jpg',
  'single-printed.jpg',
  'sliced-single.png',
  'slicer-loaded.png',
  'truss-quad.png',
  'truss-single.png',
  'x-beam.jpg',
  'x-inner-diagram.png',
  'x-inner-measurement.jpg',
  'x-outer-diagram.png',
  'x-outer-measurement.jpg',
]

export function outputName(source: string): string {
  return basename(source, extname(source)) + '.avif'
}

export function assertUniqueOutputNames(files: string[]): void {
  const seen = new Map<string, string>()
  for (const file of files) {
    const name = outputName(file)
    const previous = seen.get(name)
    if (previous !== undefined) {
      throw new Error(
        `Duplicate output name "${name}" from "${previous}" and "${file}". ` +
          'Rename one of the sources; refusing to overwrite.',
      )
    }
    seen.set(name, file)
  }
}

export interface GenerateOptions {
  sourceDir?: string
  outputDir?: string
  files?: string[]
  log?: (message: string) => void
}

export interface GenerateResult {
  generated: string[]
  skipped: string[]
}

let tempCounter = 0

export async function generateImages(options: GenerateOptions = {}): Promise<GenerateResult> {
  const sourceDir = options.sourceDir ?? DEFAULT_SOURCE_DIR
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR
  const files = options.files ?? SOURCE_FILENAMES
  const log = options.log ?? ((message: string) => console.log(message))

  assertUniqueOutputNames(files)
  mkdirSync(outputDir, { recursive: true })

  const generated: string[] = []
  const skipped: string[] = []

  for (const file of files) {
    const source = join(sourceDir, file)
    const destination = join(outputDir, outputName(file))

    // Validate the source even when the output already exists, so deleting or
    // unreadable originals cannot pass silently.
    try {
      accessSync(source, constants.R_OK)
    } catch {
      throw new Error(`Required source image is missing or unreadable: ${source}`)
    }

    if (existsSync(destination)) {
      skipped.push(destination)
      log(`skip     ${basename(destination)} (already exists)`)
      continue
    }

    // Encode to a sibling temp file, then rename on success, so a failed run
    // never leaves a partial output that a later run would mistake for complete.
    const temporary = join(
      outputDir,
      `.${basename(destination)}.tmp-${process.pid}-${tempCounter++}`,
    )

    try {
      await sharp(source)
        .rotate() // apply EXIF orientation and drop the metadata
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .avif({ quality: AVIF_QUALITY })
        .toFile(temporary)
      renameSync(temporary, destination)
    } catch (error) {
      rmSync(temporary, { force: true })
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to generate ${destination} from ${source}: ${reason}`)
    }

    generated.push(destination)
    log(`generate ${basename(destination)}`)
  }

  return { generated, skipped }
}

const isDirectRun = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  generateImages()
    .then(({ generated, skipped }) => {
      console.log(
        `\nGenerated ${generated.length} image(s), skipped ${skipped.length} existing.`,
      )
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
