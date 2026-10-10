import { multiply } from './value.ts';
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('missing app root');
root.textContent = `Web CI fixture: ${multiply(3, 4)}`;
