let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="contact"]');
  if (!section) return;

  // Build the contact card UI using safe DOM methods
  const container = document.createElement('div');
  container.id = 'contactContainer';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: max(env(safe-area-inset-top), 28px) 0 max(env(safe-area-inset-bottom), 20px);
    z-index: 10;
    pointer-events: all;
  `;

  // Logo Area
  const logoArea = document.createElement('div');
  logoArea.id = 'contactLogo';
  logoArea.style.cssText = `
    text-align: center;
    padding: 0 24px;
    flex: 0 0 auto;
  `;

  const symbol = document.createElement('div');
  symbol.id = 'contactSymbol';
  symbol.textContent = '◇ ◈ ◇';
  symbol.style.cssText = `
    font-size: 1.5rem;
    letter-spacing: 0.3em;
    color: rgba(196, 154, 31, 0.45);
    margin-bottom: 0.3rem;
    animation: symbolPulse 4s ease-in-out infinite;
  `;

  const word = document.createElement('div');
  word.id = 'contactWord';
  word.textContent = 'Hardy House Consulting';
  word.style.cssText = `
    font-family: 'Cormorant', serif;
    font-size: 1.0rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(196, 154, 31, 0.55);
  `;

  const divider = document.createElement('div');
  divider.id = 'contactDivider';
  divider.style.cssText = `
    width: 36px;
    height: 1px;
    background: rgba(196, 154, 31, 0.22);
    margin: 0.7rem auto;
  `;

  logoArea.append(symbol, word, divider);

  // Centre -- Contact Info
  const centre = document.createElement('div');
  centre.id = 'contactCentre';
  centre.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
  `;

  const name = document.createElement('div');
  name.id = 'contactName';
  name.style.cssText = `
    font-size: clamp(2.6rem, 10vw, 4.2rem);
    font-weight: 300;
    letter-spacing: -0.01em;
    color: #fff;
    line-height: 1;
    text-align: center;
    margin-bottom: 0.6rem;
    text-shadow: 0 0 60px rgba(155, 123, 224, 0.28);
  `;

  const first = document.createElement('span');
  first.textContent = 'James';
  first.style.cssText = 'display: block; font-weight: 600;';

  const last = document.createElement('span');
  last.textContent = 'Hardy';
  last.style.cssText = 'display: block; font-weight: 300; font-style: italic; color: rgba(244, 240, 235, 0.72);';

  name.append(first, last);

  const role = document.createElement('div');
  role.id = 'contactRole';
  role.textContent = 'Modern Workplace · Endpoint Engineering';
  role.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(196, 154, 31, 0.68);
    text-align: center;
    line-height: 1.8;
  `;

  centre.append(name, role);

  // Contact Panel
  const panel = document.createElement('div');
  panel.id = 'contactPanel';
  panel.style.cssText = `
    flex: 0 0 auto;
    margin: 0 20px;
    background: rgba(14, 8, 32, 0.85);
    border: 1px solid rgba(196, 154, 31, 0.14);
    border-radius: 12px;
    padding: 16px 20px 20px;
    backdrop-filter: blur(12px);
    min-height: 90px;
    transition: opacity 0.25s;
    pointer-events: all;
    cursor: pointer;
  `;

  const panelTitle = document.createElement('div');
  panelTitle.id = 'contactPanelTitle';
  panelTitle.textContent = 'Get in touch';
  panelTitle.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.56rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(196, 154, 31, 0.55);
    margin-bottom: 0.55rem;
  `;

  const panelBody = document.createElement('div');
  panelBody.id = 'contactPanelBody';
  panelBody.textContent = '📍 Denver, CO · Avanade (Microsoft/Accenture JV)\n\n💼 LinkedIn: linkedin.com/in/jameshardy\n✉ Tap to copy email';
  panelBody.style.cssText = `
    font-size: 0.82rem;
    color: rgba(244, 240, 235, 0.7);
    line-height: 1.65;
    white-space: pre-wrap;
  `;

  panel.append(panelTitle, panelBody);

  container.append(logoArea, centre, panel);
  section.appendChild(container);

  // Attach copy-to-clipboard handler
  const toast = document.querySelector('#toast');

  if (toast) {
    panel.addEventListener('click', () => {
      const email = 'james@hardyhouseconsulting.com';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email).catch(() => {
          // Silently fail if clipboard API unavailable
        });
      }
      toast.textContent = 'Email copied';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1600);
    });
  }
}
