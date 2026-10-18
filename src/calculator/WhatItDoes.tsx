/** Static copy for searchers who land on the calculator page. */
export function WhatItDoes() {
  return (
    <section className="foot" aria-labelledby="h-what">
      <h2 id="h-what">What Tidecaller does</h2>
      <p>
        Tidecaller works out stat weights for a Restoration Shaman in World of Warcraft: Forever, from your own
        character and your own fight. Every number is in points of Healing, so a weight of 4 means one point of that
        stat is worth four points of Healing. The result is a priority line and a bar for each of MP5, Intellect,
        Spirit, Healing, Spell Power and Stamina.
      </p>
      <p>
        It also lists every heal rank you know and the share of gear bonus each keeps, picks the best usable set
        from 155 candidate items for your faction, level and professions, and scores any item you add yourself.
        The game data is from the Forever beta, and the values that are not yet confirmed are marked Check. See the{" "}
        <a href="/bis">Resto Shaman best in slot list</a> for the set at the default settings.
      </p>
      <p>
        Everything runs in your browser. Your settings and added items stay on your own device and nothing is sent
        anywhere. Change the fight length, how often you run out of mana or your regen talents, and the weights and
        the best set update at once.
      </p>
    </section>
  );
}
