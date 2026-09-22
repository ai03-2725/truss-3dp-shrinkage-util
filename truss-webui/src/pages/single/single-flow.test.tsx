import { render, screen } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import type { MeasurementState } from '../../lib/types'
import { S6Result } from './S6Result'

const measurements: MeasurementState = { XOuter: 141, XInner: 139 }

describe('Single flow calculations (PRD §13.3)', () => {
  it('extrapolates the single measurement using the saved factor', () => {
    render(() => (
      <S6Result
        current={6}
        total={6}
        printer={{ name: 'Voron', extrapolationFactor: 1.02345 }}
        measurements={measurements}
        onFinish={() => {}}
      />
    ))
    expect(screen.getByText('Calibrating on Voron')).toBeInTheDocument()
    expect(
      screen.getByText(/extrapolated compensation ratio of 1\.02345/),
    ).toBeInTheDocument()
    expect(screen.getByText('102.345')).toBeInTheDocument()
  })
})
