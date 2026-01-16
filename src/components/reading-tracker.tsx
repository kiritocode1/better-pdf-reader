"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Wifi01Icon,
    RefreshIcon,
    StopIcon,
    RecordIcon,
    BatteryFullIcon,
    PlayIcon,
    PauseIcon
} from "@hugeicons/core-free-icons";
import type { ReadingSession } from "@/hooks/use-reading-stats";
import { cn } from "@/lib/utils";

interface ReadingTrackerProps {
    isOpen: boolean;
    onClose: () => void;
    stats: ReadingSession;
    currentSessionFn: () => number;
}

export function ReadingTracker({ isOpen, onClose, stats, currentSessionFn }: ReadingTrackerProps) {
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const controls = useDragControls();

    // Update timer every second
    useEffect(() => {
        if (!isOpen) return;

        // Immediate update
        setElapsed(currentSessionFn());

        const interval = setInterval(() => {
            if (!isPaused) {
                setElapsed(currentSessionFn());
            }
        }, 100); // Higher frequency for smoother feel if needed, though 1s is fine for seconds

        return () => clearInterval(interval);
    }, [isOpen, currentSessionFn, isPaused]);

    // Format time: HH:MM:SS
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const hDisplay = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
        const mDisplay = minutes.toString().padStart(2, '0');
        const sDisplay = seconds.toString().padStart(2, '0');

        return `${hDisplay}${mDisplay}:${sDisplay}`;
    };

    // Live Clock for Top Bar
    const [currentTime, setCurrentTime] = useState("");
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    // Generate waveform data from history or simulate one if empty
    // We want a "visual" waveform. We can map the last few pages' duration to bar heights.
    const waveformBars = useMemo(() => {
        const bars = 40;
        const history = stats.history || [];
        // Take last N items
        const rawData = history.slice(-bars);

        // If not enough data, pad with noise
        const data = new Array(bars).fill(0).map((_, i) => {
            // If we have history data, map it
            if (i < rawData.length) {
                const item = rawData[i];
                if (item) {
                    // Logarithmic scale for better visual range
                    return Math.min(100, Math.log(item.duration + 1) * 8);
                }
            }
            // Ambient noise
            return Math.random() * 15 + 5;
        });

        // Add a "live" bar at the end that pulses
        return data;
    }, [stats.history, elapsed]); // Re-calc on elapsed change to animate "live" feel roughly

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    drag
                    dragControls={controls}
                    dragMomentum={false}
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-8 right-8 z-50"
                >
                    {/* Device Casing */}
                    <div className="w-[280px] bg-[#E8E8E8] rounded-[32px] p-2.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-white/50 backdrop-blur-xl relative group">

                        {/* Grabbable Area Tip */}
                        <div
                            className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                            onPointerDown={(e) => controls.start(e)}
                        />

                        {/* Screen Area */}
                        <div className="bg-[#1A1A1A] rounded-[24px] h-[340px] flex flex-col relative overflow-hidden shadow-inner ring-1 ring-black/5">
                            {/* Screen Glare/Texture Overlay */}
                            <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                            {/* Status Bar */}
                            <div className="flex justify-between items-center px-5 py-4 text-[10px] font-medium tracking-wider text-neutral-500 font-mono">
                                <span>{currentTime}</span>
                                <div className="flex items-center gap-2">
                                    {!isPaused ? (
                                        <span className="flex items-center gap-1.5 text-red-500 animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                            REC
                                        </span>
                                    ) : (
                                        <span className="text-neutral-600">PAUSED</span>
                                    )}
                                    <HugeiconsIcon icon={BatteryFullIcon} size={14} className="text-neutral-400 ml-1" />
                                </div>
                            </div>

                            {/* Waveform Visualization */}
                            <div className="flex-1 flex items-center justify-center gap-[2px] px-6 opacity-80">
                                {waveformBars.map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-1 rounded-full bg-neutral-600 transition-all duration-300"
                                        style={{
                                            height: `${height}%`,
                                            opacity: i === waveformBars.length - 1 ? 1 : 0.3 + (height / 200),
                                            backgroundColor: i === waveformBars.length - 1 ? '#ef4444' : undefined // Red tip
                                        }}
                                    />
                                ))}
                                {/* Center Line */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-full h-px bg-red-500/10" />
                                </div>
                                {/* Playhead */}
                                <div className="absolute h-16 w-0.5 bg-red-500 rounded-full left-1/2 -translate-x-1/2 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            </div>

                            {/* Main Timer */}
                            <div className="px-6 pb-8 text-center">
                                <span className="text-5xl font-light tracking-tighter tabular-nums text-white font-sans">
                                    {formatTime(elapsed)}
                                </span>
                                <p className="text-[10px] text-neutral-500 font-mono tracking-[0.2em] mt-2">
                                    SESSION DURATION
                                </p>
                            </div>
                        </div>

                        {/* Physical Controls Area */}
                        <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 mt-2.5 h-[85px]">
                            {/* Record/Pause Button */}
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className="bg-[#E0E0E0] hover:bg-[#D6D6D6] rounded-[20px] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.05)] border-t border-white transition-all active:scale-[0.98] active:shadow-inner group/btn"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-colors",
                                    isPaused ? "bg-red-500/10 text-red-500" : "bg-transparent text-neutral-400"
                                )}>
                                    <div className={cn(
                                        "rounded-full transition-all duration-300",
                                        isPaused ? "w-3 h-3 bg-red-500" : "w-3 h-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                    )} />
                                </div>
                            </button>

                            {/* Stop/Close Button - Large Center */}
                            <button
                                onClick={onClose}
                                className="bg-[#E0E0E0] hover:bg-[#D6D6D6] rounded-[24px] flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.05)] border-t border-white transition-all active:scale-[0.98] active:shadow-inner gap-1"
                            >
                                <div className="w-12 h-12 rounded-full bg-[#F0F0F0] shadow-[inset_0_2px_5px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] flex items-center justify-center mb-0.5">
                                    <div className="w-4 h-4 rounded-[3px] bg-neutral-800" />
                                </div>
                            </button>

                            {/* Stats/Toggle Button */}
                            <div className="flex flex-col gap-2">
                                <button className="flex-1 bg-[#E0E0E0] hover:bg-[#D6D6D6] rounded-[20px] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.05)] border-t border-white transition-all active:scale-[0.98] active:shadow-inner">
                                    <HugeiconsIcon icon={Wifi01Icon} size={16} className="text-neutral-400" />
                                </button>
                                <button
                                    className="flex-1 bg-[#E0E0E0] hover:bg-[#D6D6D6] rounded-[20px] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.05)] border-t border-white transition-all active:scale-[0.98] active:shadow-inner"
                                    onClick={() => setElapsed(currentSessionFn())}
                                >
                                    <HugeiconsIcon icon={RefreshIcon} size={16} className="text-neutral-400" />
                                </button>
                            </div>
                        </div>

                        {/* Speaker Grille Detail */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-20 pointer-events-none">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-0.5 h-0.5 rounded-full bg-black" />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
