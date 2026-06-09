export interface Clue {
  category: string;
  observation: string;
  significance: string;
  confidence: number;
}

export interface OSINTPrediction {
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  confidence: number;
  clues: Clue[];
  rainboltReasoning: string;
}

export interface SamplePhoto {
  id: string;
  name: string;
  description: string;
  url: string;
}

export interface GuessHistoryItem {
  id: string;
  timestamp: string;
  image: string;
  prediction: OSINTPrediction;
  userGuess: { lat: number; lng: number } | null;
  distanceKm: number | null;
  score: number | null;
}
