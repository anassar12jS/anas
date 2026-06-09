import React, { useEffect, useState } from "react";
import { Terminal, Lightbulb, Play, Pause, RefreshCw } from "lucide-react";

interface RainboltReasoningBoxProps {
  reasoning: string;
}

export default function RainboltReasoningBox({ reasoning }: RainboltReasoningBoxProps) {
  const [typedText, setTypedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Typewriter effect to emulate raw, energetic commentary being written live!
  useEffect(() => {
    setTypedText("");
    setCurrentIndex(0);
  }, [reasoning]);

  useEffect(() => {
    if (!reasoning) return;
    if (currentIndex < reasoning.length) {
      const timeout = setTimeout(() => {
        setTypedText((prev) => prev + reasoning[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 8); // nice fast typewriter speed mirroring Rainbolt's ultra-fast speaking style
      return () => clearTimeout(timeout);
    }
  }, [reasoning, currentIndex]);

  return (
    <div className="bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden shadow-2xl font-mono text-xs text-slate-300">
      {/* Console Header */}
      <div className="bg-[#070707] px-4 py-2.5 flex items-center justify-between border-b border-[#222]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#444] rounded-full inline-block"></span>
            <span className="w-1.5 h-1.5 bg-[#f27d26] rounded-full inline-block animate-pulse"></span>
            <span className="w-1.5 h-1.5 bg-[#222] rounded-full inline-block"></span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Terminal className="w-3 h-3 text-[#f27d26] animate-pulse" />
            RAINBOLT DIALECT DEDUCTION
          </span>
        </div>
        
        <span className="text-[9px] bg-[#f27d26]/15 text-[#f27d26] border border-[#f27d26]/20 px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider animate-pulse">
          Deduction Feed
        </span>
      </div>

      {/* Terminal Content */}
      <div className="p-4 space-y-4 min-h-[140px] flex flex-col justify-between">
        <div className="relative">
          {/* Hologram-style faint grid overlay */}
          <div className="absolute inset-0 bg-grid-slate-800/15 pointer-events-none" />

          {/* Typewriter target text block */}
          <p className="leading-relaxed text-slate-200 whitespace-pre-wrap select-all font-sans text-sm tracking-tight pt-1">
            {typedText}
            {currentIndex < reasoning.length && (
              <span className="w-1.5 h-4 bg-[#f27d26] inline-block animate-pulse ml-0.5" />
            )}
          </p>
        </div>

        {/* Rainbolt audio wave and character simulation */}
        <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            {/* Visual audio wave representation */}
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-0.5 h-1 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.1s" }} />
              <span className="w-0.5 h-3 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="w-0.5 h-2.5 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.5s" }} />
              <span className="w-0.5 h-4 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-0.5 h-1.5 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.4s" }} />
              <span className="w-0.5 h-2 bg-[#f27d26] animate-bounce" style={{ animationDelay: "0.6s" }} />
            </div>
            <span className="text-[#555] font-semibold tracking-wide">AUDIO OUT SYNCED [0.1X LATENCY]</span>
          </div>

          <div className="text-[#555] flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-[#f27d26]" />
            <span>Click text to copy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
