import { Dynamic } from 'solid-js/web'
import type { AppApi } from '../lib/app-api.ts'
import { AboutContent as AboutEn } from './en/About.tsx'
import { AboutContent as AboutJa } from './ja/About.tsx'

// Shared container: navigation stays shared, long-form copy is locale-specific.
export function About(props: { app: AppApi }) {
  return (
    <Dynamic
      component={props.app.locale() === 'ja' ? AboutJa : AboutEn}
      app={props.app}
    />
  )
}
