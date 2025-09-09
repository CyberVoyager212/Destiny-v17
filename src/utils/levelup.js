function xpToNext(level) {
  return 100 * level;
}

function applyXpAndLevel(pet, options = {}) {
  pet.level = pet.level || 1;
  pet.xp = pet.xp || 0;
  const maxLevel = options.maxLevel || Infinity;

  let gained = 0;
  while (pet.xp >= xpToNext(pet.level) && pet.level < maxLevel) {
    const need = xpToNext(pet.level);
    pet.xp -= need;
    pet.level += 1;
    gained += 1;
  }
  if (pet.xp < 0) pet.xp = 0;
  return { levelsGained: gained, xpRemaining: pet.xp };
}

module.exports = { xpToNext, applyXpAndLevel };
