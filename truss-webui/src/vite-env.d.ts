/// <reference types="vite/client" />

// Vite resolves `?url` imports for arbitrary asset types; declare STL so the
// TypeScript build accepts them (PRD §16).
declare module '*.stl?url' {
  const src: string
  export default src
}
