import { Dynamic } from 'solid-js/web'
import type { AppApi } from '../lib/app-api.ts'
import { HomeContent as HomeEn } from './en/Home.tsx'
import { HomeContent as HomeJa } from './ja/Home.tsx'

// Shared container: owns the Single-calibration condition and callbacks, then
// renders the locale-selected page content.
export function Home(props: { app: AppApi }) {
  const hasPrinters = () => props.app.printers().length > 0
  return (
    <Dynamic
      component={props.app.locale() === 'ja' ? HomeJa : HomeEn}
      app={props.app}
      hasPrinters={hasPrinters()}
    />
  )
}
