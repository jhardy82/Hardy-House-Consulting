let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="contact"]');
  if (!section) return;

  const container = document.createElement('div');
  container.id = 'contactContainer';

  // Logo area
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

  // Centre — name and role
  const centre = document.createElement('div');
  centre.id = 'contactCentre';
  const nameEl = document.createElement('div');
  nameEl.id = 'contactName';
  const first = document.createElement('span');
  first.textContent = 'James';
  const last = document.createElement('span');
  last.textContent = 'Hardy';
  nameEl.append(first, last);
  const role = document.createElement('div');
  role.id = 'contactRole';
  role.textContent = 'Modern Workplace · Endpoint Engineering';
  centre.append(nameEl, role);

  // Contact form — replaces the old panel
  const formWrap = document.createElement('div');
  formWrap.id = 'contactFormWrap';

  const form = document.createElement('form');
  form.id = 'contactForm';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'contactFormName';
  nameInput.required = true;
  nameInput.maxLength = 100;
  nameInput.placeholder = 'Your name';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'contactFormEmail';
  emailInput.required = true;
  emailInput.placeholder = 'your@email.com';

  const msgInput = document.createElement('textarea');
  msgInput.id = 'contactFormMsg';
  msgInput.required = true;
  msgInput.maxLength = 2000;
  msgInput.rows = 4;
  msgInput.placeholder = "What's on your mind?";

  const errorDiv = document.createElement('div');
  errorDiv.id = 'contactFormError';
  errorDiv.style.display = 'none';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.id = 'contactFormSubmit';
  submitBtn.textContent = 'Send message';

  form.append(nameInput, emailInput, msgInput, errorDiv, submitBtn);

  // Fallback mailto link
  const fallback = document.createElement('div');
  fallback.className = 'contact-mailto-fallback';
  const fallbackLink = document.createElement('a');
  fallbackLink.href = 'mailto:james@hardyhouseconsulting.com';
  fallbackLink.textContent = 'james@hardyhouseconsulting.com';
  fallback.append(document.createTextNode('Or email me directly: '), fallbackLink);

  formWrap.append(form, fallback);
  container.append(logoArea, centre, formWrap);
  section.appendChild(container);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;
    errorDiv.style.display = 'none';

    const body = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      message: msgInput.value.trim(),
    };

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        const success = document.createElement('div');
        success.dataset.contact = 'success';
        success.textContent = "Message sent — I'll be in touch soon.";
        form.replaceWith(success);
        return;
      }

      errorDiv.textContent = res.status === 429
        ? 'Too many requests — please wait a few minutes.'
        : (data.error || 'Something went wrong — please try again.');
      errorDiv.style.display = '';
    } catch {
      errorDiv.textContent = 'Network error — please try again.';
      errorDiv.style.display = '';
    }

    submitBtn.textContent = 'Send message';
    submitBtn.disabled = false;
  });
}
