import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  History, 
  Layers, 
  Map, 
  AlertCircle, 
  Search,
  Check,
  ChevronRight,
  Info
} from "lucide-react";
import confetti from "canvas-confetti";
import InteractiveMap from "./components/InteractiveMap";
import SampleImagesSelector from "./components/SampleImagesSelector";
import DeductionClues from "./components/DeductionClues";
import RainboltReasoningBox from "./components/RainboltReasoningBox";
import { OSINTPrediction, SamplePhoto, GuessHistoryItem } from "./types";

// Rotating OSINT loading messages for that elite geoguesser feel!
const LOADING_MESSAGES = [
  "Analyzing sun shadow angles to determine hemisphere...",
  "Cross-referencing road asphalt color with top soil registries...",
  "Running street camera car paint color triangulation...",
  "Identifying local flora and foliage structures...",
  "Detecting telephone utility pole design codes...",
  "Inspecting license plate layouts and regional text fonts...",
  "Comparing road lane stripes and side reflector bollards...",
  "Compiling final geospace telemetry...",
];

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [userGuess, setUserGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [prediction, setPrediction] = useState<OSINTPrediction | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GuessHistoryItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // File Upload input click ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages while parsing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploading) {
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [uploading]);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("geoguessr_osint_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read local storage history", e);
    }
  }, []);

  // Save history to LocalStorage
  const saveHistory = (newHistory: GuessHistoryItem[]) => {
    try {
      localStorage.setItem("geoguessr_osint_history", JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error("Failed to write local storage history", e);
    }
  };

  // Harvesine formula for metric geodistance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Score multiplier decaying exponentially over 2000km
  const calculateGeoguessrScore = (distKm: number): number => {
    if (distKm < 0.1) return 5000;
    const pts = 5000 * Math.exp(-distKm / 2000);
    return Math.max(0, Math.round(pts));
  };

  // Handle Drag events for image drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Image Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Handle Input select File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setIsSample(false);
        setSelectedSampleId(null);
        // Clear previous guess/results when a fresh picture is loaded
        setUserGuess(null);
        setPrediction(null);
        setScore(null);
        setDistanceKm(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Select pre-loaded sample phot
  const handleSelectSample = (sample: SamplePhoto) => {
    setSelectedImage(sample.url);
    setIsSample(true);
    setSelectedSampleId(sample.id);
    setUserGuess(null);
    setPrediction(null);
    setScore(null);
    setDistanceKm(null);
    setError(null);
  };

  // Clear current image and reset states
  const handleClearImage = () => {
    setSelectedImage(null);
    setIsSample(false);
    setSelectedSampleId(null);
    setUserGuess(null);
    setPrediction(null);
    setScore(null);
    setDistanceKm(null);
    setError(null);
  };

  // Primary Guess + AI analysis logic
  const handleLockInGuess = async () => {
    if (!selectedImage) {
      setError("Please upload an image or select a sample image first.");
      return;
    }
    if (!userGuess) {
      setError("Drop a pin on the map to place your guess before clicking Lock In.");
      return;
    }

    setUploading(true);
    setError(null);
    setLoadingMessageIdx(0);

    try {
      const payload = isSample 
        ? { imageUrl: selectedImage } 
        : { image: selectedImage };

      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const result: OSINTPrediction = await response.json();

      // Ensure response contains valid numeric coordinates
      if (typeof result.lat !== "number" || typeof result.lng !== "number") {
        throw new Error("Invalid coordinate returns from the OSINT API.");
      }

      setPrediction(result);

      // Evaluate Harvesine distance
      const dist = calculateDistance(userGuess.lat, userGuess.lng, result.lat, result.lng);
      setDistanceKm(dist);

      // Score
      const computedScore = calculateGeoguessrScore(dist);
      setScore(computedScore);

      // Confetti celebration for highly accurate guesses!
      if (computedScore > 4000) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      // Add to history
      const historyItem: GuessHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        image: selectedImage,
        prediction: result,
        userGuess: userGuess,
        distanceKm: dist,
        score: computedScore,
      };

      saveHistory([historyItem, ...history.slice(0, 9)]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "A network error happened. Please check your Gemini API configuration.");
    } finally {
      setUploading(false);
    }
  };

  // Re-play history guess
  const handleLoadHistoryItem = (item: GuessHistoryItem) => {
    setSelectedImage(item.image);
    setPrediction(item.prediction);
    setUserGuess(item.userGuess);
    setDistanceKm(item.distanceKm);
    setScore(item.score);
    setIsSample(false);
    setSelectedSampleId(null);
    setError(null);
  };

  // Reset entire state to default
  const handleResetApp = () => {
    handleClearImage();
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col antialiased font-sans">
      {/* Top Navbar */}
      <header id="nav-header" className="bg-[#0a0a0a] border-b border-[#222] sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f27d26] rounded-sm flex items-center justify-center font-bold text-black select-none shadow-lg shadow-[#f27d26]/10">
              A
            </div>
            <div>
              <h1 className="text-lg tracking-[0.15em] font-light uppercase text-white flex items-center gap-2">
                AXIS <span className="font-serif italic text-[#f27d26] lowercase tracking-normal font-normal">intelligence</span>
                <span className="text-[9px] bg-[#f27d26]/15 text-[#f27d26] border border-[#f27d26]/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono font-bold animate-pulse">RAINBOLT MODE</span>
              </h1>
              <p className="text-[9px] text-[#555] font-mono uppercase tracking-wider">Verify visual terrain clues through advanced OSINT neural networks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(selectedImage || prediction) && (
              <button
                onClick={handleResetApp}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#888] hover:text-white bg-[#111] hover:bg-[#1a1a1a] border border-[#222] px-3 py-1.5 rounded-sm font-bold transition-all cursor-pointer"
                id="btn-reset"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Board
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column (Inputs, Clues & Analysis) */}
        <div className="flex-1 lg:max-w-lg flex flex-col gap-6" id="left-column">
          
          {/* Main Photo Card */}
          <div className="bg-[#0a0a0a] rounded-lg border border-[#222] p-5 shadow-2xl relative overflow-hidden" id="photo-card">
            
            {/* Header info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#f27d26]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#888]">Target Image Reference</h2>
              </div>
              {selectedImage && (
                <button
                  onClick={handleClearImage}
                  className="p-1 rounded-sm bg-[#111] border border-[#222] hover:border-[#444] text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Clear image"
                  id="btn-clear-image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Error alerts */}
            {error && (
              <div className="mb-4 bg-red-950/20 border border-red-900/40 p-3.5 rounded-md flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold uppercase tracking-wider">OSINT Verification Blocked</p>
                  <p className="opacity-95">{error}</p>
                </div>
              </div>
            )}

            {/* Drag & Drop uploader area */}
            {!selectedImage ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                  dragActive 
                    ? "border-[#f27d26] bg-[#f27d26]/10" 
                    : "border-[#222] hover:border-[#f27d26] hover:bg-[#111]/40"
                }`}
                id="drop-zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="input-file"
                />
                <div className="bg-[#111] border border-[#222] p-4 rounded-full text-[#f27d26] mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#e0e0e0]">Upload place photography</p>
                <p className="text-[11px] text-[#888] mt-1">Drag & drop or Click to browse</p>
                <p className="text-[9px] text-slate-500 mt-3 font-mono uppercase tracking-[0.1em]">Supports JPG, PNG up to 20MB</p>
                <button className="mt-4 px-6 py-2 bg-[#f27d26] text-black text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-[0_0_12px_rgba(242,125,38,0.2)]">
                  Upload Source
                </button>
              </div>
            ) : (
              /* Photo preview */
              <div className="relative rounded-lg overflow-hidden aspect-video bg-black border border-[#222] shadow-sm">
                <img
                  src={selectedImage}
                  alt="Target"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90"
                  id="image-preview"
                />
                
                {isSample && (
                  <div className="absolute top-2 left-2 bg-[#f27d26] text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Challenge Preset
                  </div>
                )}
              </div>
            )}

            {/* Showcase guidelines / gameplay instructions */}
            {!selectedImage && (
              <div className="mt-4 pt-4 border-t border-[#222] flex items-start gap-2.5 text-[10px] text-[#888] leading-relaxed font-mono bg-[#0d0d0d] p-3.5 rounded-lg border border-[#222]">
                <Info className="w-4 h-4 text-[#888] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block uppercase tracking-wider mb-1">DEDUCTION OPERATION PROTOCOL:</span>
                  1. Deploy a landscape photograph, or select from the pre-seeded catalog parameters.
                  <br />
                  2. Cross-reference the observation reference with the interactive coordinate map coordinates.
                  <br />
                  3. Trigger "Lock In Guess" to invoke neural matching metrics.
                </div>
              </div>
            )}

            {/* Quick samples list if no image is uploaded */}
            {!selectedImage && (
              <div className="mt-4 pt-4 border-t border-[#222]" id="samples-panel">
                <SampleImagesSelector
                  selectedSampleId={selectedSampleId}
                  onSelectSample={handleSelectSample}
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          {/* Loader when calling backend predicting */}
          {uploading && (
            <div className="bg-[#0a0a0a] rounded-lg border border-[#222] p-6 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 py-11" id="loading-panel">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-[#111] border-t-[#f27d26] animate-spin" />
                <MapPin className="w-5 h-5 text-[#f27d26] absolute animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#888] font-mono">Geospatial Neural OSINT Parse</h3>
                <p className="text-[10px] text-[#f27d26] min-h-[16px] font-mono uppercase tracking-wider animate-pulse pt-1">
                  {LOADING_MESSAGES[loadingMessageIdx]}
                </p>
              </div>
            </div>
          )}

          {/* Predict Details & Breakdown Panel */}
          {prediction && !uploading && (
            <div className="space-y-6" id="results-panel">
              <DeductionClues
                prediction={prediction}
                score={score}
                distanceKm={distanceKm}
              />
              <RainboltReasoningBox reasoning={prediction.rainboltReasoning} />
            </div>
          )}
        </div>

        {/* Right Column (Map, Guess submissions & History) */}
        <div className="flex-1 flex flex-col gap-6" id="right-column">
          
          {/* Main Guess map card */}
          <div className="bg-[#0a0a0a] rounded-lg border border-[#222] p-5 shadow-2xl flex-1 flex flex-col gap-4 relative min-h-[420px]" id="map-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-[#f27d26]" />
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#888]">Satellite Target Reference Grid</h2>
              </div>

              {userGuess && (
                <div className="text-right">
                  <span className="text-[9px] text-[#555] font-bold uppercase block leading-none font-mono">GRID COORDINATES</span>
                  <span className="text-xs font-mono font-bold text-[#f27d26] tracking-wider">
                    {userGuess.lat.toFixed(4)}° N, {userGuess.lng.toFixed(4)}° E
                  </span>
                </div>
              )}
            </div>

            {/* Interactive Leaflet Map wrapper */}
            <div className="flex-1 min-h-[300px]">
              <InteractiveMap
                userGuess={userGuess}
                actualLocation={prediction ? { lat: prediction.lat, lng: prediction.lng } : null}
                onPlaceGuess={setUserGuess}
                disabled={uploading || prediction !== null}
              />
            </div>

            {/* Actions CTA panel */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-[10px] font-mono uppercase text-[#666] tracking-wider flex items-center gap-1.5">
                {prediction ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold uppercase">
                    <Check className="w-3.5 h-3.5" />
                    BOARD EVALUATED
                  </span>
                ) : (
                  <span>
                    {userGuess ? "COORD RESOLVED! Ready to verify." : "Drop a tracking bin on reference grid"}
                  </span>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {userGuess && !prediction && (
                  <button
                    onClick={handleLockInGuess}
                    disabled={uploading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 font-extrabold text-[11px] uppercase tracking-[0.15em] text-black bg-[#f27d26] hover:bg-[#ff9a4d] px-5 py-2.5 rounded-sm shadow-[0_0_15px_rgba(242,125,38,0.25)] hover:shadow-[0_0_22px_rgba(242,125,38,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none border-none"
                    id="btn-lock-guess"
                  >
                    <Sparkles className="w-4 h-4" />
                    Verify Spatial Fix
                  </button>
                )}
                
                {prediction && (
                  <button
                    onClick={handleResetApp}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-[0.15em] text-[#f27d26] border border-[#f27d26] hover:bg-[#f27d26] hover:text-black px-5 py-2.5 rounded-sm cursor-pointer transition-all outline-none"
                    id="btn-play-again"
                  >
                    Play Again
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* History / History Card */}
          {history.length > 0 && (
            <div className="bg-[#0a0a0a] rounded-lg border border-[#222] p-5 shadow-2xl" id="history-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#f27d26]" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888] flex items-center gap-1.5">TRIANGULATION LOGS</h3>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-[9px] text-[#555] hover:text-red-500 transition-colors font-mono font-bold uppercase tracking-wider cursor-pointer"
                  id="btn-clear-history"
                >
                  Clear Logs
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2.5 max-h-[170px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoadHistoryItem(item)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-[#222] bg-[#0c0c0c] hover:bg-[#121212] hover:border-[#333] text-left transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded border border-[#222] overflow-hidden bg-black flex-shrink-0 relative">
                      <img
                        src={item.image}
                        alt="Log preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="overflow-hidden space-y-0.5">
                      <p className="text-[10.5px] font-bold text-white uppercase tracking-wider truncate font-display">
                        {item.prediction.country}
                      </p>
                      <p className="text-[10px] text-[#f27d26] font-mono uppercase tracking-wide font-bold">
                        {item.score?.toLocaleString() || "0"} PTS
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-[#0a0a0a] border-t border-[#222] mt-auto h-12 flex items-center justify-between px-6 sm:px-8 text-[9px] font-mono text-[#555] uppercase tracking-wider">
        <div className="flex gap-6">
          <span>Session: XR-921-A</span>
          <span>Latency: SECURE</span>
          <span>Auth: VERIFIED</span>
        </div>
        <div className="flex gap-4">
          <span className="text-emerald-700 font-bold">System Stable ●</span>
          <span>©2026 AXIS OSINT LABS</span>
        </div>
      </footer>
    </div>
  );
}
