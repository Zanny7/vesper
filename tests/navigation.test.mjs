import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, shell, team] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/shell.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/team.js', import.meta.url), 'utf8'),
]);

test('fixed utility rail contains only Inventory and Settings stays beside help', () => {
  const rail = html.match(/<div class="utility-controls"[\s\S]*?<\/div>/)?.[0];
  assert.ok(rail, 'utility rail exists');
  assert.match(rail, /id="inventory-button"[^>]*data-utility="inventory"/);
  assert.equal([...rail.matchAll(/data-utility=/g)].length, 1, 'Inventory is the sole fixed utility');
  assert.doesNotMatch(html, /id="equipment-button"|data-utility="equipment"/);
  assert.match(html, /id="help-button"[\s\S]*?id="settings-button"[^>]*data-utility="settings"/);
  assert.match(html, /id="settings-button"[^>]*aria-label="Settings"[^>]*title="Settings"[^>]*aria-expanded="false"/);
});

test('equipment is managed from Team and active encounters restrict Inventory only', () => {
  assert.match(html, /data-navigate="team">Team/);
  assert.match(team, /paper-doll.*member\.role.*equipment/);
  assert.match(shell, /new Set\(\['inventory'\]\)/);
  assert.doesNotMatch(shell, /onEquipmentShortcut|next === 'equipment'/);
});
