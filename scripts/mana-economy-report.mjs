// Summarize the BAT-93 evidence; run after screen, final, gear and waiting probes.
import { readFileSync, writeFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(`docs/bat-93-${name}.json`));
const screen = read('conserve-screen'), final = read('conserve-final'), gear = read('gear'), waiting = read('waiting');
const selected = { recovery: .2, baseRegen: 3, gearScale: 1.5 };
const equal = (a, b) => a.recovery === b.recovery && a.baseRegen === b.baseRegen && a.gearScale === b.gearScale;
const pct = n => `${Math.round(n * 100)}%`, num = n => n == null ? '—' : Math.round(n).toLocaleString('en-US');
const label = t => `${pct(t.recovery)} / ${t.baseRegen} / ${t.gearScale}×`;
const uniqueTunings = report => [...new Map(report.groups.map(g => [JSON.stringify(g.tuning), g.tuning])).values()];
function aggregate(groups) {
  const attempts = groups.reduce((s, g) => s + g.attempts, 0);
  const bossAttempts = groups.reduce((s, g) => s + g.attempts * g.normalCompletion, 0);
  const mean = key => groups.reduce((s, g) => s + g.attempts * g[key], 0) / attempts;
  return { attempts, completion: mean('completion'), normalCompletion: mean('normalCompletion'),
    oomRate: mean('oomRate'), normalOomRate: mean('normalOomRate'),
    bossEntryMana: bossAttempts ? groups.reduce((s, g) => s + g.attempts * g.normalCompletion * (g.bossEntryMana || 0), 0) / bossAttempts : null };
}
const groups = (report, tuning, chapter, stage = 'ready', policy = 'conservative') => report.groups.filter(g =>
  equal(g.tuning, tuning) && g.chapter === chapter && g.stage === stage && g.policy === policy);
let md = `# BAT-93 — revised Mana evaluation and map display

**Selected and implemented on dev: 20% normal-victory recovery, 3 Mana/sec base Regen, 1.5× BAT-92 item Regen.** This rerun uses the September 27 updated requirements: 27 combinations, with passive clears recorded as pressure defects rather than used to suppress global Regen. The map display is implemented and verified. Encounter tuning remains fixed.

## Choice and limits

20% is the lowest approved recovery that supports the sampled prepared normal routes without routine OOM. At equal Regen, changing 10% to 20% raises prepared full-route completion in Chapters 1–4 from **81/41/58/89% to 100/78/96/95%**. Normal-route OOM falls from **0/44/19/6% to 0/6/0/2%**. Every prepared normal route completed under the selected setting. Bosses remain resource checks; Chapter 2 still has the largest failure/OOM burden.

Lowering base Regen to 2.5 or item scaling to 1.25× at 20% materially reduces Chapter 2–3 completion and mistake recovery. The tie-break favoring lower recovery does not apply to this clear improvement. The 0% configurations were eliminated by the complete screen, which left Chapter 2–3 boss completion at zero.

This is the best approved global compromise, not a claim that all pacing goals are solved. Cold first visits in Chapters 2–3 still often fail before the boss and require gearing through early encounters. Prepared Chapter 4 can erase an opening mistake and has many Mana-neutral normal fights. Some active-healing depleted-Mana re-entry probes also gain Mana; these are residual pacing exceptions, distinct from zero-cast defects. No encounter corrections, net-gain caps, higher base Regen, spell-cost changes or other unapproved knobs were tested or shipped.

## Method and evidence

- Real Shaman Combat, authored equipment, loot and resource reconciliation; Health, dead allies and Mana carry through routes. The selected global stats apply to all healers in production, but all balance decisions use Shaman only.
- Seeds: \`910000 + chapter × 10000 + index\`; each fight uses \`seed + position × 100000\`. Loot and combat RNG are separate. Gear selection is frozen to BAT-92 item scores in the analysis process, so candidates receive paired loadouts.
- \`first\`: inherited earlier-chapter equipment, no current-chapter farming, opening one point short before its milestone. \`ready\`: three acquired current-chapter normal-route reward passes. Acquisition assumes victories; it does not prove the farming sequence is itself viable. Ready is intended prepared gear, not automatically overgeared.
- The complete 27-setting conservation screen uses two seeds per path/stage and one chapter build: **1,188 routes**. Four finalists use eight seeds, all legal paths, all 2/2/3/4 chapter builds, first/ready stages and three policies: **6,528 routes**. The gear ablation adds **816 prepared routes**.
- Conservation uses the existing priority policy when a living member is below 45% Health or forecast Health over three seconds, including pending healing, falls below 65%. Wasteful play adds Healing Wave in spare cast time, including overheal. One mistake means one entire wasteful opening, not one bad cast. These alter simulated player choices only.
- OOM: Mana below the cheapest spell cost for more than one cumulative second. OOM is not a causal diagnosis of every loss. Boss-entry means include boss-reaching routes only; survival differences can bias comparisons. These are automated-policy results, not measured human clear rates.
- Main evidence: \`bat-93-conserve-screen.json\`, \`bat-93-conserve-final.json\`, \`bat-93-gear.json\`, \`bat-93-waiting.json\`. Original proactive-policy 18-setting files \`bat-93-screen.json\` / \`bat-93-final.json\` are historical diagnostics, not the revised screen.

## Complete 27-setting screen

Prepared full-route completion, including boss. Two seeds per path; use this to screen, not estimate final clear rates.

| Recovery | Base/sec | Item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|---:|---:|
`;
for (const tuning of uniqueTunings(screen)) {
  md += `| ${pct(tuning.recovery)} | ${tuning.baseRegen} | ${tuning.gearScale}× | `
    + [1, 2, 3, 4].map(c => pct(aggregate(groups(screen, tuning, c)).completion)).join(' | ') + ' |\n';
}
md += `
## Deeper finalists

Prepared conservation, all paths/builds, eight seeds. Entries below are completion / boss-entry Mana.

| Recovery / base / item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|
`;
for (const tuning of uniqueTunings(final)) md += `| ${label(tuning)} | ` + [1, 2, 3, 4].map(c => {
  const a = aggregate(groups(final, tuning, c)); return `${pct(a.completion)} / ${num(a.bossEntryMana)}`;
}).join(' | ') + ' |\n';
md += `
Selected setting; failure = 100% − completion. Any OOM includes the boss.

| Ch | Stage | Attempts | Normals cleared | Full route | Failure | Boss Mana | Any OOM | Normal OOM |
|---|---|---:|---:|---:|---:|---:|---:|---:|
`;
for (let c = 1; c <= 4; c++) for (const stage of ['first', 'ready']) {
  const a = aggregate(groups(final, selected, c, stage));
  md += `| ${c} | ${stage} | ${a.attempts} | ${pct(a.normalCompletion)} | ${pct(a.completion)} | ${pct(1-a.completion)} | ${num(a.bossEntryMana)} | ${pct(a.oomRate)} | ${pct(a.normalOomRate)} |\n`;
}
md += `
## Efficiency and mistake recovery

Prepared selected setting; completion / boss-entry Mana. Conditional boss averages should not be mistaken for paired changes.

| Ch | Conservation | Wasteful throughout | Wasteful opening only |
|---|---:|---:|---:|
`;
for (let c = 1; c <= 4; c++) md += `| ${c} | ` + ['conservative', 'conservativeWasteful', 'conservativeMistake'].map(policy => {
  const a = aggregate(groups(final, selected, c, 'ready', policy)); return `${pct(a.completion)} / ${num(a.bossEntryMana)}`;
}).join(' | ') + ' |\n';
md += `
Wasteful play fails all sampled prepared Chapter 1–3 routes and reaches the boss with much less Mana. An inefficient opening still permits 88/41/86/91% prepared completion. Chapter 4's opening mistake costs little by boss entry; this remains a pacing limitation.

## Representative route accounting

Path 0, fixed listed seeds and first chapter build. Failures are retained. Ending is after victory recovery and before loot. Capacity increases from unchanged Max Mana gear can make the next entry higher. Regen is actual capped gain; net cost = entry − ending. No boss/failure refund. JSON includes item IDs, every member's stats, snapshots, casts, overheal and OOM seconds. Values rounded here only.
`;
for (let c = 1; c <= 4; c++) for (const stage of ['first', 'ready']) {
  const seed = 910000 + c * 10000 + (stage === 'ready' && c <= 2 ? 1 : 0);
  const r = final.representatives.find(r => equal(r.tuning, selected) && r.chapter === c && r.stage === stage && r.seed === seed && r.policy === 'conservative');
  const opening = r.encounters[0], h = opening.entryParty.find(p => p.label === 'HEALER');
  const ids = Object.values(opening.equipped.shaman || {}).join(', ') || 'none';
  md += `
### Ch ${c}, ${stage}, seed ${seed}, ${r.build}

Opening: ${num(h.spellPower)} SP, ${num(h.maxMana)} Max Mana, ${opening.regenPerSecond.toFixed(2)} Mana/sec including talents. Healer items: ${ids}. Boss entry: ${num(r.bossEntryMana)}; ${r.won ? 'cleared' : 'failed'}.

| Encounter | Entry | Spent | Regen | Recovery | Ending | Net cost | Seconds | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
`;
  for (const e of r.encounters) md += `| ${e.encounter} | ${num(e.entryMana)} | ${num(e.manaSpent)} | ${num(e.manaRegenerated)} | ${num(e.manaRecovered)} | ${num(e.endingMana)} | ${num(e.netManaCost)} | ${e.seconds.toFixed(1)} | ${e.won ? 'win' : 'loss'} |\n`;
}
md += `
## Regen gear sustainability

Prepared conservation at 20% / 3/sec; all paths/builds, eight seeds. Each entry is completion / boss-entry Mana. Item identities and all other stats stay fixed.

| Item scale | Ch 1 | Ch 2 | Ch 3 | Ch 4 |
|---|---:|---:|---:|---:|
`;
for (const tuning of uniqueTunings(gear)) md += `| ${tuning.gearScale}× | ` + [1, 2, 3, 4].map(c => {
  const a = aggregate(groups(gear, tuning, c)); return `${pct(a.completion)} / ${num(a.bossEntryMana)}`;
}).join(' | ') + ' |\n';
md += `
Chapter 3 normal OOM drops from 19% at 1× to 4% at 1.25× to 0% at 1.5×. Chapter 2 drops from 22% to 13% to 6%. Regen items materially improve resource stability while widespread wasteful play remains costly.

## Pressure defects and residual refills

${waiting.rows.length} isolated probes cover reached normal loadouts, every path/build, two seeds and first/ready stages. Each re-entry starts full Health and half Mana. Of ${waiting.rows.filter(r => r.policy === 'idle').length} zero-cast probes, ${waiting.rows.filter(r => r.policy === 'idle' && r.pressureDefect).length} win without deaths; all are **prepared Chapter 4 Huntsman, seed 950000**, repeated over four paths/four builds. This is one loadout family, not 16 independent random successes. No additional zero-cast safe clear was found in the sampled loadouts. The screening flag for effectively zero healing is at most one cast and at most 5% of total party max Health healed, with victory/no deaths; it found no further cases.

The fixed Huntsman witness wins under all **27** settings in 36.3s, casts zero and loses nobody. At the selected setting it refills **415/830 → 830/830**. This is an **encounter-pressure defect at intended prepared gear**, documented in \`bat-93-pressure-defects.md\` for targeted correction after this Mana choice; it is not justification for lowering global Regen. Encounters remain untouched in BAT-93.

Active conservation re-entry probes gain more than 1 Mana in ` + [1, 2, 3, 4].map(c => {
  const rows = waiting.rows.filter(r => r.chapter === c && r.policy === 'conservative' && r.won && !r.pressureDefect);
  return `Ch ${c}: ${rows.filter(r => r.netManaCost < -1).length}/${rows.length}`;
}).join('; ') + `. These require healer casts, so are not zero-heal defects by the narrow flag. Late resource surplus is still visible and must not be presented as full no-farming acceptance. No artificial net-gain cap was introduced. Between fights/while paused there is no passive Regen.

## Implementation and validation

Only CONFIG recovery/base Regen and the 18 authored item Regen values change for balance. Regression hashes confirm fixed BAT-91 encounter HP/damage/timing/mechanics, spells, Shaman talents and all non-Regen item fields. Max Mana and spell costs remain unchanged. No Priest/Druid balancing or Chapters 5–8 work.

The map uses the reconciled persisted ChapterRuns resource state. Current/max Mana sits left of the legend on desktop and wraps above it on mobile. Unstarted previews hide it; actual completed runs retain their saved value. Reload, healer/gear reconciliation, victory, arbitrary persisted changes, restart and hard reset are covered.

**252/252 tests pass; git diff --check passes.** Browser QA at the selected setting verifies fresh 600/600, 420.4/780 displayed as 420/780 and retained on reload, real 44.6s Shaman victory with 333.061 combat-exit Mana + exactly 156 recovery = 489.061 persisted (489/780 on map), restart 780/780 and hard reset 600/600. Desktop placement is left/same row. Mobile 390×844 wraps cleanly with no horizontal overflow; console has no warnings/errors. QA uses isolated bat93.localhost storage and ignored test controls; user saves are preserved. Captures: \`.tmp/bat93-map.png\`, \`.tmp/bat93-mobile.png\`.

Earlier test adjustments remain: configured Regen replaces obsolete literal Regen expectations, the historical Priest triage fixture keeps 2/sec, and the long-capacity gear band is <2.1 because approved item scaling gives Chapter 1 a discrete ratio of 2.045. No pressure/cost assertion was removed.

## Reproduction and checkpoint

\`\`\`powershell
node scripts/mana-economy.mjs screen 2 docs/bat-93-conserve-screen.json
$env:CANDIDATES='[{"recovery":0.1,"baseRegen":3,"gearScale":1.5},{"recovery":0.2,"baseRegen":2.5,"gearScale":1.5},{"recovery":0.2,"baseRegen":3,"gearScale":1.25},{"recovery":0.2,"baseRegen":3,"gearScale":1.5}]'
node scripts/mana-economy.mjs final 8 docs/bat-93-conserve-final.json
Remove-Item Env:CANDIDATES
node scripts/mana-economy.mjs gear 8 docs/bat-93-gear.json
node scripts/mana-waiting.mjs docs/bat-93-waiting.json 2
node scripts/mana-economy-report.mjs
npm.cmd test
git diff --check
\`\`\`

Clear POLICIES/TUNING environment overrides if present. All work remains local on dev. Recommend a checkpoint commit for the tested BAT-91/BAT-93 work and evidence before targeted pressure corrections. A stable dev → main PR should follow resolution or explicit acceptance of the documented pacing limitations. No commit/push was authorized or performed.
`;
writeFileSync('docs/bat-93-mana-economy.md', md);

const witness = waiting.rows.find(r => r.chapter === 4 && r.stage === 'ready' && r.build === '7-earth' && r.pressureDefect);
let defect = `# BAT-93 encounter-pressure follow-up

## Chapter 4 Huntsman — passive safe clear at intended prepared gear

**Targeted correction needed after the Mana-economy choice. No encounter was retuned in BAT-93.** Ready/current-chapter preparation is not overgearing. Reproduced across all 27 approved Mana settings; base Regen is not the cause of winning without healing.

Reproduce: \`node scripts/mana-waiting.mjs docs/bat-93-waiting.json 2\`. Inspect idle rows for chapter 4, encounter huntsman, seed 950000, ready. The same opening is shared by all four paths and all four chapter builds. Other sampled zero-cast encounters do not clear safely.

Witness: ${witness.seconds.toFixed(3)} seconds, ${witness.casts} casts, ${witness.deaths} deaths, ${num(witness.manaSpent)} Mana spent. Selected 20% / 3 / 1.5×: ${num(witness.entryMana)}/${num(witness.maxMana)} entry → ${num(witness.exitMana)} combat exit → ${num(witness.endingMana)} persisted. Party auto-attacks end combat naturally; no timer/damage manipulation. Starting full Health is a legal intended state.

| Member | Max Health | Damage | Armor | Resistance | Equipped IDs |
|---|---:|---:|---:|---:|---|
`;
for (const p of witness.entryParty) defect += `| ${p.id} | ${p.maxHp} | ${p.damage || 0} | ${p.armor || 0} | ${p.resistance || 0} | ${Object.values(witness.equipped[p.id] || {}).join(', ') || 'none'} |\n`;
defect += `
Full entry stats, exit Health, item IDs and all witness configurations are preserved in bat-93-waiting.json. The follow-up should restore a requirement to heal at this progression band without broadly flattening Mana Regen or changing other encounters to fit this witness. Active-healing Mana-positive fights are listed separately in the Mana report and need pacing review; no additional effectively zero-heal clear met the documented screening flag.
`;
writeFileSync('docs/bat-93-pressure-defects.md', defect);
console.log('Wrote BAT-93 balance report and pressure-defect follow-up.');
