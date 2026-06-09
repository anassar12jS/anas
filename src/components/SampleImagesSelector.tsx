import React from "react";
import { SamplePhoto } from "../types";

const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: "switzerland",
    name: "Alpine Valley",
    description: "Immaculate asphalt, wooden chalets, towering snow-capped peaks, and distinctive white roadside borders.",
    url: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "japan",
    name: "Classic Kyoto Lane",
    description: "Narrow paved lanes, left-side driving cues, traditional wooden architecture, and Kanji signposts.",
    url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "australia",
    name: "The Red Outback Way",
    description: "Vast flat horizon, rich iron-red desert sands on the shoulder, and typical dry eucalyptus trees.",
    url: "https://images.unsplash.com/photo-1529142858102-bf62283921b7?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "iceland",
    name: "Volcanic Ring Road",
    description: "Stark black volcanic sand field borders, high-contrast yellow plastic road stakes, and glaciated horizons.",
    url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800",
  },
];

interface SampleImagesProps {
  selectedSampleId: string | null;
  onSelectSample: (sample: SamplePhoto) => void;
  disabled?: boolean;
}

export default function SampleImagesSelector({
  selectedSampleId,
  onSelectSample,
  disabled = false,
}: SampleImagesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888]">
          Challenge Presets
        </h4>
        <span className="text-[9px] bg-[#f27d26]/15 text-[#f27d26] border border-[#f27d26]/20 px-2.5 py-0.5 rounded uppercase tracking-wider font-bold">
          Ready to guess
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SAMPLE_PHOTOS.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => !disabled && onSelectSample(sample)}
              disabled={disabled}
              className={`group flex flex-col text-left rounded-lg overflow-hidden border transition-all duration-200 focus:outline-none ${
                isSelected
                  ? "border-[#f27d26] ring-2 ring-[#f27d26]/20 bg-[#f27d26]/5"
                  : "border-[#222] hover:border-[#333] bg-[#0d0d0d] hover:bg-[#121212]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={sample.url}
                  alt={sample.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-105 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[#e0e0e0] text-xs font-bold leading-tight drop-shadow-sm font-display uppercase tracking-wide">
                    {sample.name}
                  </p>
                </div>
              </div>
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <p className="text-[10.5px] text-[#888] line-clamp-2 leading-relaxed font-sans">
                  {sample.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
