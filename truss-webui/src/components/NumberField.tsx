// A labelled measurement input. type="text" + inputmode="decimal" avoids browser
// number-field precision/locale surprises while keeping arbitrary precision.
export function NumberField(props: {
  id: string
  label: string
  value: string
  onInput: (value: string) => void
  unit?: string
  error?: string
  warning?: string
}) {
  const describedBy = () => {
    const ids: string[] = []
    if (props.error) ids.push(`${props.id}-error`)
    if (props.warning) ids.push(`${props.id}-warning`)
    return ids.length ? ids.join(' ') : undefined
  }

  return (
    <div class="truss-field">
      <label for={props.id}>
        {props.label}
        {props.unit ? ` (${props.unit})` : ''}
      </label>
      <input
        id={props.id}
        type="text"
        inputmode="decimal"
        autocomplete="off"
        value={props.value}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={describedBy()}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
      {props.error && (
        <p id={`${props.id}-error`} class="truss-error" role="alert">
          {props.error}
        </p>
      )}
      {props.warning && (
        <p id={`${props.id}-warning`} class="truss-warning" role="status">
          {props.warning}
        </p>
      )}
    </div>
  )
}
