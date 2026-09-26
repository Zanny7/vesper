// BAT-84: diagnose equipped-power and resource separation before tuning Chapter 4.
// node scripts/ch4-progression.mjs 100 > docs/bat-84-ch4-progression-baseline.jsonl
import { trial, summarize } from './holistic-balance.mjs';

const samples = Number(process.argv[2] || 100);
const healers = (process.env.HEALERS || 'priest,druid').split(',');
const profiles = (process.env.PROFILES || 'veryGood,average,weak').split(',');
const stages = (process.env.STAGES || 'first,one,ready').split(',');
const manaFloors = [60, 80, 100, 120, 160, 200, 240];
const captureTimes = [37.9, 54.9, 56.9, 58.9, 61.9];
const mean = (rows, value) => rows.length ? rows.reduce((sum, row) => sum + value(row), 0) / rows.length : null;
const round = value => value === null ? null : Math.round(value * 100) / 100;
function distribution(values) {
  const ordered = values.filter(value => value !== null).sort((a, b) => a - b);
  if (!ordered.length) return null;
  return Object.fromEntries([0, .1, .25, .5, .75, .9, .95, 1].map(q =>
    [q, round(ordered[Math.floor((ordered.length - 1) * q)])]));
}
const totalHp = resources => Object.values(resources.health).reduce((sum, hp) => sum + hp.current, 0);

for (const healer of healers) for (const profile of profiles) for (const stage of stages) {
  const rows = Array.from({ length: samples }, (_, index) => trial(4, healer, profile, stage, index,
    { captureTimes }));
  const encounters = [...new Set(rows.flatMap(row => row.route))].map(encounter => {
    const played = rows.flatMap(row => row.stages.filter(fight => fight.encounter === encounter));
    const wins = played.filter(fight => fight.won);
    return { encounter, samples: played.length, wins: wins.length,
      winningSeconds: distribution(wins.map(fight => fight.seconds)),
      runsPastSeconds: Object.fromEntries([50, 53, 55, 57, 60, 62, 65, 70].map(time =>
        [time, played.filter(fight => fight.seconds > time).length / played.length])),
      entryMana: distribution(played.map(fight => fight.entryResources.mana.current)),
      exitManaOnWin: distribution(wins.map(fight => fight.mana)),
      entryHp: distribution(played.map(fight => totalHp(fight.entryResources))),
      entryTankHp: distribution(played.map(fight => fight.entryResources.health.tank.current)),
      exitTankHpOnWin: distribution(wins.map(fight => fight.resources.health.tank.current)),
      regen: round(mean(played, fight => fight.entryPower.manaRegen)),
      spellPower: round(mean(played, fight => fight.entryPower.spellPower)),
      tankMaxHp: round(mean(played, fight => fight.entryPower.party[0].maxHp)),
      tankArmor: round(mean(played, fight => fight.entryPower.party[0].armor || 0)),
      checkpoints: captureTimes.map(at => {
        const checkpoints = played.flatMap(fight => fight.checkpoints.filter(point => point.at === at));
        const survivorCheckpoints = rows.filter(row => row.boss).flatMap(row => row.stages
          .filter(fight => fight.encounter === encounter).flatMap(fight => fight.checkpoints.filter(point => point.at === at)));
        return { at, stillFighting: checkpoints.length / played.length,
          mana: distribution(checkpoints.map(point => point.mana)),
          belowMana: Object.fromEntries(manaFloors.map(floor =>
            [floor, checkpoints.filter(point => point.mana < floor).length / played.length])),
          bossAccessBelowMana: Object.fromEntries(manaFloors.map(floor =>
            [floor, survivorCheckpoints.filter(point => point.mana < floor).length / Math.max(1, rows.filter(row => row.boss).length)])),
        };
      }),
    };
  });
  console.log(JSON.stringify({ ...summarize(rows, 4, healer, profile, stage), diagnostics: encounters }));
}
