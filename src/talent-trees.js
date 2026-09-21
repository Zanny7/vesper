// Definitions are presentation and progression data only. Their combat effects
// are implemented in the healer-specific talent issues that follow BAT-31.
export const TALENT_TREES = {
  priest: [
    { id: 'conservation-of-faith', row: 1, maxRank: 2, name: 'Conservation of Faith', description: 'Increase Mana regeneration by 10% per rank.' },
    { id: 'quick-remedy', row: 1, maxRank: 2, name: 'Quick Remedy', description: 'Reduce Flash Heal Mana cost by 3 per rank.' },
    { id: 'measured-casting', row: 1, maxRank: 2, name: 'Measured Casting', description: 'Reduce Greater Heal cast time: 3.0 → 2.8 → 2.5 sec.' },
    { id: 'post-haste', row: 2, maxRank: 2, name: 'Post-Haste', description: 'Flash Heal stores a stack for the next Greater Heal or Prayer.' },
    { id: 'focused-penance', row: 2, maxRank: 2, name: 'Focused Penance', description: 'Reduce Penance cooldown: 12 → 10 → 8 sec.' },
    { id: 'lingering-prayer', row: 2, name: 'Lingering Prayer', description: 'Prayer adds a short healing-over-time effect to every ally.' },
    { id: 'threefold-penance', row: 3, name: 'Threefold Penance', description: 'Penance gains a third main bolt and a smart healing bolt.' },
    { id: 'echo-of-grace', row: 3, name: 'Echo of Grace', description: 'Flash Heal and Greater Heal echo 20% healing to another wounded ally.' },
    { id: 'light-unspent', row: 3, name: 'Light Unspent', description: 'Redistribute half of Prayer of Healing’s direct overhealing.' },
    { id: 'twin-penance', row: 4, name: 'Twin Penance', description: 'Penance gains a second charge.' },
    { id: 'sanctuary', row: 4, name: 'Sanctuary', description: 'Grant the party 20% damage reduction for 10 sec.' },
    { id: 'divine-fervor', row: 4, name: 'Divine Fervor', description: 'Grant 20% Haste or companion attack speed for 20 sec.' },
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
