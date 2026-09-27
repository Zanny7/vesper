// node scripts/shaman-revalidation-report.mjs — regenerate concise BAT-89 report.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(path,'utf8').replace(/^\uFEFF/,'');
const manifest = JSON.parse(read('docs/bat-89-evidence-manifest.json'));
for (const [name,job] of Object.entries(manifest.jobs)) {
  const hash = createHash('sha256').update(readFileSync(job.output)).digest('hex');
  if (hash!==job.sha256) throw new Error(`Changed evidence: ${name}`);
  for (const [path,expected] of Object.entries(job.sources)) {
    if (createHash('sha256').update(readFileSync(path)).digest('hex')!==expected) throw new Error(`Stale source: ${name}/${path}`);
  }
}
const rows = name => read(`docs/bat-89-${name}.jsonl`).trim().split('\n').map(JSON.parse);
const packages=rows('packages'), early=rows('earlyRoutes'), routes=rows('routes'), refs=rows('reference');
const late=[...rows('focused'),...rows('niches'),...rows('stress')], standard=rows('builds'), close=rows('closeRoutes'), unleash=rows('unleash');
const find=(data,fields)=>data.find(row=>Object.entries(fields).every(([key,value])=>row[key]===value))
  || (()=>{throw new Error(`Missing row ${JSON.stringify(fields)}`)})();
const pc=x=>`${(x*100).toFixed(1)}%`, n=x=>x==null?'—':Number(x).toFixed(2), label=x=>x.replace(/-echo$/,'-cascade');
const survival=row=>`${pc(row.survival)} / ${n(row.hpm)}`;
const table=(heads,body)=>[heads.join(' | '),heads.map(()=>'---').join(' | '),...body.map(r=>r.join(' | '))].map(s=>`| ${s} |`).join('\n');
const caps=['7-earth-echo','7-tide-echo','7-ancestral-echo'];
const earlyTable=table(['Healer / policy','Fresh approach / full route','Ready approach / full route'],[
  ...['before','policy','adaptive'].map(scenario=>{
    const base={scenario,build:'1-reserves',skill:'veryGood'};
    const f=find(early,{...base,stage:'first'}),r=find(early,{...base,stage:'ready'});
    return [`Shaman / ${scenario}`,`${pc(f.routeCompletion)} / ${pc(f.fullCompletion)}`,`${pc(r.routeCompletion)} / ${pc(r.fullCompletion)}`];
  }),
  ...['priest','druid'].flatMap(healer=>{
    const build=healer==='priest'?'1-binding':'1-rejuvenation';
    const f=find(early,{scenario:'adaptive',healer,build,skill:'veryGood',stage:'first'}),r=find(early,{scenario:'adaptive',healer,build,skill:'veryGood',stage:'ready'});
    return [[`${healer} / historical`,`${pc(f.routeCompletion)} / ${pc(f.fullCompletion)}`,`${pc(r.routeCompletion)} / ${pc(r.fullCompletion)}`],
      ...(healer==='priest'?['1-binding','1-mercy']:['1-rejuvenation','1-touch']).map(build=>{
        const sf=find(refs,{healer,build,skill:'veryGood',stage:'first'}),sr=find(refs,{healer,build,skill:'veryGood',stage:'ready'});
        return [`${healer} / ${build} sensitivity`,`${pc(sf.routeCompletion)} / ${pc(sf.fullCompletion)}`,`${pc(sr.routeCompletion)} / ${pc(sr.fullCompletion)}`];
      })];
  })]);
const physicsKeys=['completion','survival','effective','rawHealing','overheal','manaSpent','remainingMana','deaths','routeCompletion','fullCompletion','casts','encounters'];
for(const current of early.filter(r=>r.healer==='shaman'&&r.scenario==='adaptive')) {
  const previous=find(early,{scenario:'policy',healer:'shaman',build:current.build,skill:current.skill,stage:current.stage});
  for(const key of physicsKeys) if(JSON.stringify(current[key])!==JSON.stringify(previous[key])) throw new Error(`Early baseline regression: ${current.build}/${key}`);
}
for(const current of rows('early').filter(r=>r.healer==='shaman'&&r.scenario==='adaptive')) {
  const previous=find(rows('early'),{scenario:'policy',healer:'shaman',build:current.build,profile:current.profile});
  for(const key of physicsKeys) if(JSON.stringify(current[key])!==JSON.stringify(previous[key])) throw new Error(`Early controlled regression: ${current.build}/${key}`);
}
const profiles=table(['Build','Focused ×2.8','Split ×2.8','Three ×2.8','AoE ×2.8','Burst ×2','Long ×2'],[
  ['priest','7-fourfold'],['druid','7-blooming'],...caps.map(b=>['shaman',b])
].map(([healer,build])=>[label(build),...['focused','split','three','aoe','burst','long'].map(profile=>survival(find(late,{scenario:'adaptive',healer,build,profile})))]));
const before=table(['Build / profile','BAT-87 / legacy','BAT-87 / refined','Current / refined'],caps.flatMap(build=>['burst','long'].map(profile=>[
  `${label(build)} / ${profile}`,...['before','policy','adaptive'].map(scenario=>survival(find(late,{scenario,build,profile})))
])));
const ready=table(['Chapter / build','Reach boss','Complete route','Boss entry Mana','Effective HPM'],[
  ...[1,2,3].flatMap(chapter=>['priest','druid','shaman'].map(healer=>find(routes,{scenario:'adaptive',chapter,healer,skill:'veryGood',stage:'ready'}))),
  ...close.filter(r=>r.scenario==='adaptive'&&r.skill==='veryGood'&&r.stage==='ready')
].map(r=>[`${r.chapter} / ${label(r.build)}`,pc(r.routeCompletion),pc(r.fullCompletion),n(r.bossEntryMana),n(r.hpm)]));
const alternatives=table(['Eight-point build','Split survival / HPM','AoE survival / HPM','Long survival / HPM'],
  ['8-earth-tide','8-earth-ancestral','8-ancestral-double'].map(build=>[build,...['split','aoe','long'].map(profile=>survival(find(late,{scenario:'adaptive',build,profile})))]));
const modes=table(['Build / profile','Adaptive','Efficiency','Reserve'],['7-earth-echo','7-ancestral-echo','8-earth-double','8-ancestral-double'].flatMap(build=>['burst','long'].map(profile=>[
  `${label(build)} / ${profile}`,...['adaptive','efficiency','reserve'].map(scenario=>survival(find(unleash,{scenario,build,profile})))
])));
const four=[...rows('earth-four-niches'),...rows('earth-four-stress')];
const durationTable=table(['Earth/Cascade profile','6s survival / HPM','4s survival / HPM'],['focused','split','three','aoe','burst','long'].map(profile=>[
  profile,survival(find(late,{scenario:'adaptive',build:'7-earth-echo',profile})),survival(find(four,{build:'7-earth-echo',profile}))
]));
const routeSix=find(close,{scenario:'adaptive',build:'7-earth-echo'}),routeFour=find(rows('earth-four-routes'),{build:'7-earth-echo'});
const capstoneTable=table(['AoE scale','Shared core: survival / HPM','Earth','Tide','Ancestral'],[1.6,2.8].map(scale=>[
  scale,...['unspent','earthliving','tide','ancestral'].map(capstone=>survival(find(rows('capstones'),{profile:'aoe',scale,capstone})))
]));
const ancestral=version=>find(packages,{probe:'ancestral',version,empowered:false,wound:300});
const tide=(version,continuation)=>find(packages,{probe:'tide-recovery',version,continuation});
const group=rank=>find(packages,{probe:'chain',version:'current',power:0,count:5,wound:300,rank});
const body=`# BAT-89 — Shaman mechanics and balance revalidation

Implemented on dev from c33440f. The preliminary [audit](bat-89-audit.md), its raw probes and the BAT-87 evidence remain historical checkpoints. No encounter, loot, Priest or Druid production tuning changed.

## Selected values

| Mechanic | BAT-87 | BAT-89 |
| --- | --- | --- |
| Earthliving Wave | 6s, hidden half-strength Surge | 6s normal-strength Surge |
| Earthliving Chain | 2s half-strength on every hit | 2s normal-strength on at most two lowest post-heal HP% injured actual recipients |
| Row-three talent | Echoing Surge, 30% effective tick echo | Cascading Stream: once on summon, 50% baseline Chain curve, up to three distinct wounded living allies |
| Healing Tide | 36/ally/second ×12s; 50 Mana | 10/ally/second ×12s; 60 Mana; instant, passive, 60s cooldown |
| Ancestral Echo | 100% primary effective Wave | 50%; other wounded ally; no extra Crit/recursion |
| Chain / High Tide decay | 20% / 12.5% / 5% | unchanged |

Surge remains 36 base healing/2s, Wave 125/32 Mana, Riptide 36 Mana and Chain 105/65 Mana. Generated and paid Surge share one bank, 18s cap, scheduled phase and original queued strengths. Saved Echoing Surge points migrate to Cascading Stream; existing new identifiers take precedence. Cascade ignores High Tide, Unleash, Waves and Earthliving and retains decimals and normal baseline Chain SP scaling.

## Reproduction and interpretation

\`\`\`powershell
node scripts/shaman-revalidation-evidence.mjs
node scripts/shaman-revalidation-report.mjs
npm.cmd test
\`\`\`

[Manifest](bat-89-evidence-manifest.json) records allocations, commands, seeds, source/output hashes and samples. Core evidence: [progression](bat-89-progression.jsonl), [all 7/8-point builds](bat-89-builds.jsonl), [Chapters 1–4 routes](bat-89-routes.jsonl), [early routes](bat-89-earlyRoutes.jsonl), [focused](bat-89-focused.jsonl), [niches](bat-89-niches.jsonl), [stress](bat-89-stress.jsonl), [close routes](bat-89-closeRoutes.jsonl), [Unleash modes](bat-89-unleash.jsonl), [packages](bat-89-packages.jsonl).

Real fixed-step Combat (1/60s); controlled parties share identical real-loot-derived pre-talent stats. All five must live through 90s (long: 140s), with infinite enemy Health. This measures sustainable pressure, not normal encounter wins. Routes use actual class loot and live Health/Mana carry, including live maximum-stat gear adjustments; no boss refill. Fresh enters before earning the chapter's first point. Ready farming: 2 veryGood, 3 average, 4–5 weak clears. Compare skills within their gear cohort. HPM uses actual Mana debits; HPS alone does not imply success. Raw budgets below use zero SP/Crit/Haste; normal shared scaling still applies.

Thirty seeds cover progression, all builds and routes/all three skill levels. Three hundred seeds cover close early/late routes, hard pressure, capstone alternatives and Unleash modes. The 95% binomial half-width is at most about 5.7 percentage points at 300 seeds; small differences are not strict rankings. Build names ending “echo” retain historical labels: current allocations use Cascade; before allocations reconstruct Echoing Surge. The frozen BAT-87 combat fixture preserves old bank/echo behavior. Before=BAT87/legacy, policy=BAT87/refined, adaptive/efficiency/reserve=current/refined.

## Early progression: mechanics versus policy

Actual Chapter 1 loot, 300 seeds, veryGood:

${earlyTable}

Every current Shaman 0/1-point controlled and first/ready route result equals BAT-87 with the same refined policy: talent revisions create **zero early numerical regression**. The policy gain is large; comparing it only to historical Priest/Druid heuristics misleadingly recreates apparent early dominance. A separate threshold-only reference sensitivity improves reference play without changing game mechanics: [grid](bat-89-reference-grid.jsonl), [300-seed results](bat-89-reference.jsonl). Parameters for both first-point choices were selected on 30 ready seeds (indices 1000–1029), then validated on separate indices 0–299. Fresh/ready and all skill levels are retained. This is a sensitivity check rather than an optimal-play proof. This evidence supports retaining BAT-87 baseline tuning; it does not establish exact healer parity.

## Controlled capstones

Each cell is **all-five survival / effective HPM**, 300 seeds. Different pressure multipliers identify niches; do not compare survival across columns as equal difficulty.

${profiles}

Same-stat before/after burst and long comparisons isolate both policy and mechanics:

${before}

Eight-point alternatives (300 seeds):

${alternatives}

Earthliving earns its focused sustain advantage while direct Wave remains necessary. Ancestral gives useful cleave; Tide improves standard AoE resource efficiency (${n(find(standard,{build:'7-tide-echo',profile:'aoe'}).hpm)} HPM versus Earth/Cascade ${n(find(standard,{build:'7-earth-echo',profile:'aoe'}).hpm)} at ×1.6). Hard-profile outcomes and real routes do not support a universal capstone ranking. Tide is weaker on tank-heavy routes; no compensating encounter changes were made. All tested 7/8-point allocations are legal; their full six-profile/extra group-burst results, spell usage and depletion remain in the JSONL.

Matched capstone ablation, 300 seeds, same legal six-point Cascade core with one unspent point versus each capstone:

${capstoneTable}

[Ablation evidence](bat-89-capstones.jsonl) also retains the three-target comparison. These separate each capstone's contribution from the common core.

## Resource routes

Ready/veryGood, 30 seeds for Chapters 1–3 here; Chapter 1 is expanded above, and Chapter 4 uses 300 seeds. All first/ready and average/weak cohorts are in the route files.

${ready}

Low boss-entry Mana and fresh failures remain real constraints. Healing output after deaths or early termination is not interpreted as greater balance. No permanent gear was granted.

## Whole spell packages and Unleash modes

- Five genuinely wounded baseline Chain targets: ${n(group(0).effective)} healing /65 Mana = ${n(group(0).hpm)} HPM; High Tide ranks 1/2: ${n(group(1).effective)} / ${n(group(2).effective)}. Four meaningful wounds plus a one-Health scratch give ${n(find(packages,{probe:'chain',version:'current',power:0,count:4,wound:150,rank:0}).hpm)} HPM. One useful target is not counted as five.
- Wave into two large wounds: Ancestral package ${n(ancestral('bat87').effective)} → ${n(ancestral('current').effective)} effective for 32 Mana; a ten-Health primary creates only five secondary healing.
- Cascade: 52.5 → 42 → 33.6 at zero SP, ${n(find(packages,{probe:'cascade',version:'current',power:0,count:3}).effective)} total summon recovery; zero wounded allies yields zero. Totem costs 35 Mana once; normal smart ticks are additional.
- Tide alone into five 300-Health wounds: ${n(tide('bat87',false).effective)} → ${n(tide('current',false).effective)} effective. Current Tide plus two Chains: ${n(tide('current',true).effective)} useful / ${n(tide('current',true).manaSpent)} Mana. The large AoE is not solved by Tide alone. Base Tide 600 exceeds rank-two Stream 249.6 (377.7 including Cascade), remains below Tranquility 750, and leaves the Shaman free to cast.
- At 100 SP, two Earthliving Waves into two 700-Health wounds: ${n(find(packages,{probe:'unleash-package',version:'current',capstone:'earthliving',double:false,unleash:false}).hpm)} HPM unempowered; ${n(find(packages,{probe:'unleash-package',version:'current',capstone:'earthliving',double:false,unleash:true}).hpm)} with one empowerment; ${n(find(packages,{probe:'unleash-package',version:'current',capstone:'earthliving',double:true,unleash:true}).hpm)} with Double Current. Decisions include upfront healing/cost, both follow-up costs, faster casts, generated/secondary healing and a shared wound budget.

Unleash modes, 300 seeds, survival / HPM:

${modes}

The priority policy accounts for due Surge/Riptide/Tide ticks, assigns each forecast smart Stream tick once, counts currently meaningful Chain wounds, maintains short useful Surge banks, and uses Ancestral Wave before Riptide removes its cleave wound. It does not ban paid Surge with Earthliving. Efficiency can use Unleash outside danger; reserve holds for visible burst warnings. Generated banks across successive estimated casts are not fully virtualized, and forecasts approximate future adds/shards/debuffs and repeated mechanics. No future random targets or Crit RNG are peeked. These are reproducible heuristics, not exhaustive optimal play.

## Decisions and verification

Tested the approved 4s Earthliving fallback with 300 seeds under identical pressure/gear:

${durationTable}

Actual Chapter 4 ready routes: reach boss ${pc(routeSix.routeCompletion)} → ${pc(routeFour.routeCompletion)}, full route ${pc(routeSix.fullCompletion)} → ${pc(routeFour.fullCompletion)}, effective HPM ${n(routeSix.hpm)} → ${n(routeFour.hpm)}. [4s niches](bat-89-earth-four-niches.jsonl), [stress](bat-89-earth-four-stress.jsonl), [routes](bat-89-earth-four-routes.jsonl).

**Retained 6s.** Four seconds preserves focused controlled survival and curbs burst/long sustain, but severely degrades the real-loot resource route. Six seconds gives a legitimate tank/burst advantage and remains weaker than Priest/Druid under heavy AoE; Ancestral/Cascade also has competitive actual-route completion. Standard AoE Tide offers better resource efficiency. This does not support sacrificing the intended sustained-healing niche merely to flatten one controlled profile. The report retains the strong 6s results explicitly for review.

Accepted 50% Cascade/Ancestral and 10/12s/60-Mana Tide. Retained 20% Chain decay: Shaman group results do not show material overpowering, and further decay would damage the four-target efficiency niche. The conditional 25%/30% decay experiments were not needed. The preliminary half-strength Echo/Tide numerical explorations are superseded by the repaired specification. Reference threshold changes are sensitivity probes only; historical comparison policies remain intact.

Automated checks cover recipient ordering after all heals, injured/dead/full exclusions, caps/phase/paid-generated order, empowerment/stat precision, Cascade baseline changes/reordering/proc isolation, save migration, partial effective echoes and Tide timing/coexistence/casting. Full npm test: 237/237 pass. git diff --check passes.

Browser QA used the production app modules through an ignored isolated in-memory QA save, preserving the user's saved game. Verified migrated 8 spent/8 earned, talent and live spell wording, respec to 50% Ancestral, both Totems preserving charges, and an empowered Wave completing while both Totems were active; no warning/error entries. This is a UI/mechanics check, not manual full-route win evidence. [Talent screenshot](screenshots/bat-89-talents.png).

This is a coherent tested checkpoint for a commit on dev after user authorization. A dev→main milestone should follow acceptance review of this report. No commit, push or merge is assumed.
`;
writeFileSync('docs/bat-89-shaman-balance.md',body);
console.log('Generated docs/bat-89-shaman-balance.md; evidence hashes and early paired invariants verified');
