import test from 'node:test';
import assert from 'node:assert/strict';
import { capacity, throughputItems } from '../scripts/gear-value-probes.mjs';
test('each healer slot adds useful short-fight healing and reduces Weapon dependence across chapters',()=>{
  for(const chapter of [1,2,3,4]) for(const healer of ['priest','druid','shaman']) {
    const base=capacity(chapter,healer,'new','none',40,920000).healing;
    const gains=['Weapon','Tome','Trinket'].map(slot=>capacity(chapter,healer,'new',slot,40,920000).healing-base);
    assert.ok(gains.every(gain=>gain>0),`${chapter} ${healer}: ${gains}`);
    assert.ok(Math.max(...gains)/Math.min(...gains)<=3,`${chapter} ${healer}: ${gains}`);
    const old=throughputItems(chapter,healer,'old'), current=throughputItems(chapter,healer);
    const share=items=>items[0].stats.spellPower/items.reduce((sum,i)=>sum+(i.stats.spellPower||0),0);
    assert.ok(share(current)<share(old));
  }
});
test('long-fight real Mana pool/regen contributions put all Shaman slots in a useful band',()=>{
  for(const chapter of [1,2,3,4]) {
    const base=capacity(chapter,'shaman','new','none',130,920000).healing;
    const gains=['Weapon','Tome','Trinket'].map(slot=>capacity(chapter,'shaman','new',slot,130,920000).healing-base);
    assert.ok(gains.every(gain=>gain>0));assert.ok(Math.max(...gains)/Math.min(...gains)<2);
    assert.ok(capacity(chapter,'shaman','new','full',130,920000).healing-base>Math.max(...gains));
  }
});
