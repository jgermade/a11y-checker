import { render } from 'preact';
import { App } from './App.js';
import { createHost } from './host.js';

const host = createHost();
if (host.theme) document.documentElement.dataset.theme = host.theme;

const root = document.getElementById('app');
if (root) render(<App host={host} />, root);
