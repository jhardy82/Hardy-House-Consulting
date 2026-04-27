let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="contact"]');
  if (!section) return;

  // Build the contact card UI using safe DOM methods
  const container = document.createElement('div');
  container.id = 'contactContainer';

  // Logo Area
  const logoArea = document.createElement('div');
  logoArea.id = 'contactLogo';

  const symbol = document.createElement('div');
  symbol.id = 'contactSymbol';
  symbol.textContent = '◇ ◈ ◇';

  const word = document.createElement('div');
  word.id = 'contactWord';
  word.textContent = 'Hardy House Consulting';

  const divider = document.createElement('div');
  divider.id = 'contactDivider';

  logoArea.append(symbol, word, divider);

  // Centre -- Contact Info
  const centre = document.createElement('div');
  centre.id = 'contactCentre';

  const name = document.createElement('div');
  name.id = 'contactName';

  const first = document.createElement('span');
  first.textContent = 'James';

  const last = document.createElement('span');
  last.textContent = 'Hardy';

  name.append(first, last);

  const role = document.createElement('div');
  role.id = 'contactRole';
  role.textContent = 'Modern Workplace · Endpoint Engineering';

  centre.append(name, role);

  // Contact Panel
  const panel = document.createElement('div');
  panel.id = 'contactPanel';

  const panelTitle = document.createElement('div');
  panelTitle.id = 'contactPanelTitle';
  panelTitle.textContent = 'Get in touch';

  const panelBody = document.createElement('div');
  panelBody.id = 'contactPanelBody';

  const locLine = document.createElement('div');
  locLine.textContent = '📍 Denver, CO · Avanade (Microsoft/Accenture JV)';

  const liLine = document.createElement('div');
  const liLink = document.createElement('a');
  liLink.href = 'https://www.linkedin.com/in/jameshardy82';
  liLink.target = '_blank';
  liLink.rel = 'noopener noreferrer';
  liLink.textContent = 'linkedin.com/in/jameshardy82';
  liLink.addEventListener('click', e => e.stopPropagation());
  liLine.append(document.createTextNode('💼 LinkedIn: '), liLink);

  const emLine = document.createElement('div');
  emLine.textContent = '✉ Tap to copy email';

  panelBody.append(locLine, liLine, emLine);

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
