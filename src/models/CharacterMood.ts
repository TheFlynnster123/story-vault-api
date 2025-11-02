export interface CharacterMoodInfo {
  characterName: string;
  mood: string;
  realisticReaction: string;
}

export interface MoodResponse {
  characters: CharacterMoodInfo[];
}
