import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';

/** Labelled form field with an optional hint and error, wired up for screen readers. */
export function Field(props: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: (id: string, describedBy: string | undefined) => ComponentChildren;
}) {
  const id = useId();
  const describedBy = props.error ? `${id}-err` : props.hint ? `${id}-hint` : undefined;
  return (
    <div class="ob-field">
      <label class="lab" for={id}>
        {props.label}
      </label>
      {props.children(id, describedBy)}
      {props.error ? (
        <p class="ob-error" id={`${id}-err`} role="alert">
          {props.error}
        </p>
      ) : (
        props.hint && (
          <p class="ob-hint" id={`${id}-hint`}>
            {props.hint}
          </p>
        )
      )}
    </div>
  );
}

/** One-of-many choice rendered as pressed/unpressed chips. */
export function Chips<T extends string | number>(props: {
  label: string;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div class="ob-field" role="group" aria-label={props.label}>
      <span class="lab" aria-hidden="true">
        {props.label}
      </span>
      <div class="ob-chips">
        {props.options.map((o) => (
          <button
            type="button"
            class="chip"
            aria-pressed={o.value === props.value}
            disabled={o.disabled}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** On/off switch (a real checkbox underneath). */
export function Switch(props: { label: string; note?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div class="ob-switch-row">
      <div>
        <label for={id} class="ob-switch-label">
          {props.label}
        </label>
        {props.note && <p class="ob-hint">{props.note}</p>}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        class="ob-switch"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
    </div>
  );
}

export function Section(props: { kicker: string; title: string; intro?: string; children: ComponentChildren }) {
  return (
    <section class="ob-section" aria-labelledby="ob-step-title">
      <p class="lab">{props.kicker}</p>
      <h1 id="ob-step-title" class="h-display">
        {props.title}
      </h1>
      {props.intro && <p class="ob-intro">{props.intro}</p>}
      {props.children}
    </section>
  );
}
