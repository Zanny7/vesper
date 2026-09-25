import { PRIEST_TALENT_VALUES } from './data.js';

const priestValues = PRIEST_TALENT_VALUES;

export const TALENT_TREES = {
  priest: [
    { id: 'conservation-of-faith', row: 1, maxRank: 2, name: 'Conservation of Faith', description: `Increase the Priest’s Mana regeneration by ${priestValues.conservationOfFaith.manaRegenPerRank * 100}% / ${priestValues.conservationOfFaith.manaRegenPerRank * 200}%.` },
    { id: 'binding-light', row: 1, maxRank: 2, name: 'Binding Light', description: `Flash Heal also heals the lowest-health eligible other living ally for ${priestValues.bindingLight.effectiveHealRatioByRank[1] * 100}% / ${priestValues.bindingLight.effectiveHealRatioByRank[2] * 100}% of the primary target’s effective heal.` },
    { id: 'early-mercy', row: 1, maxRank: 2, name: 'Early Mercy', description: `Greater Heal delivers ${priestValues.earlyMercy.provisionalRatioByRank[1] * 100}% / ${priestValues.earlyMercy.provisionalRatioByRank[2] * 100}% of its heal halfway through the cast, then the remainder at completion. Mana is charged once when casting starts; interrupting before halfway gives no heal, while interrupting afterward keeps the provisional heal. Mana is not refunded.` },
    { id: 'post-haste', row: 2, maxRank: 2, name: 'Post-Haste', description: `Each Flash Heal grants one stack, up to 1 / 2. The next Greater Heal or Prayer of Healing consumes one stack, reducing its cast time and Mana cost by ${priestValues.postHaste.castAndManaReduction * 100}%.` },
    { id: 'focused-penance', row: 2, maxRank: 2, name: 'Focused Penance', description: `Subtract ${priestValues.focusedPenance.cooldownReductionPerRank}s / ${priestValues.focusedPenance.cooldownReductionPerRank * 2}s from Penance’s current base cooldown.` },
    { id: 'lingering-prayer', row: 2, name: 'Lingering Prayer', description: `After Prayer of Healing, each target still below ${priestValues.lingeringPrayer.threshold * 100}% Health receives a ${priestValues.lingeringPrayer.duration}s HoT worth ${priestValues.lingeringPrayer.ratio * 100}% of that target’s direct heal (${priestValues.lingeringPrayer.interval}s ticks).` },
    { id: 'fourfold-penance', row: 3, name: 'Fourfold Penance', description: `Penance fires ${priestValues.fourfoldPenance.mainBolts} main bolts at its target and one additional bolt that heals the lowest-health other living ally; all four bolts use the normal Penance healing or damage rules.` },
    { id: 'echo-of-grace', row: 3, name: 'Echo of Grace', description: `Flash Heal and Greater Heal also heal the lowest-health other wounded ally for ${priestValues.echoOfGrace.ratio * 100}% of their direct heal.` },
    { id: 'light-unspent', row: 3, name: 'Light Unspent', description: `Prayer of Healing shares ${priestValues.lightUnspent.overhealRatio * 100}% of its direct overhealing evenly among allies still injured after its direct heals.` },
    { id: 'twin-penance', row: 4, name: 'Twin Penance', description: `Penance stores ${priestValues.twinPenance.charges} charges. Each charge recharges in its current cooldown time; recharges occur one at a time.` },
    { id: 'sanctuary', row: 4, name: 'Sanctuary', description: `Instantly reduces all party damage taken by ${priestValues.sanctuary.reduction * 100}% for ${priestValues.sanctuary.duration}s. ${priestValues.sanctuary.cooldown}s cooldown.` },
    { id: 'divine-fervor', row: 4, name: 'Divine Fervor', description: `Instantly grants the Priest ${priestValues.divineFervor.speed * 100}% Haste and reduces all spell Mana costs by ${priestValues.divineFervor.manaReduction * 100}% for ${priestValues.divineFervor.duration}s. ${priestValues.divineFervor.cooldown}s cooldown.` },
  ],
  druid: [
    { id: 'preserved-growth', row: 1, name: 'Preserved Growth', description: 'Swiftmend no longer consumes its required HoT.' },
    { id: 'empowered-rejuvenation', row: 1, maxRank: 2, name: 'Empowered Rejuvenation', description: 'Increase Rejuvenation total healing by 10% per rank.' },
    { id: 'nourishing-touch', row: 1, maxRank: 2, name: 'Nourishing Touch', description: 'Reduce Nourish cast time: 2.0 → 1.8 → 1.6 sec.' },
    { id: 'passing-bloom', row: 2, name: 'Passing Bloom', description: 'Move an existing Regrowth HoT before refreshing it.' },
    { id: 'cenarion-ward', row: 2, name: 'Cenarion Ward', description: 'Unlock a ward that increases healing received after damage.' },
    { id: 'abundant-nourishment', row: 2, maxRank: 2, name: 'Abundant Nourishment', description: 'Increase Nourish healing for each active HoT by 5 per rank.' },
    { id: 'blooming-swiftmend', row: 3, name: 'Blooming Swiftmend', description: 'Swiftmend blooms to heal other party members.' },
    { id: 'overgrowth', row: 3, name: 'Overgrowth', description: 'Cast Wild Growth during its cooldown and preserve pending healing.' },
    { id: 'living-rejuvenation', row: 3, name: 'Living Rejuvenation', description: 'Rejuvenation ticks faster below 50% Health and seeks wounded allies.' },
    { id: 'genesis', row: 4, name: 'Genesis', description: 'Unlock a cooldown that extends active Druid HoTs.' },
    { id: 'twin-rejuvenation', row: 4, name: 'Twin Rejuvenation', description: 'Allow two independent Rejuvenations on one target.' },
    { id: 'tranquility', row: 4, name: 'Tranquility', description: 'Unlock a major five-second party-healing channel.' },
  ],
};
