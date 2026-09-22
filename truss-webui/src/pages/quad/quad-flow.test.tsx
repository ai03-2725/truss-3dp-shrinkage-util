import { render, screen } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import type { MeasurementState } from '../../lib/types'
import { Q8ExtrapolationFactor } from './Q8ExtrapolationFactor'
import { Q9Result } from './Q9Result'

const measurements: MeasurementState = {
  XOuter: 130,
  XInner: 150,
  YOuter: 141,
  YInner: 141,
  AOuter: 141,
  AInner: 141,
  BOuter: 141,
  BInner: 141,
}

describe('Quad flow calculations (PRD §13, §20.4)', () => {
  it('displays the extrapolation factor at 5 dp', () => {
    const onSave = vi.fn()
    render(() => (
      <Q8ExtrapolationFactor
        current={8}
        total={9}
        onBack={() => {}}
        onExit={() => {}}
        onSave={onSave}
        measurements={measurements}
        existingNames={[]}
      />
    ))
    expect(screen.getByText('1.00536')).toBeInTheDocument()
  })

  it('turns the measurements into the final 4 dp slicer value', () => {
    render(() => (
      <Q9Result
        current={9}
        total={9}
        printerName="Voron"
        measurements={measurements}
        onFinish={() => {}}
      />
    ))
    expect(screen.getByText('Calibrating on Voron')).toBeInTheDocument()
    expect(
      screen.getByText(/compensation ratio of 1\.00536/),
    ).toBeInTheDocument()
    expect(screen.getByText('100.5357')).toBeInTheDocument()
  })
})
