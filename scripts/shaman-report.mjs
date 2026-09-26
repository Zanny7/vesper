// Regenerate the complete BAT-87 handoff from reproducible simulation evidence.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TALENT_TREES } from '../src/talent-trees.js';
import { verifyManifest } from './shaman-evidence-manifest.mjs';
const manifest = verifyManifest();
const root = new URL('../docs/', import.meta.url);
const read = name => {
  const text = readFileSync(new URL(`bat-87-${name}.jsonl`, root), 'utf8').trim();
  if (!text) throw new Error(`Empty evidence: ${name}`);
  return text.split(/\r?\n/).map(JSON.parse);
};
const before = read('before-controlled'), after = read('after-controlled');
const beforeRoutes = read('before-routes'), afterRoutes = read('after-routes');
const closeBefore = read('close-before-controlled'), close = read('close-controlled');
const routesBefore = read('close-before-routes'), routesAfter = read('close-routes');
const alternativesBefore = read('close-before-alternatives'), alternatives = read('close-alternatives');
const capstones = read('capstones-controlled'), marginal = read('talent-marginals'), niches = read('niches-controlled');
const interactions = read('interactions');
const groupRanks = read('group-rank-marginals');
const n = (value, places = 1) => value == null ? '—' : Number(value).toFixed(places);
const pct = value => `${n(value * 100)}%`, fence = String.fromCharCode(96).repeat(3);
const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(row => `| ${row.join(' | ')} |`).join('\n')}`;
const lookup = (rows, row) => {
  const result = rows.find(candidate => ['chapter', 'healer', 'build', 'profile', 'stage', 'skill'].every(key => candidate[key] === row[key]));
  if (!result) throw new Error(`Missing paired result: ${row.healer}/${row.build}/${row.profile ?? row.stage}`);
  return result;
};
const paired = (rows, originals, fields) => rows.map(row => {
  const original = lookup(originals, row);
  return [row.healer, row.build, row.profile ?? `${row.chapter}/${row.stage}`, ...fields.map(([key, format]) => `${format(original[key])} → ${format(row[key])}`)];
});
const core = row => ['7-fourfold', '7-blooming', '7-earth'].includes(row.build);
const ablations = marginal.filter(row => row.mode === 'ablation');
const range = values => `${n(Math.min(...values), 2)} to ${n(Math.max(...values), 2)}`;
const talents = [...new Set(ablations.filter(r => r.healer === 'shaman').map(r => r.talent))];
const talentRows = talents.map(talent => {
  const rows = ablations.filter(r => r.healer === 'shaman' && r.talent === talent);
  return [talent, rows.length, range(rows.map(r => r.with.hpm - r.without.hpm)), range(rows.map(r => 100 * (r.with.survival - r.without.survival)))];
});
const rowComparison = ['priest', 'druid', 'shaman'].flatMap(healer => [1, 2, 3, 4].map(row => {
  const ids = TALENT_TREES[healer].filter(t => t.row === row).map(t => t.id);
  const cases = ablations.filter(r => r.healer === healer && ids.includes(r.talent));
  return [healer, row, cases.length, range(cases.map(r => r.with.hpm - r.without.hpm)), range(cases.map(r => 100 * (r.with.survival - r.without.survival)))];
}));
const progression = ['priest', 'druid', 'shaman'].flatMap(healer => [1, 2, 3, 4].flatMap(chapter => {
  const rows = after.filter(r => r.healer === healer && r.chapter === chapter && r.profile === 'long');
  return [...new Set(rows.map(r => r.points))].map(points => {
    const matches = rows.filter(r => r.points === points);
    return [healer, chapter, points, matches.length, range(matches.map(r => r.hpm)), range(matches.map(r => r.remainingMana))];
  });
}));
const interaction = (name, filter = () => true) => interactions.find(r => r.interaction === name && filter(r));
const clipped = interaction('Echo effective input'), double = interaction('Double Current + Waves'), overlap = interaction('Stream + Tide + Chain overlap');
const earthBank = (spell, empowered = false) => interaction('Earthliving contribution', r => r.spell === spell && r.empowered === empowered).banks.find(b => b.healing.length).healing;
const routeFields = [['routeCompletion', pct], ['fullCompletion', pct]];
const source = `# BAT-87 Shaman simulation and numerical tuning

The numerical pass is implemented on **dev**. Acceptance is reviewed against the final comparisons below. Completing a simulation does not itself prove that every balance criterion passes. Earthliving retains its 6s/3-tick Wave contribution, 2s/1-tick contribution per Chain target, 18s cap and existing tick timing. Its newly added ticks heal at 50% strength; paid Surge remains full strength.

**BAT-86 design exception:** full-strength Earthliving continued to lead tank, group and route comparisons after other capstone buffs and policy corrections. Increasing Wave's cost penalized all capstones. The user was asked about tuning only Earthliving-created tick strength and replied “Can you continue?”; work continued with that proposed exception. This changes the explicit full-strength rule, not the duration or bank mechanics. The original comparison restores full strength.

## Every production numerical change

Before means the committed BAT-86 values, restored in immutable loadouts. The earlier uncommitted checkpoint used Wave 32 Mana, Echoing Surge 50%, Tide 18/8s/60 Mana and Ancestral 60%; those are superseded below.

| Configured value | Before | Final | Reason |
| --- | ---: | ---: | --- |
| Recurring Surge healing/tick | 44 | 36 | Correct the no-talent Chapter 1 passive-healing outlier |
| Healing Wave direct healing | 110 | 125 | Retain active tank recovery after reducing Surge |
| Healing Wave Mana | 28 | 32 | Retain competitive paid filler while limiting its baseline efficiency |
| Riptide Mana | 32 | 36 | Reduce cheap instant/periodic layering |
| Echoing Surge effective ratio | 50% | 30% | Limit the strong Earthliving/secondary-healing combination |
| Earthliving-created tick strength | 100% | 50% | Tune free banks independently of paid Surge and alternative capstones |
| High Tide jump loss, rank 1 / 2 | 17.5% / 15% | 12.5% / 5% | Give the smart group-heal specialization meaningful marginal healing |
| Healing Tide healing/ally/tick | 14 | 36 | Make party recovery meaningful |
| Healing Tide duration | 8s | 12s | Recover across successive group hits |
| Healing Tide Mana | 80 | 50 | Make useful cooldown ticks competitive with paid fillers |
| Ancestral Echo effective ratio | 40% | 100% | Reward useful split-target Wave casts; primary overheal still yields zero |

Tuning is centralized in src/data.js and drives loadouts and tooltips. Surge's paid base budget changes 132 → 108 (raw HPM 5.5 → 4.5). Wave changes 3.93 → 3.91 direct HPM and 44 → 50 uninterrupted base HPS. Maintaining paid Surge takes 25% of cast time: 37.5 + 18 = 55.5 base HPS before other spells/talents, versus 55 originally. Earthliving's continuous unempowered ceiling is 50 + 9 = 59 HPS, with the finite bank and overheal limiting realization. Its grant is not three immediate heals per Wave. Tide's theoretical five-ally budget changes 560 → 2160; only 12s of each 60s cooldown are active. Useful source healing, overheal and survival—not that raw ceiling—determine measured value.

The baseline change is justified by the no-talent/early-chapter outlier, which talents cannot correct. The smaller effective Surge echo and reduced Earthliving ticks address sustained layering. Buffing cooldown/secondary-target talents before broadly strengthening baseline healing preserves healer identities. Exploratory cheaper Surge/stronger Wave candidates recreated the early advantage; large baseline reductions instead weakened alternative late builds. Wave 36 Mana with full-strength Earthliving still favored that capstone; 32/34 Mana and 40/50/65% Earthliving candidates exposed the tradeoff. Final evidence contains no exploratory overrides.

## Method and reproduction

Run from the repository root (Node 20.11+):

${fence}powershell
node scripts/shaman-evidence.mjs
node scripts/shaman-report.mjs
npm.cmd test
${fence}

The evidence command clears simulator filters/overrides and runs **${manifest.matrixSamples} matrix seeds and ${manifest.closeSamples} close-comparison seeds**. Optional positional counts permit smaller development runs. Outputs are UTF-8 JSONL, replaced after successful nonempty generation. A SHA-256 [manifest](bat-87-evidence-manifest.json) records the runtime, source snapshot and evidence files; generation rejects changes to simulation sources during the run, and the report rejects stale or edited evidence. The report also fails on missing pairs. Original loadouts restore all changed values, including Tide duration, both echoes and Earthliving tick strength, without mutating production.

Real Combat runs at the live fixed 1/60s step with seeded randomness. Controlled parties have identical pre-talent stats sampled from actual Priest equipment at three chapter clears, including recursively inherited earlier gear. Only healer identity/spellbook changes. These fixtures never grant permanent gear. Real routes use each healer's actual BAT-88 loot, earlier normal/hidden boss rewards, shared greedy equipment scoring, live approach drops and live maximum-stat resource adjustments. Earlier gear assumes earlier victories; this is not a campaign win-rate estimate. Identical class seed labels need not produce identical loot draw positions.

Seven profiles cover focused tank, two-target random split, three-target random split, frequent party AoE, attrition, burst and long efficiency. Split/three hit distinct random allies every 6s. Most measure 90s; long measures 140s before 150s enrage. Controlled enemy HP is unlimited, so completion is zero by construction. Survival requires all five alive at the horizon. Defeat ends measurement early, which can bias observed HPS; survival, Mana and depletion accompany it.

All 0/1/3/5/7/8-point builds obey rank caps and 2/4/6 gates. Seven-point capstones are legal. Point eight is earned after the Chapter 4 boss, so eight-point results are post-boss evidence. Ablations remove a rank only when the remainder is legal. Isolated mechanic probes use explicitly diagnostic allocations, not progression claims.

Priest/Druid retain the existing BAT-82 healing policy and cooldowns. Shaman uses the same 0.12/0.2/0.3s veryGood/average/weak cadence. Policy corrections use Tide on useful two-target/tank pressure, avoid paying again for healing queued by Tide, choose useful Ancestral primaries before Riptide removes the wound, avoid clipping Flowing cash-outs, and avoid buying Surge when its raw efficiency is worse than Wave. These are reproducible heuristics, not optimal human play. No offensive Atonement policy or artificial instant global cooldown is modeled.

First/one/ready stages mean zero/one/readiness farming clears. Ready uses 2 veryGood, 3 average and 4–5 weak clears, as in the existing model. Compare classes within each skill/stage; cross-skill comparisons also change gear. A fresh approach starts with the previous point count, then earns the chapter point. Exact Health/Mana carry; only live maximum-stat gear adjustments apply. Buffs/cooldowns reset as in Combat. Boss entry receives no refill; recorded entry Mana includes the live gear adjustment.

HPS = total effective healing / observed time; HPM = effective healing / actual Mana debits, including instant casts/channels. Regeneration is not subtracted from spending. Depletion means first below 30 Mana, not literal zero. JSONL retains overheal, raw/effective source healing, Mana, deaths, casts/cooldown uses, empowered/Waves casts, bank/HoT coverage, Totem uptime/overlap, movement and per-route/per-encounter outcomes. Smart Totem ticks with no injured destination emit no raw heal.

Controlled seeds: 87000 + chapter*10000 + index (combat +999). Route seeds: 187000 + chapter*100000 + index. Close runs extend the matrix seed schedule. Before/after use the same final policy and seed schedule to isolate numerical changes. At 300 samples, a single survival/completion estimate has at most about ±5.7 percentage points of 95% sampling uncertainty (normal approximation); at 30 it is about ±18 points. Small differences are not evidence of superiority. Seed pairing alone does not establish an optimal policy or remove systematic model bias.

## Controlled comparisons

No-talent Chapter 1, equivalent stats, ${manifest.matrixSamples} paired seeds, before → final. This isolates the baseline justification from talent power:

${table(['Healer', 'Build', 'Profile', 'Survival', 'HPS', 'HPM'], paired(after.filter(r => r.chapter === 1 && r.build === '0-base' && ['focused', 'burst', 'long'].includes(r.profile)), before, [['survival', pct], ['hps', n], ['hpm', value => n(value, 2)]]))}

Equivalent-stat core builds, Chapter 4, scale 1.6, ${manifest.matrixSamples} seeds. Sources: [before matrix](bat-87-before-controlled.jsonl), [final matrix](bat-87-after-controlled.jsonl).

${table(['Healer/build', 'Profile', 'Survival', 'Effective', 'Overheal', 'HPS', 'HPM', 'End Mana', 'Low-Mana time'], after.filter(r => r.chapter === 4 && core(r)).map(r => [`${r.healer}/${r.build}`, r.profile, pct(r.survival), n(r.effective, 0), n(r.overheal, 0), n(r.hps), n(r.hpm, 2), n(r.remainingMana), n(r.depletionTime)]))}

Hard burst/long, scale 2, **${manifest.closeSamples} paired seeds**, before → final. Includes capstones with/without Echoing Surge and the Momentum-focused Ancestral alternative:

${table(['Healer', 'Build', 'Profile', 'Survival', 'HPS', 'HPM'], paired(close.filter(r => r.points === 7), closeBefore, [['survival', pct], ['hps', n], ['hpm', value => n(value, 2)]]))}

Eight-point post-boss comparisons at the same hard pressure, ${manifest.closeSamples} seeds:

${table(['Healer', 'Build', 'Profile', 'Survival', 'HPS', 'HPM', 'End Mana'], [...capstones, ...close.filter(r => r.points === 8)].map(r => [r.healer, r.build, r.profile, pct(r.survival), n(r.hps), n(r.hpm, 2), n(r.remainingMana)]))}

Hard distributed niches, scale 2.8, **${manifest.closeSamples} seeds**. This is diagnostic pressure, not an encounter retune:

${table(['Healer', 'Build', 'Profile', 'Survival', 'HPS', 'HPM'], niches.map(r => [r.healer, r.build, r.profile, pct(r.survival), n(r.hps), n(r.hpm, 2)]))}

## Progression and talent marginal value

Long-profile results at each chapter's equivalent stats. No-talent rows repeat because gear changes. Ranges span legal alternatives, not confidence intervals. All seven profiles and action distributions remain in the matrix.

${table(['Healer', 'Chapter', 'Points', 'Builds', 'HPM range', 'End Mana range'], progression)}

Legal one-rank ablations, Chapter 4, scale 2, ${manifest.matrixSamples} paired seeds. Negative changes can reflect decisions/nonlinear depletion, not intrinsic negative healing. [Full marginals](bat-87-talent-marginals.jsonl) also measure Priest/Druid at equivalent progression.

${table(['Shaman talent', 'Legal paired cases', 'HPM change range', 'Survival change range (points)'], talentRows)}

Comparable rank-removal ranges by healer/row:

${table(['Healer', 'Row', 'Legal cases', 'HPM change range', 'Survival change range (points)'], rowComparison)}

Supplemental large party bursts at scale 3.2, ${manifest.closeSamples} seeds, legal seven-point group specializations: a party hit every 12s at 75% of the scaled strike, with light tank pressure. This diagnostic supplements the seven standard profiles without changing live encounters. [Group rank evidence](bat-87-group-rank-marginals.jsonl) avoids interpreting negligible Chain usage in mild profiles as a talent defect:

${table(['Build', 'Removed rank', 'Chain casts with rank', 'HPM with → without', 'Survival with → without'], groupRanks.filter(r => r.mode === 'ablation' && ['high-tide', 'tidal-waves', 'restorative-stream', 'double-current', 'flowing-riptide'].includes(r.talent)).map(r => [r.build, r.talent, n(r.with.casts.chainHeal || 0, 2), `${n(r.with.hpm, 3)} → ${n(r.without.hpm, 3)}`, `${pct(r.with.survival)} → ${pct(r.without.survival)}`]))}

Momentum requires maintained Surge; Deep requires periodic Riptide; High Tide requires useful jumps; echoes require another wounded ally. Zero tank-only echo is expected. Conversely, group-niche success does not establish tank-route parity. Alternative routes below avoid treating only the strongest Shaman capstone as representative.

## Explicit interaction measurements

At 30 SP, zero Haste/Crit unless stated. [Full interaction probes](bat-87-interactions.jsonl):

- Tidal Reserves with gear-inclusive base regeneration 3 recovers ${[0, 1, 2].map(rank => n(interaction('Tidal Reserves', r => r.rank === rank).recoveredMana, 0)).join('/')} Mana over 60s at ranks 0/1/2; the matrix measures realized depletion/sustainability.
- High Tide ranks 0/1/2 emit ${[0, 1, 2].map(rank => n(interaction('High Tide', r => r.rank === rank).effective, 3)).join('/')} Chain healing for 65 Mana, with unchanged first-target base healing; the same 30 total SP is spread across the larger Chain. Stream emits ${[0, 1, 2].map(rank => n(interaction('Restorative Stream', r => r.rank === rank).effective, 1)).join('/')} for 35 Mana; six ticks/12s permit at most 80% uptime over its 15s cooldown.
- Maintained Surge + Momentum gives ${[0, 1, 2].map(rank => n(interaction('Maintained Surge + Momentum', r => r.rank === rank).directWave.effective)).join('/')} direct Wave healing. Double Current + Waves gives two ${n(double.durations[0])}s Waves, ${n(double.wave.effective, 0)} direct healing, and consumes both stored pairs. Two Riptides replace Waves with two stacks, not four.
- Deep rank 2 + Flowing releases exactly ${n(interaction('Deep + Flowing cash-out', r => r.deepRank === 2).pendingBefore, 3)} old periodic healing after 6s. Movement preserves the same effect, next tick and expiry, moving ${n(interaction('Flowing movement', r => r.deepRank === 2).remainingBudget, 3)} remaining healing without duplication.
- Clipped Surge emits ${n(clipped.surge.raw, 0)} raw but only ${n(clipped.surge.effective, 0)} effective healing, producing ${n(clipped.echo.effective, 0)} echo; subsequent overheal produces none. Earthliving installs [${earthBank('healingWave').map(v => n(v, 2)).join(',')}] after Wave and [${earthBank('chainHeal').map(v => n(v, 2)).join(',')}] per Chain target. Empowered new ticks are ${n(earthBank('healingWave', true)[0], 2)}; old budgets remain unchanged and clip at the 18s cap. Paid Surge appended before or after these ticks retains its full budget.
- Normal/empowered Ancestral Wave gives ${[false, true].map(empowered => { const r = interaction('Ancestral Echo', row => row.empowered === empowered); return `${n(r.wave.effective)} primary + ${n(r.echo.effective)} echo`; }).join(' / ')}. Echo excludes the primary and cannot Crit or recurse; no injured secondary means zero value.
- Tide/Stream/Chain overlap emits ${n(overlap.tide.effective)}/${n(overlap.stream.effective)}/${n(overlap.chain.effective, 3)} useful healing for ${n(overlap.mana, 0)} Mana, with ${overlap.tide.events} party Tide events and ${overlap.stream.events} Stream events. All use shared SP scaling. These wounded probes are ceilings; real profiles measure clipped/unused ticks, overheal and pending-heal overlap.

## Persistent routes

Ready/veryGood, actual Chapters 1–4, ${manifest.matrixSamples} paired seeds. Approach completion means reaching the boss; full completion includes winning it. No refill:

${table(['Healer', 'Build', 'Chapter/stage', 'Route before → final', 'Full before → final'], paired(afterRoutes.filter(r => r.skill === 'veryGood' && r.stage === 'ready'), beforeRoutes, routeFields))}

Chapter 1/4 close results, **${manifest.closeSamples} paired seeds**, including the fresh-run red flag:

${table(['Healer', 'Build', 'Chapter/stage', 'Route before → final', 'Full before → final'], paired(routesAfter, routesBefore, routeFields))}

Chapter 4 alternative seven-point builds, ready/veryGood, **${manifest.closeSamples} paired seeds**, actual class loot. Within-class equipment seeds are identical; Priest/Druid alternatives are measured too:

${table(['Healer', 'Build', 'Chapter/stage', 'Route before → final', 'Full before → final'], paired(alternatives, alternativesBefore, routeFields))}

Final mean boss-entry Mana ranges ${n(Math.min(...routesAfter.filter(r => r.bossEntryMana != null).map(r => r.bossEntryMana)))}–${n(Math.max(...routesAfter.filter(r => r.bossEntryMana != null).map(r => r.bossEntryMana)))} across these cohorts. Low entries/fresh failures do not authorize retuning enemies. Chapter 2–3 and average/weak policies remain in [before routes](bat-87-before-routes.jsonl) and [final routes](bat-87-after-routes.jsonl). Weak ready samples have more farming; this does not show weaker play outperforming stronger play at equal gear.

## Limits and acceptance review

Priest retains direct response/strong burst; Druid retains prepared multi-HoT recovery; Shaman retains banked sustain, smart Chain/Stream, Tide recovery and effective split echoes. Specialization is expected. The evidence must still support competitive alternatives rather than hiding systematic deficits behind one Earthliving build.

Actual Shaman gear removes placeholder-gear uncertainty. Greedy allocation, assumed prior victories, alternate/human policies, burst timing, rare Haste/Crit gear and campaign farming remain limitations. Results describe this snapshot; low-pressure survival and raw ceilings do not prove universal balance. No permanent gear, encounter, Priest or Druid numerical changes were made.

**Acceptance: pass for this implemented balance scope, subject to the stated policy/sampling limits and the documented Earthliving design exception.** Exact win-rate parity and universally optimal builds are not claimed.

- Baseline: the Chapter 1 fresh-route approach outlier falls from 62.7% to 7.3%, versus Priest 8.3% and Druid 1.3%. Ready Shaman completes 25.0% of full routes versus 16.3%/16.7%; that early sustain strength does not extend to dominance across later chapters. Fresh boss wins remain zero for every class.
- Comparable healing: standard Chapter 4 core builds survive all seven profiles; hard long survival for Earth/Echo is 54.3%, between Priest 36.7% and Druid 66.0%. Shaman retains a hard-burst weakness: Earth/Echo survives 52.7% versus 74.7%/67.0%, with 66.7 HPS versus 71.7/68.7. This gap is recorded, not hidden by averaging it into easier profiles. Other standard profiles and actual routes do not show a broad class deficit.
- Capstones: ready Chapter 4 Earth/Echo reaches the boss in 52.7% and completes 16.7% of routes; Ancestral/Echo reaches it in 37.0% but completes 26.7%; Tide/Echo reaches it in 40.0% and completes 7.3%. Ancestral without Echo still completes 14.7%, so Echo is not required for a competitive route build. Tank-oriented routing does not represent Tide's group niche: its hard three-target survival is 99.0%, versus Earth/Echo 96.3%; standard AoE Tide HPM exceeds Earth. Earth wins the steady AoE survival niche, Ancestral the split niche. No capstone wins every measure/profile.
- Rows: Reserves/Deep/Momentum reward sustain/periodic/direct choices; Waves/High Tide/Stream reward timing/large group wounds/smart passive recovery; Flowing/Echo/Double reward retained periodic budget/secondary effective healing/burst windows. High Tide's old weak marginal prompted the final numerical buff; the supplemental paired second-rank result adds 0.119 HPM and 3.95 effective Chain HPS. All ranks retain useful mechanics and no row is numerically required across all niches.
- Mana/timing limitations: faster Waves and Flowing can lower measured sustained HPM or survival when this aggressive policy spends faster or cashes out into changing wounds. Faster casting has no intrinsic Mana surcharge, and the interaction probes verify its timing advantage. Negative heuristic ablations are reported; they do not justify weakening the talent simply to slow this policy. Human timing remains an uncertainty.
- Progression and scaling: legal 1/3/5/7/8-point alternatives, capstone combinations, source budgets and paid/generated banks are measured. Finite banks, cooldowns, effective-only echoes and resource costs retain limits on passive/direct layering. Chain's stronger specialized jumps preserve base first-target healing and its 65 Mana cost. No live encounter, Priest/Druid, gear or progression changes were used to obtain parity.

The automated evidence supports a tested numerical checkpoint. Further player feedback can refine burst timing and specialized allocation; no unresolved implementation defect or required gear integration blocks this issue.

## Validation and checkpoint

**226/226 automated tests pass**, covering legal builds, equal stats, exact instant Mana debits, complete immutable original restoration, deterministic combat/routes, exact resource carry, two-target Tide/queued healing, useful Ancestral targeting and nonempty CLI filter behavior. Existing tests retain bank caps, cancellation, charge replacement, death/pause, effective echoes, SP/Crit and independent Totem behavior. Combat adds a multiplier only to newly generated Earthliving ticks after shared SP/Unleash calculation. Mixed paid/generated banks are tested in both insertion orders; old budgets are never rescaled.

Browser: started npm start on port 5173 and inspected the production Team page in a fresh tab. Verified Surge 36/tick, Wave 125/32 Mana, Riptide 36 Mana, Echoing Surge 30%, Earthliving 50%/3 and 1 ticks/18s cap, High Tide jump loss 12.5%/5%, Tide 36/1s/12s/50 Mana and Ancestral 100%. No warning/error console entries. This verifies displayed configuration, not manual full-route/capstone wins. git diff --check passes. Recommend committing/pushing this coherent checkpoint after user authorization; no commit/push/merge is assumed. Keep dev→main contingent on acceptance review.
`;
writeFileSync(new URL('bat-87-shaman-balance.md', root), source);
console.log(fileURLToPath(new URL('bat-87-shaman-balance.md', root)));
