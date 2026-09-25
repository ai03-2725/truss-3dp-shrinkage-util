// Renders a Phosphor icon from its raw SVG markup, sized to the current font
// size and coloured via currentColor. Decorative by default; pass `label` to
// expose it as an image instead.
export function Icon(props: { svg: string; label?: string; class?: string }) {
  return (
    <span
      class={props.class ?? 'truss-icon'}
      innerHTML={props.svg}
      aria-hidden={props.label ? undefined : 'true'}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
    />
  )
}
