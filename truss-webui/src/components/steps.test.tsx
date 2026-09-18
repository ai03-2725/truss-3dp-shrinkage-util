import { cleanup, render, screen, within } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vitest'
import { scanSources } from '../test-utils/source-scan'
import { createTestApp } from '../test-utils/app'
import { stepById } from '../flow/registry'
import { StepScreen } from './steps'

/**
 * The step screens' *structure* (T24–T32).
 *
 * The flow tests drive the screens and assert what the numbers say; these assert
 * how the screen is built, because "what the user sees" is not the same thing as
 * "what the JSX says".
 *
 * That distinction is not academic. Solid compiles each screen into a
 * `<template>`, so the browser's HTML parser gets a vote: a `<ul>` written inside
 * a `<p>` is closed by the parser, the stray `</p>` becomes an empty paragraph,
 * and the child indices the compiler generated no longer address the nodes it
 * thinks they do. The result was a step 5 whose figures, headings and paragraphs
 * rendered in an order that appeared nowhere in the source. Nothing in the DOM
 * is wrong on its own — every element is present and correct — so only an
 * assertion about *order* can see it.
 */

/** Render a registered step on its own, as the engine would. */
function renderStep(id: Parameters<typeof stepById>[0]): HTMLElement {
  const app = createTestApp()
  const { container } = render(() => (
    <StepScreen
      step={stepById(id)}
      engine={app.engine}
      printers={app.printers}
      settings={app.settings}
    />
  ))
  return container
}

/** The step's own content column: the direct parent of its measurement group. */
function contentColumn(container: HTMLElement): Element {
  const fieldset = container.querySelector('fieldset')
  if (fieldset?.parentElement == null) {
    throw new Error('Expected the step to render a measurement group')
  }
  return fieldset.parentElement
}

/**
 * The tag names of an element's element children, in document order.
 *
 * `<br>` is filtered out: it is presentational spacing, and what this guard
 * exists for is the order of the *content* (a Solid `<template>` is parsed by
 * the browser, which silently reorders invalid nesting).
 */
function childTags(element: Element): string[] {
  return Array.from(element.children)
    .map((child) => child.tagName.toLowerCase())
    .filter((tag) => tag !== 'br')
}

/** Whether `first` precedes `second` in document order. */
function precedes(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

afterEach(cleanup)

describe('the measure step (Q5)', () => {
  it('puts the general warnings first, then the beam’s measurement group', () => {
    const container = renderStep('Q5')

    // Everything after the warning box belongs to the beam group, where each
    // dimension has a section of its own.
    expect(childTags(contentColumn(container))).toEqual(['h3', 'div', 'fieldset'])
    expect(screen.getByRole('heading', { name: 'Before you measure' })).toBeInTheDocument()
  })

  it('gives each dimension a section ordered diagram, photograph, field', () => {
    const container = renderStep('Q5')
    const fieldset = container.querySelector('fieldset')
    if (fieldset == null) {
      throw new Error('Expected the beam group to render')
    }

    // The whole group in order. The inner section is the longer one because the
    // inner-jaws warnings sit inside it, between the inner photograph and the
    // inner field they explain.
    expect(childTags(fieldset)).toEqual([
      'h3', // Measure the outer dimension
      'p', // introduces the outer measurement
      'figure', // the outer CAD diagram
      'figure', // the outer photograph
      'p', // introduces the outer field
      'div', // the X outer field
      'h3', // Measure the inner dimension
      'figure', // the inner CAD diagram
      'figure', // the inner photograph
      'h4', // Warnings regarding the inner measurement
      'p',
      'ul', // the three seating rules — a sibling of the heading, not inside a <p>
      'figure',
      'figure',
      'figure',
      'h5', // Incorrect examples
      'p', // introduces the first wrong example
      'figure',
      'p', // introduces the second wrong example
      'figure',
      'p', // introduces the inner field
      'div', // the X inner field
    ])
  })

  it('pairs each diagram with its own photograph, ahead of the field', () => {
    const container = renderStep('Q5')
    const fieldset = container.querySelector('fieldset')
    if (fieldset == null) {
      throw new Error('Expected the beam group to render')
    }

    const captions = Array.from(fieldset.querySelectorAll('figcaption')).map(
      (caption) => caption.textContent,
    )
    expect(captions.slice(0, 4)).toEqual([
      'Where the outer measurement goes.',
      'Taking the X outer measurement.',
      'Where the inner measurement goes.',
      'Taking the X inner measurement.',
    ])

    // Each field still names itself, and each figure is the full width of the
    // step rather than half of the two-up grid this replaced.
    expect(screen.getByLabelText(/^X outer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^X inner/i)).toBeInTheDocument()
    expect(container.querySelectorAll('.measurement-grid')).toHaveLength(0)
  })

  it('keeps the inner-jaws warnings with the inner measurement they explain', () => {
    renderStep('Q5')

    const outerHeading = screen.getByRole('heading', { name: 'Measure the outer dimension' })
    const innerHeading = screen.getByRole('heading', { name: 'Measure the inner dimension' })
    const innerPhoto = screen.getByAltText('Taking the X inner measurement.')
    const guidance = screen.getByRole('heading', {
      name: 'Warnings regarding the inner measurement',
    })
    const innerField = screen.getByLabelText(/^X inner/i)

    // Inside the inner section — after its heading and its photograph, and
    // before the field it explains — rather than up beside the generic warnings,
    // where it was read a screen before it was useful.
    expect(precedes(outerHeading, innerHeading)).toBe(true)
    expect(precedes(innerHeading, innerPhoto)).toBe(true)
    expect(precedes(innerPhoto, guidance)).toBe(true)
    expect(precedes(guidance, innerField)).toBe(true)

    // The nesting is in the heading levels too, so the outline a screen reader
    // walks matches the structure on screen.
    expect(
      screen.getByRole('heading', {
        name: 'Warnings regarding the inner measurement',
        level: 4,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Incorrect examples', level: 5 }),
    ).toBeInTheDocument()
  })

  it('points each incorrect example out before showing it', () => {
    // The symptom the order assertions above guard, named directly: a previous
    // bug hoisted both figures above the headings and paragraphs explaining them.
    renderStep('Q5')

    const heading = screen.getByRole('heading', { name: 'Incorrect examples' })
    const examples = [
      {
        explanation: screen.getByText(/not touching the supportive walls/),
        figure: screen.getByAltText('The flat sides are not touching the support walls.'),
      },
      {
        explanation: screen.getByText(/inserted from the bottom of the print/),
        figure: screen.getByAltText('Measuring from the bottom of the print.'),
      },
    ]

    for (const example of examples) {
      expect(precedes(heading, example.explanation)).toBe(true)
      expect(precedes(example.explanation, example.figure)).toBe(true)
    }
  })
})

describe('the remaining-beams step (Q6)', () => {
  it('does not repeat step 5’s guidance or its photographs', () => {
    renderStep('Q6')

    expect(screen.queryByRole('heading', { name: 'Before you measure' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Warnings regarding the inner measurement' }),
    ).not.toBeInTheDocument()

    // No figures at all: the seating is explained and shown on Q5, and Q6 is for
    // the six readings.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('lays the six readings out as a table of beams against sides', () => {
    renderStep('Q6')

    const table = screen.getByRole('table')

    // The headers are what name each field on screen...
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Beam', 'Outer', 'Inner'])
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Y', 'A', 'B'])

    // ...and because the visible labels are gone, each field keeps its own name
    // for assistive technology instead.
    expect(within(table).getAllByRole('textbox')).toHaveLength(6)
    for (const axis of ['Y', 'A', 'B'] as const) {
      expect(screen.getByLabelText(new RegExp(`^${axis} outer`))).toBeInTheDocument()
      expect(screen.getByLabelText(new RegExp(`^${axis} inner`))).toBeInTheDocument()
    }
  })
})

describe('no screen wraps block content in a paragraph', () => {
  it('keeps paragraphs to phrasing content, which is what the compiler assumes', async () => {
    /*
     * A standing prohibition rather than a unit test (PRD §6.3): the bug above
     * was invisible in the source, in types and in the DOM taken element by
     * element, and it will be reintroduced by anyone who writes the natural
     * `<p><ul>…</ul></p>`. `scanSources` strips comments, so the explanation of
     * the prohibition does not itself trip it.
     */
    const offences = await scanSources(
      /<p(?:\s[^>]*)?>\s*<(?:ul|ol|div|figure|fieldset|section|table|h[1-6]|blockquote|pre)\b/g,
    )

    expect(offences).toEqual([])
  })
})
