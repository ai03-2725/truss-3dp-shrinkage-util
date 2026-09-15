import { describe, expect, it } from 'vitest'
import { scanSources, shippedSourceFiles } from '../test-utils/source-scan'

/**
 * T12.5 — the app must never touch the URL.
 *
 * PRD §6.1: no routing, no history manipulation, no deep links. All navigation is
 * internal state, and the browser's Back button is explicitly not a navigation
 * mechanism for the flow.
 *
 * The reason this is a *scan* rather than a behavioural test: the risk is not a
 * bug in code that navigates, it is someone adding `location.hash = '#step-3'`
 * later for what looks like a good reason. Embedded in a host page, that would
 * silently rewrite the parent site's URL.
 */

const FORBIDDEN = [
  /\bwindow\.location\b/g,
  /(?<![.\w])location\.(?:href|hash|search|pathname|assign|replace|reload)\b/g,
  /\bwindow\.history\b/g,
  /(?<![.\w])history\.(?:pushState|replaceState|back|forward|go)\b/g,
  /\bpushState\b|\breplaceState\b/g,
  /\bhashchange\b|\bpopstate\b/g,
  /\bhistory\s*:\s*(?:screen|browser)\b/g,
]

describe('the app never touches the URL', () => {
  it('has no reference to location or history in shipped source', async () => {
    const offences: string[] = []
    for (const pattern of FORBIDDEN) {
      for (const offence of await scanSources(pattern)) {
        offences.push(`${offence.file}: ${offence.text}`)
      }
    }

    expect(offences).toEqual([])
  })

  it('scans a non-trivial number of files, so the check cannot pass vacuously', async () => {
    const files = await shippedSourceFiles()
    expect(files.length).toBeGreaterThan(8)
  })
})
