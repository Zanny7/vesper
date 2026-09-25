# BAT-81 Druid healing expectations

These are raw spell-math baselines for BAT-82. They assume zero Spell Power, Haste, Crit, and overhealing; five living allies for party spells; and no Mana regeneration during the comparison. Actual effective healing depends on damage timing and target eligibility. BAT-81 leaves encounter values unchanged.

| Spell and situation | Healing | Mana | Timing and raw HPS | Raw HPM |
| --- | ---: | ---: | --- | ---: |
| Rejuvenation, one ally | 150 | 30 | Five 30-heal ticks over 15s; 10 HPS while active | 5.00 |
| Regrowth, one ally | 180 | 40 | 60 after a 1.5s cast, then six 20-heal ticks over 18s | 4.50 |
| Swiftmend, prepared ally | 130 | 35 | Instant burst; 15s cooldown | 3.71 |
| Swiftmend with Blooming Swiftmend, three wounded allies | 208 total | 35 | 130 primary plus 39 to each of two most injured others | 5.94 party-wide |
| Wild Growth, five allies | 400 total | 70 | 10 per ally each second for 8s; 50 party HPS while active | 5.71 party-wide |
| Wild Growth with Overgrowth, five allies | 400 total before transfers | 56 | Same base ticks; 50 party HPS while active | 7.14 party-wide |
| Nourish, zero / one / two / three qualifying HoT types | 80 / 110 / 140 / 170 | 30 | 2s cast, then four equal 1s ticks over 4s; 13.3 / 18.3 / 23.3 / 28.3 HPS across the full 6s | 2.67 / 3.67 / 4.67 / 5.67 |
| Nourish with Abundant Nourishment rank 2 and three HoT types | 230 | 30 | 2s cast, then four 57.5-heal ticks; 38.3 HPS across 6s | 7.67 |
| Triggered Cenarion Ward | 180 | 45 | Six 30-heal ticks over 6s after the 50% Health trigger; 30 HPS while active | 4.00 |
| Tranquility, five allies | 750 total | 100 | Five 30-heal ticks per ally over the 5s channel; 150 party HPS | 7.50 party-wide |

For comparison, BAT-80's Priest baselines are Flash Heal 90 in 1.5s for 30 Mana (60 cast HPS, 3.00 HPM), Greater Heal 200 in 3s for 45 Mana (66.7 cast HPS, 4.44 HPM), and Prayer of Healing 500 across five allies in 3s for 75 Mana (166.7 party cast HPS, 6.67 party HPM). Druid HoTs can overlap and keep healing while another spell is cast, so the table's active-effect HPS should not be treated as a cast-rate limit. Nourish's healing is delayed until its four ticks; the raw HPM assumes every tick is effective.

## Mechanics and gear interactions to simulate

- Natural Regeneration multiplies the Druid's current Mana regeneration, including gear, by 1.1 / 1.2. At the unmodified 2 Mana per second, it adds 0.2 / 0.4 Mana per second. This changes long fights more than short burst windows.
- At zero Haste, Spell Power adds once to a normal HoT's baseline total healing. Extra Haste-driven ticks can increase a normal core HoT's total, while finite Nourish and Ward pools keep their configured total. Nourishing Touch adds normal-strength ticks with that tick's Spell Power share, and can therefore make long prepared effects substantially stronger. Empowered Rejuvenation multiplies the Rejuvenation base ticks before Spell Power is distributed.
- Nourish counts only distinct Rejuvenation, Regrowth, and Wild Growth types at cast completion. Ward and Nourish do not count. Recasting adds the new heal to the unspent Nourish pool; it does not reproduce ticks that already landed. This creates high HPM on prepared targets, but its four-second delivery can miss burst deadlines.
- Ward is armed for at most 20 seconds and triggers immediately at or below 50% Health, or when damage crosses that inclusive threshold. One or two charges recharge sequentially, 30 seconds each. Ward's 4.00 raw HPM is below Rejuvenation's 5.00 even without other talents. A non-triggered Ward yields no healing; repeated applications replace the armed state.
- Passing Bloom moves an old Regrowth to the lowest-health-percentage wounded living ally without Regrowth and refreshes it to half normal duration, giving three normal ticks. If no ally qualifies, the old HoT ends. Measure how often a destination exists during spread damage.
- Overgrowth transfers half the source's *remaining* Wild Growth healing when a tick leaves that ally above 90% Health. A destination with Wild Growth absorbs the transfer in its existing pool; healing is conserved before overheal. Its value depends on uneven damage and on whether the recipient lives long enough to receive its pool. Bypass casts retain Wild Growth's original cooldown timer.
- Genesis restores active Rejuvenation, Regrowth, and Wild Growth to full duration and accelerates their ticks by 15% for eight seconds. It does not affect Nourish or Ward pools. Measure the value near expiry and during high Haste, where tick counts can change. Tranquility's 60-second cooldown and five-second channel make it sensitive to party-wide damage windows and interruptions.

These are initial expectations for simulation, not encounter retuning targets. BAT-79 boss and encounter numbers remain provisional for BAT-82 and the later holistic pass.
