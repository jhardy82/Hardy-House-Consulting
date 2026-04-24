import { initRouter } from './utils/router.js';
import { getElement } from './elementState.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await getElement();
    initRouter();
  } catch (err) {
    console.error('[app] init failed:', err);
  }
});
