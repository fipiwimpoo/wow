export interface OfficialCharacterSheet {
  id: string;
  faction: 'ALLIANCE' | 'HORDE';
  race: string;
  classId: string;
  displayName: string;
  sheetKey: string;
  description: string;
  hp: number;
  energy: number;
  racialPowerName: string;
  racialPowerDescription: string;
}

export const OFFICIAL_CHARACTER_SHEETS: OfficialCharacterSheet[] = [
  // --- HORDE ---
  {
    id: "horde_orc_warrior",
    faction: "HORDE",
    race: "ORC",
    classId: "WARRIOR",
    displayName: "Orc Warrior",
    sheetKey: "HORDE_ORC_WARRIOR",
    description: "A brutal frontline combatant who thrives in the heat of battle.",
    hp: 4,
    energy: 1,
    racialPowerName: "Blood Fury",
    racialPowerDescription: "Spend 1 Energy to add 1 red die to your pool."
  },
  {
    id: "horde_troll_priest",
    faction: "HORDE",
    race: "TROLL",
    classId: "PRIEST",
    displayName: "Troll Priest",
    sheetKey: "HORDE_TROLL_PRIEST",
    description: "A mystical healer who uses the power of the Loa.",
    hp: 3,
    energy: 3,
    racialPowerName: "Regeneration",
    racialPowerDescription: "Heal 1 HP at the start of your turn."
  },
  {
    id: "horde_troll_rogue",
    faction: "HORDE",
    race: "TROLL",
    classId: "ROGUE",
    displayName: "Troll Rogue",
    sheetKey: "HORDE_TROLL_ROGUE",
    description: "A swift assassin who strikes from the shadows.",
    hp: 4,
    energy: 2,
    racialPowerName: "Berserking",
    racialPowerDescription: "Gain +1 Red Die if current Health is below 50%."
  },
  {
    id: "horde_blood_elf_paladin",
    faction: "HORDE",
    race: "BLOOD_ELF",
    classId: "PALADIN",
    displayName: "Blood Elf Paladin",
    sheetKey: "HORDE_BLOOD_ELF_PALADIN",
    description: "A master of holy energy and martial prowess.",
    hp: 4,
    energy: 2,
    racialPowerName: "Arcane Torrent",
    racialPowerDescription: "Spend 1 Energy to silence an adjacent enemy or gain 1 extra reroll."
  },
  {
    id: "horde_undead_mage",
    faction: "HORDE",
    race: "UNDEAD",
    classId: "MAGE",
    displayName: "Undead Mage",
    sheetKey: "HORDE_UNDEAD_MAGE",
    description: "A master of frost and shadow magic.",
    hp: 3,
    energy: 3,
    racialPowerName: "Cannibalize",
    racialPowerDescription: "Heal 2 HP by consuming a defeated non-demon creature."
  },
  {
    id: "horde_tauren_druid",
    faction: "HORDE",
    race: "TAUREN",
    classId: "DRUID",
    displayName: "Tauren Druid",
    sheetKey: "HORDE_TAUREN_DRUID",
    description: "A guardian of nature capable of many forms.",
    hp: 4,
    energy: 2,
    racialPowerName: "Endurance",
    racialPowerDescription: "Gain +1 maximum Health."
  },
  {
    id: "horde_orc_shaman",
    faction: "HORDE",
    race: "ORC",
    classId: "SHAMAN",
    displayName: "Orc Shaman",
    sheetKey: "HORDE_ORC_SHAMAN",
    description: "A spiritual guide who commands the elements.",
    hp: 4,
    energy: 2,
    racialPowerName: "Hardiness",
    racialPowerDescription: "Reduce stun duration by 1 round."
  },
  {
    id: "horde_tauren_hunter",
    faction: "HORDE",
    race: "TAUREN",
    classId: "HUNTER",
    displayName: "Tauren Hunter",
    sheetKey: "HORDE_TAUREN_HUNTER",
    description: "A massive tracker with a loyal beast companion.",
    hp: 4,
    energy: 2,
    racialPowerName: "War Stomp",
    racialPowerDescription: "Stun 1 adjacent enemy at the start of combat."
  },
  {
    id: "horde_undead_warlock",
    faction: "HORDE",
    race: "UNDEAD",
    classId: "WARLOCK",
    displayName: "Undead Warlock",
    sheetKey: "HORDE_UNDEAD_WARLOCK",
    description: "A dark summoner who manipulates life energy.",
    hp: 4,
    energy: 2,
    racialPowerName: "Will of the Forsaken",
    racialPowerDescription: "Immunize against stun and fear effects."
  },

  // --- ALLIANCE ---
  {
    id: "alliance_night_elf_warrior",
    faction: "ALLIANCE",
    race: "NIGHT_ELF",
    classId: "WARRIOR",
    displayName: "Night Elf Warrior",
    sheetKey: "ALLIANCE_NIGHT_ELF_WARRIOR",
    description: "A graceful guardian of the forests.",
    hp: 4,
    energy: 1,
    racialPowerName: "Quickness",
    racialPowerDescription: "Gain +1 Reroll during physical combat rounds."
  },
  {
    id: "alliance_dwarf_priest",
    faction: "ALLIANCE",
    race: "DWARF",
    classId: "PRIEST",
    displayName: "Dwarf Priest",
    sheetKey: "ALLIANCE_DWARF_PRIEST",
    description: "A devout healer protected by the mountains.",
    hp: 3,
    energy: 3,
    racialPowerName: "Stoneform",
    racialPowerDescription: "Gain +1 Green Die to defend against physical damage."
  },
  {
    id: "alliance_gnome_rogue",
    faction: "ALLIANCE",
    race: "GNOME",
    classId: "ROGUE",
    displayName: "Gnome Rogue",
    sheetKey: "ALLIANCE_GNOME_ROGUE",
    description: "A tiny but lethal agent of subversion.",
    hp: 4,
    energy: 2,
    racialPowerName: "Escape Artist",
    racialPowerDescription: "Remove 1 restriction status (Stun or Curse) once per combat."
  },
  {
    id: "alliance_human_paladin",
    faction: "ALLIANCE",
    race: "HUMAN",
    classId: "PALADIN",
    displayName: "Human Paladin",
    sheetKey: "ALLIANCE_HUMAN_PALADIN",
    description: "A righteous defender of the Light.",
    hp: 4,
    energy: 2,
    racialPowerName: "Diplomacy",
    racialPowerDescription: "Gain +1 gold value when trading or receiving quest rewards."
  },
  {
    id: "alliance_gnome_mage",
    faction: "ALLIANCE",
    race: "GNOME",
    classId: "MAGE",
    displayName: "Gnome Mage",
    sheetKey: "ALLIANCE_GNOME_MAGE",
    description: "A brilliant mind mastering the arcane arts.",
    hp: 3,
    energy: 3,
    racialPowerName: "Expansive Mind",
    racialPowerDescription: "Gain +1 Blue Die when resolving spells."
  },
  {
    id: "alliance_night_elf_druid",
    faction: "ALLIANCE",
    race: "NIGHT_ELF",
    classId: "DRUID",
    displayName: "Night Elf Druid",
    sheetKey: "ALLIANCE_NIGHT_ELF_DRUID",
    description: "A master of shapeshifting and natural magic.",
    hp: 4,
    energy: 2,
    racialPowerName: "Shadowmeld",
    racialPowerDescription: "Reduce enemy targeting priority or gain +1 reroll when sneaking."
  },
  {
    id: "alliance_draenei_shaman",
    faction: "ALLIANCE",
    race: "DRAENEI",
    classId: "SHAMAN",
    displayName: "Draenei Shaman",
    sheetKey: "ALLIANCE_DRAENEI_SHAMAN",
    description: "A survivor who channels the power of the stars.",
    hp: 4,
    energy: 2,
    racialPowerName: "Gift of the Naaru",
    racialPowerDescription: "Heal 2 HP over 2 turns or gain +1 Blue Die once per combat."
  },
  {
    id: "alliance_dwarf_hunter",
    faction: "ALLIANCE",
    race: "DWARF",
    classId: "HUNTER",
    displayName: "Dwarf Hunter",
    sheetKey: "ALLIANCE_DWARF_HUNTER",
    description: "An expert marksman with a steady aim.",
    hp: 4,
    energy: 2,
    racialPowerName: "Stoneform",
    racialPowerDescription: "Gain +1 Green Die to defend against physical damage."
  },
  {
    id: "alliance_human_warlock",
    faction: "ALLIANCE",
    race: "HUMAN",
    classId: "WARLOCK",
    displayName: "Human Warlock",
    sheetKey: "ALLIANCE_HUMAN_WARLOCK",
    description: "A persistent scholar of forbidden shadow magic.",
    hp: 4,
    energy: 2,
    racialPowerName: "The Light's Grace",
    racialPowerDescription: "Spend 1 Energy to restore 1 HP to yourself or an ally."
  }
];
