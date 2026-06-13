export interface PuzzleQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  daylightReward: number;
}

export const NPC_PUZZLES: { [npcId: string]: PuzzleQuestion } = {
  "npc-solara": {
    question: "To balance daylight and shadow throughout the year, the rotation of our world must be understood. In which month does the Summer Solstice occur in the Northern Hemisphere?",
    options: [
      "March (Vernal Transition)",
      "June (Estival Transition)",
      "September (Autumnal Transition)"
    ],
    correctIndex: 1, // June
    explanation: "Correct! The Summer Solstice occurs in June, representing the day with the absolute longest sunlight hours in the Northern Hemisphere.",
    daylightReward: 25
  },
  "npc-mira": {
    question: "Sailing upon Mirror Lake, you look down at the crystal reflections. If a sundial shadow points directly North at solar noon in the Northern region, where does the Sun sit in the sky?",
    options: [
      "Directly South",
      "Directly East",
      "Directly West"
    ],
    correctIndex: 0, // South
    explanation: "Excellent! At solar noon in the Northern Hemisphere, the Sun is at its highest point directly South, casting shadows due North.",
    daylightReward: 25
  },
  "npc-sylvan": {
    question: "Within the dense canopy of the Shadow Forest, ancient leaves capture every solar photon. What pigment inside plant cells captures this sunlight to trigger photosynthesis?",
    options: [
      "Carotene",
      "Chlorophyll",
      "Hemoglobin"
    ],
    correctIndex: 1, // Chlorophyll
    explanation: "Fantastic! Chlorophyll absorbs blue and red wavelengths of solar rays, reflecting green to feed the trees of our ancient forest.",
    daylightReward: 25
  },
  "npc-vesper": {
    question: "Vesper sits atop the tower, measuring the seasons with silent gaze. Earth sits tilted on its axis. What is the approximate angle of this tilt that generates our seasons and solstices?",
    options: [
      "12.5 degrees",
      "23.5 degrees",
      "45.0 degrees"
    ],
    correctIndex: 1, // 23.5 degrees
    explanation: "Superb! Earth's rotational axis is tilted by roughly 23.5 degrees. This tilt causes different regions to receive varying light as we orbit.",
    daylightReward: 25
  },
  "npc-sol": {
    question: "Our fiery solstice light travels at absolute cosmic speed. Approximately how long does it take for a ray of sunlight to journey across the void to reach Earth?",
    options: [
      "About 8 seconds",
      "About 8 minutes",
      "About 8 hours"
    ],
    correctIndex: 1, // 8 minutes
    explanation: "Stellar! Traveling at the speed of light, it takes about 8 minutes and 20 seconds for photons to traverse the 93 million miles from the Sun to us.",
    daylightReward: 25
  }
};
