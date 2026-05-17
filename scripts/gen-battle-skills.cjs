const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillsSrc = fs.readFileSync(path.join(root, 'utils/monsterSkills.js'), 'utf8');
const elSrc = fs.readFileSync(path.join(root, 'utils/elements.js'), 'utf8');
const sets = skillsSrc.match(/export const MONSTER_SKILL_SETS = \{[\s\S]*?\n\};/)[0];
const elems = elSrc.match(/export const MONSTER_ELEMENTS = \{[\s\S]*?\};/)[0];

const out = `/** Generated — do not edit by hand. Run: node scripts/gen-battle-skills.cjs */
${elems.replace('export const MONSTER_ELEMENTS', 'const MONSTER_ELEMENTS')}
${sets.replace('export const MONSTER_SKILL_SETS', 'const MONSTER_SKILL_SETS')}

function getTemplateElement(templateId) {
  return MONSTER_ELEMENTS[templateId] ?? 'earth';
}

function getMonsterSkillSet(templateId) {
  const set = MONSTER_SKILL_SETS[templateId];
  if (set) return set;
  const el = getTemplateElement(templateId);
  return {
    physical: { id: 'basic_hit', name: 'Basic Hit', kind: 'physical', effectType: 'normal', emoji: '👊', power: 1 },
    magic: [{ id: 'spark', name: 'Element Spark', kind: 'magic', mpCost: 12, element: el, power: 1.2, effectType: 'normal', emoji: '✨' }],
  };
}

function getPhysicalSkill(templateId) {
  return getMonsterSkillSet(templateId).physical;
}

function getMagicSkills(templateId) {
  return getMonsterSkillSet(templateId).magic;
}

function canAffordSkill(fighter, skill) {
  if (!skill || skill.kind !== 'magic') return true;
  return (fighter?.mp ?? 0) >= (skill.mpCost ?? 0);
}

module.exports = {
  getMonsterSkillSet,
  getPhysicalSkill,
  getMagicSkills,
  canAffordSkill,
  getTemplateElement,
};
`;

fs.writeFileSync(path.join(root, 'server/battleSkills.js'), out);
console.log('wrote server/battleSkills.js', fs.statSync(path.join(root, 'server/battleSkills.js')).size);
