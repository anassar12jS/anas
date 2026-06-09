import React, { useState } from "react";
import { OSINTPrediction, Clue } from "../types";
import { 
  MapPin, 
  Copy, 
  Check, 
  Globe, 
  Zap, 
  Compass, 
  Milestone, 
  Sparkles, 
  Languages, 
  Navigation,
  TreePine
} from "lucide-react";

interface DeductionCluesProps {
  prediction: OSINTPrediction;
  score: number | null;
  distanceKm: number | null;
}

export default function DeductionClues({ prediction, score, distanceKm }: DeductionCluesProps) {
  const [copied, setCopied] = useState(false);

  const copyCoords = () => {
    const coordString = `${prediction.lat.toFixed(6)}, ${prediction.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Maps some clue categories to neat visual colors and icons
  const getCategoryTheme = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("pole") || lower.includes("utility") || lower.includes("electric")) {
      return {
        bg: "bg-amber-950/20 text-amber-400 border-amber-900/50",
        icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      };
    }
    if (lower.includes("flora") || lower.includes("tree") || lower.includes("plant") || lower.includes("vegetation")) {
      return {
        bg: "bg-emerald-950/20 text-emerald-400 border-emerald-900/50",
        icon: <TreePine className="w-3.5 h-3.5" />,
      };
    }
    if (lower.includes("language") || lower.includes("alphabet") || lower.includes("text") || lower.includes("font") || lower.includes("script")) {
      return {
        bg: "bg-purple-950/20 text-purple-400 border-purple-900/50",
        icon: <Languages className="w-3.5 h-3.5" />,
      };
    }
    if (lower.includes("marking") || lower.includes("road") || lower.includes("paint") || lower.includes("line")) {
      return {
        bg: "bg-sky-950/20 text-sky-400 border-sky-900/50",
        icon: <Milestone className="w-3.5 h-3.5" />,
      };
    }
    if (lower.includes("driving") || lower.includes("side") || lower.includes("traffic")) {
      return {
        bg: "bg-blue-950/20 text-blue-400 border-blue-900/50",
        icon: <Compass className="w-3.5 h-3.5" />,
      };
    }
    // Default
    return {
      bg: "bg-slate-900 text-slate-300 border-slate-800",
      icon: <Globe className="w-3.5 h-3.5" />,
    };
  };

  return (
    <div className="space-y-6">
      {/* Target summary badges */}
      <div className="bg-[#0a0a0a] text-[#e0e0e0] rounded-lg p-5 border border-[#222] shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f27d26]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-[#888] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-[#f27d26] animate-pulse" />
              OSINT SPECTRUM ANALYSIS
            </div>
            <h3 className="text-xl font-bold font-display uppercase tracking-wider text-white flex items-center gap-2 mt-1">
              <MapPin className="w-5 h-5 text-[#f27d26]" />
              {prediction.country}
            </h3>
            <p className="text-xs text-[#888]">
              {prediction.city ? `${prediction.city}, ` : ""}{prediction.region}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center rounded-sm bg-[#111] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f27d26] border border-[#222] shadow-sm">
              CONFIDENCE {prediction.confidence}%
            </span>
          </div>
        </div>

        {/* GPS Coordinates Widget */}
        <div className="mt-5 pt-4 border-t border-[#222] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] text-[#555] font-bold uppercase tracking-wider block">Triangulation Fixes</span>
            <span className="text-sm font-mono text-[#f27d26] font-semibold tracking-wide">
              {prediction.lat.toFixed(6)}° N, {prediction.lng.toFixed(6)}° E
            </span>
          </div>
          <button
            onClick={copyCoords}
            className="p-1.5 rounded-sm bg-[#111] border border-[#222] hover:border-[#444] text-slate-300 hover:text-white transition-colors"
            title="Copy coordinates"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#888] hover:text-[#f27d26]" />}
          </button>
        </div>
      </div>

      {/* Gamification scoring overlay if available */}
      {score !== null && distanceKm !== null && (
        <div className="bg-[#0a0a0a] rounded-lg p-4.5 border border-emerald-500/25 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              SPATIAL RANGE ACCURACY
            </div>
            <p className="text-xs text-[#888]">
              Target was found <span className="font-semibold text-white">{distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km</span> from the point of observation.
            </p>
          </div>
          <div className="text-right bg-emerald-950/20 px-3.5 py-2 rounded border border-emerald-800/40">
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider leading-none">OSINT POINTS</p>
            <p className="text-lg font-bold font-mono text-white mt-1">{score.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* OSINT Clues breakdown */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888]">
          Trace Indicators & Signpost Data
        </h4>

        {prediction.clues && prediction.clues.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {prediction.clues.map((clue, index) => {
              const theme = getCategoryTheme(clue.category);
              return (
                <div 
                  key={index} 
                  className="p-3.5 rounded-lg border border-[#222] bg-[#0a0a0a] hover:border-[#333] transition-colors relative overflow-hidden flex flex-col gap-2"
                >
                  {/* Confidence mini bar on bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111]">
                    <div 
                      className="h-full bg-[#f27d26]/80"
                      style={{ width: `${clue.confidence}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${theme.bg}`}>
                      {theme.icon}
                      {clue.category}
                    </span>
                    <span className="text-[9px] text-[#555] font-mono">
                      WEIGHT: {clue.confidence}%
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-snug">
                    {clue.observation}
                  </p>

                  <p className="text-[11px] text-[#888] leading-normal border-l border-[#222] pl-2.5">
                    {clue.significance}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No exact clue metrics detected.</p>
        )}
      </div>
    </div>
  );
}
