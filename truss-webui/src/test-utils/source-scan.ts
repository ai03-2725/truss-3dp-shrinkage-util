import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Source-scanning helpers for the "this must never happen again" tests.
 *
 * Some requirements are best enforced as a standing prohibition on the source
 * tree (PRD §6.1, §6.3): "no routing", "no root-absolute asset URLs". A unit test
 * cannot prove a negative about code that does not exist yet, but a scan can
 * fail the moment someone adds it.
 */

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'src')

/** Source files that ship, excluding tests and helpers. */
export async function shippedSourceFiles(directory: string = sourceRoot): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        return shippedSourceFiles(full)
      }
      return /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : []
    }),
  )
  return nested.flat()
}

/**
 * Remove comments so a prohibition is about code rather than about prose.
 *
 * Crude by design — a real parser would be more precise, but the patterns being
 * searched for are literal paths and API names, and no shipped source contains a
 * string literal that looks like a comment.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

export interface Offence {
  readonly file: string
  readonly text: string
}

/** Every match of `pattern` in shipped source, with the file it came from. */
export async function scanSources(pattern: RegExp): Promise<Offence[]> {
  const offences: Offence[] = []
  for (const file of await shippedSourceFiles()) {
    const code = stripComments(await readFile(file, 'utf8'))
    for (const match of code.matchAll(pattern)) {
      offences.push({ file: path.relative(projectRoot, file), text: match[0] })
    }
  }
  return offences
}
