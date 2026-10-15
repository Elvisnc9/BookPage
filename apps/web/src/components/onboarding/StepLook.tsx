import { Section } from './ui';

const LOOKS = [
  { key: 'classic', name: 'Classic', tag: 'Free', about: 'Clean and simple, fast on any phone.', accent: 'var(--orange)' },
  { key: 'bold', name: 'Bold', tag: 'Pro', about: 'Big colour header, made to stand out.', accent: 'var(--red)' },
  { key: 'soft', name: 'Soft', tag: 'Pro', about: 'Rounded and warm, great for beauty and spa.', accent: 'var(--yellow)' },
];

/** Only Classic exists at launch; Pro looks are shown so owners know what's coming. */
export function StepLook() {
  return (
    <Section kicker="Step 4 · Look" title="Pick a look" intro="Your page uses Classic. More looks come with Pro.">
      <div class="ob-looks" role="radiogroup" aria-label="Page look">
        {LOOKS.map((l) => {
          const on = l.key === 'classic';
          return (
            <div class={`ob-look box${on ? ' raised' : ''}`} role="radio" aria-checked={on} aria-disabled={!on}>
              <div class="ob-look-swatch" style={{ borderLeftColor: l.accent }} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div class="ob-look-name">
                <strong>{l.name}</strong>
                <span class={`ob-tag mono${l.tag === 'Pro' ? ' pro' : ''}`}>{on ? 'Selected' : `${l.tag} · soon`}</span>
              </div>
              <p class="ob-hint">{l.about}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
