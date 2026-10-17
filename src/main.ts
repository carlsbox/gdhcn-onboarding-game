import './style.css';
import { World } from './world/World';
import { UI } from './ui/ui';
import { Game } from './game/Game';
import { Demo } from './demo/Demo';
import { MOMENTS } from './game/scenario';
import { applySettings, loadSettings, saveSettings, type Settings } from './game/settings';
import { mountFeedback } from './ui/feedback';

const app = document.getElementById('app')!;
const world = new World(app);
const ui = new UI(app);
const game = new Game(world, ui);
mountFeedback(app);

world.onPlaceClick = id => {
  const p = world.places[id];
  ui.toast(`<b>${p.name}</b><br>${p.blurb}`, 'info', 5000);
};

function use(s: Settings) {
  applySettings(s);
  world.setNames(s.country, s.code);
}

async function demo() {
  world.reset();
  world.setNames('The Country', ''); // the demo is generic so the recorded narration always fits
  const next = await new Demo(world, app).run();
  if (next === 'again') return demo();
  location.hash = next === 'play' ? 'phase=A' : '';
  location.reload();
}

// #phase=B jumps straight into a phase; #demo plays the explainer
const phase = /phase=([A-E])/.exec(location.hash)?.[1];
const start = phase ? Math.max(0, MOMENTS.findIndex(m => m.phase === phase)) : 0;

(async () => {
  const saved = loadSettings();
  use(saved);
  if (location.hash === '#demo') return demo();
  if (phase) return game.run(start);
  const { mode, settings } = await ui.title(saved);
  saveSettings(settings);
  use(settings);
  if (mode === 'demo') return demo();
  await game.run(0);
})();

// handy for debugging in the browser console
(window as unknown as { __game: unknown }).__game = { world, ui, game };
