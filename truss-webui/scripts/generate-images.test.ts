// Focused checks for the JPEG generator. These run under `node --test` with
// Node's TypeScript type stripping, so they rely only on the standard library,
// `sharp` (already a dev dependency), and the real repository sources.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'

import {
  JPEG_QUALITY,
  DEFAULT_SOURCE_DIR,
  MAX_DIMENSION,
  assertUniqueOutputNames,
  generateImages,
  outputName,
} from './generate-images.ts'

function tempDir(t: { after: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'truss-images-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function silent(): (message: string) => void {
  return () => {}
}

test('outputName maps each source to a same-basename .jpg', () => {
  assert.equal(outputName('caliper-enter-top.jpg'), 'caliper-enter-top.jpg')
  assert.equal(outputName('inner-measurement-walls.png'), 'inner-measurement-walls.jpg')
})

test('duplicate output basenames are rejected', () => {
  assert.throws(
    () => assertUniqueOutputNames(['photo.jpg', 'photo.png']),
    /Duplicate output name "photo\.jpg"/,
  )
})

test('outputs are JPEG, quality 90, aspect-preserving, and capped at 2560px', async (t) => {
  const outputDir = tempDir(t)
  const files = [
    'caliper-enter-top.jpg', // 4080x3072, must shrink
    'shrinkage-adjust-2.png', // 924x582, must stay as-is
  ]

  const { generated, skipped } = await generateImages({
    sourceDir: DEFAULT_SOURCE_DIR,
    outputDir,
    files,
    log: silent(),
  })

  assert.equal(generated.length, 2)
  assert.equal(skipped.length, 0)
  assert.equal(JPEG_QUALITY, 90)

  for (const file of files) {
    const destination = join(outputDir, outputName(file))
    assert.ok(existsSync(destination), `${destination} should exist`)

    const sourceMeta = await sharp(join(DEFAULT_SOURCE_DIR, file)).metadata()
    const outputMeta = await sharp(destination).metadata()

    assert.equal(outputMeta.mediaType, 'image/jpeg')
    assert.equal(outputMeta.format, 'jpeg')
    assert.ok(outputMeta.width && outputMeta.height)
    assert.ok(
      Math.max(outputMeta.width, outputMeta.height) <= MAX_DIMENSION,
      `${file} longest side should be <= ${MAX_DIMENSION}`,
    )

    // Aspect ratio is preserved (allow a pixel of rounding).
    const sourceRatio = sourceMeta.width! / sourceMeta.height!
    const outputRatio = outputMeta.width! / outputMeta.height!
    assert.ok(Math.abs(sourceRatio - outputRatio) < 0.01, `${file} aspect ratio`)

    // No upscaling: a source within bounds keeps its original dimensions.
    if (
      sourceMeta.width! <= MAX_DIMENSION &&
      sourceMeta.height! <= MAX_DIMENSION
    ) {
      assert.equal(outputMeta.width, sourceMeta.width)
      assert.equal(outputMeta.height, sourceMeta.height)
    }
  }
})

test('reruns skip existing outputs and only recreate deleted ones', async (t) => {
  const outputDir = tempDir(t)
  const files = ['shrinkage-adjust-1.png', 'shrinkage-adjust-2.png']
  const options = { sourceDir: DEFAULT_SOURCE_DIR, outputDir, files, log: silent() }

  const first = await generateImages(options)
  assert.equal(first.generated.length, 2)

  const target = join(outputDir, outputName(files[0]))
  const beforeBytes = readFileSync(target)
  const beforeMtime = statSync(target).mtimeMs

  // Second run: nothing should be replaced.
  const second = await generateImages(options)
  assert.equal(second.generated.length, 0)
  assert.equal(second.skipped.length, 2)
  assert.deepEqual(readFileSync(target), beforeBytes)
  assert.equal(statSync(target).mtimeMs, beforeMtime)

  // Remove one output; only that one should be regenerated.
  rmSync(target)
  const third = await generateImages(options)
  assert.deepEqual(third.generated, [target])
  assert.equal(third.skipped.length, 1)
  assert.ok(existsSync(target))
})

test('a missing source fails with its path and creates no output', async (t) => {
  const outputDir = tempDir(t)
  const sourceDir = tempDir(t)

  await assert.rejects(
    generateImages({
      sourceDir,
      outputDir,
      files: ['does-not-exist.jpg'],
      log: silent(),
    }),
    /missing or unreadable.*does-not-exist\.jpg/,
  )

  assert.equal(existsSync(join(outputDir, 'does-not-exist.jpg')), false)
})

test('an encode failure leaves no destination or temp file', async (t) => {
  const outputDir = tempDir(t)
  const sourceDir = tempDir(t)
  writeFileSync(join(sourceDir, 'bogus.jpg'), 'this is not an image')

  await assert.rejects(
    generateImages({
      sourceDir,
      outputDir,
      files: ['bogus.jpg'],
      log: silent(),
    }),
    /Failed to generate .*bogus\.jpg/,
  )

  assert.equal(existsSync(join(outputDir, 'bogus.jpg')), false)
  assert.deepEqual(readdirSync(outputDir), [])
})
