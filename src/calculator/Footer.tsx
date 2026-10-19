export function Footer() {
  return (
    <div className="foot">
      <p>
        <b>How it works.</b> When mana runs out, total healing is your total mana times healing per mana. One MP5 is
        worth (fight length / 5) × (base heal + coefficient × healing power) / (total mana × coefficient) points of
        Healing. Intellect gives 15 mana once per fight, and with Water Shield each heal crit returns 2% of max mana,
        so Intellect also makes every crit return more. Water Shield's limits (three globes, one proc every few
        seconds, a global cooldown to reapply) are not modelled; at normal crit rates they rarely bind. Spirit regen
        keeps running at the talent's share inside the five-second rule and at full rate outside it; gear and buff MP5
        always run at full rate. The final weights are the mana-bound values scaled by how often you actually run out.
      </p>
      <p>
        <b>Downranking.</b> Forever cuts a rank's healing power bonus by 5% for each level past 17 above the level you
        learned it. The coefficient is the base cast time divided by 3.5 seconds. Crits and percent talents multiply
        every term equally, so they do not change the weights.
      </p>
      <p>
        <b>Unconfirmed.</b> The Spirit rate above 90 Spirit, why the first few points of bonus Spirit give more, and
        whether level moves it (measured at level 22 from 43 to 90 Spirit; Intellect does not change it), whether the
        Icon stacks with the talent, Healing Wave rank 4's base heal (read from a chart), and the mana costs of Healing
        Wave rank 10 and Lesser Healing Wave rank 1 (Classic values). Max mana uses Classic's documented base mana for the Shaman. Naked level 24 and 25 Shamans in the beta match it (796 mana at 40 Intellect at level 24); other levels are not yet checked, and levels between documented values are estimated. Base crit chance (2.3%), the Intellect needed for 1% crit at each level (levels between the documented rows are estimated) and that a crit heals for 150% are Classic values, not yet checked in Forever. Calibrate and edit as the beta answers these.
      </p>
    </div>
  );
}
