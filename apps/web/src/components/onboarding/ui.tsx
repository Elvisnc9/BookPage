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

/**
 * A step's heading and body. `scan` names one word of the title to set in the
 * striped BookPage display style (static here: no looping motion in the app).
 */
export function Section(props: { title: string; scan?: string; intro?: string; kicker?: string; children: ComponentChildren }) {
  const at = props.scan ? props.title.lastIndexOf(props.scan) : -1;
  return (
    <section class="ob-section" aria-labelledby="ob-step-title">
      <header class="ob-section-head">
        <h1 id="ob-step-title" class="ob-title" tabIndex={-1}>
          {at >= 0 ? (
            <>
              {props.title.slice(0, at)}
              <span class="ob-scan">{props.scan}</span>
              {props.title.slice(at + props.scan!.length)}
            </>
          ) : props.title}
        </h1>
        {props.intro && <p class="ob-intro">{props.intro}</p>}
      </header>
      {props.children}
    </section>
  );
}

/** A titled group of fields: the form's building block. */
export function Card(props: { title: string; hint?: string; children: ComponentChildren; class?: string; id?: string }) {
  return (
    <div class={`ob-card ${props.class ?? ''}`} id={props.id}>
      <div class="ob-card-head">
        <h2 class="ob-card-title">{props.title}</h2>
        {props.hint && <p class="ob-hint">{props.hint}</p>}
      </div>
      {props.children}
    </div>
  );
}
