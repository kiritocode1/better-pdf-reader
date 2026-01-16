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
    isPaused: boolean;
    onTogglePause: () => void;
}

export function ReadingTracker({ isOpen, onClose, stats, currentSessionFn, isPaused, onTogglePause }: ReadingTrackerProps) {
    const [elapsed, setElapsed] = useState(0);
    const [livePageDuration, setLivePageDuration] = useState(0);
    const controls = useDragControls();

    // Update timer & live stats every 100ms
    useEffect(() => {
        if (!isOpen) return;

        // Immediate update
        setElapsed(currentSessionFn());
        if (stats.getCurrentPageDuration) {
            setLivePageDuration(stats.getCurrentPageDuration());
        }

        const interval = setInterval(() => {
            if (!isPaused) {
                setElapsed(currentSessionFn());
                if (stats.getCurrentPageDuration) {
                    setLivePageDuration(stats.getCurrentPageDuration());
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isOpen, currentSessionFn, isPaused, stats.getCurrentPageDuration]);

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

    // Calculate real stats
    const pagesPerHour = useMemo(() => {
        // Avoid NaN or Infinity
        if (!elapsed || stats.pagesRead === 0) return 0;

        // Stabilizer: Prevent wild fluctuations in the first minute
        // Treat duration as at least 60 seconds for the calculation
        const stableDuration = Math.max(elapsed, 60 * 1000);
        const hours = stableDuration / (1000 * 60 * 60);

        return Math.round(stats.pagesRead / hours);
    }, [elapsed, stats.pagesRead]);

    // Generate REAL waveform data from history
    // We want a fixed number of bars that "scroll" as you read more pages
    const waveformBars = useMemo(() => {
        const VISIBLE_BARS = 32;
        const history = stats.history || [];

        // Combine history + current live page
        const allData = [...history];

        // Always add the current live page if we have valid data
        // even if paused, to show where we are
        if (stats.currentPage) {
            allData.push({
                page: stats.currentPage,
                duration: isPaused ? (stats.getCurrentPageDuration ? stats.getCurrentPageDuration() : 0) : Math.max(100, livePageDuration)
            });
        }

        // Calculate a moving maximum for scaling
        // We look at the last few pages to determine the "scale" of the graph
        // so one long page doesn't permanently flatten everything
        const recentDurations = allData.slice(-VISIBLE_BARS).map(d => d.duration);
        const maxDuration = Math.max(...recentDurations, 10000); // Minimum 10s baseline for scale

        // Build the display array (padded to VISIBLE_BARS)
        const bars = [];
        for (let i = 0; i < VISIBLE_BARS; i++) {
            // access from the end
            const dataIndex = allData.length - 1 - i;

            // Safe access pattern
            const item = dataIndex >= 0 ? allData[dataIndex] : undefined;

            if (item) {
                // Non-linear scaling (sqrt) helps visualize shorter times better alongside long ones
                const ratio = Math.sqrt(item.duration) / Math.sqrt(maxDuration);
                const heightPercent = Math.min(100, Math.max(15, ratio * 100)); // Min 15% height

                bars.unshift({
                    type: 'data',
                    height: heightPercent,
                    page: item.page,
                    active: dataIndex === allData.length - 1 && !isPaused
                });
            } else {
                // Empty slot (future/past)
                // Add explicit "noise" pattern for empty slots to look like an active device waiting
                const noise = 8 + Math.sin(i * 0.8) * 4;
                bars.unshift({
                    type: 'empty',
                    height: noise,
                    page: 0,
                    active: false
                });
            }
        }
        return bars;
    }, [stats.history, livePageDuration, isPaused, stats.currentPage]);

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
                    <div className="w-[300px] bg-[#1a1a1a] rounded-[32px] p-2.5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-black/50 backdrop-blur-xl relative group">

                        {/* Grabbable Area Tip */}
                        <div
                            className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                            onPointerDown={(e) => controls.start(e)}
                        />

                        {/* Screen Area */}
                        <div className="bg-black rounded-[24px] h-[340px] flex flex-col relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                            {/* Screen Glare */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none z-20" />

                            {/* Status Bar */}
                            <div className="flex justify-between items-center px-5 py-4 text-[10px] font-medium tracking-wider text-neutral-500 font-mono relative z-10">
                                <span className="text-neutral-400">{currentTime}</span>
                                <div className="flex items-center gap-2">
                                    {!isPaused ? (
                                        <span className="flex items-center gap-1.5 text-red-500 animate-pulse font-bold">
                                            REC
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        </span>
                                    ) : (
                                        <span className="text-neutral-600 flex items-center gap-1.5 font-bold">
                                            PAUSED
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Waveform Visualization */}
                            <div className="flex-1 flex items-end justify-between px-6 pb-4 pt-10 gap-[2px] relative z-10">
                                {waveformBars.map((bar, i) => (
                                    <div
                                        key={i}
                                        className="relative flex-1 flex flex-col justify-end group/bar h-full"
                                    >
                                        <div
                                            className={cn(
                                                "w-full rounded-full transition-all duration-300 ease-out",
                                                bar.type === 'data'
                                                    ? (bar.active ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" : "bg-white/40")
                                                    : "bg-neutral-800/40"
                                            )}
                                            style={{
                                                height: `${bar.height}%`,
                                            }}
                                        />
                                        {/* Tooltip */}
                                        {bar.type === 'data' && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                                                Page {bar.page}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Center/Base Line visual */}
                                <div className="absolute inset-x-0 bottom-[1px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                            </div>

                            {/* Main Timer & Metrics */}
                            <div className="px-6 pb-6 text-center">
                                {/* Timer */}
                                <span className={cn(
                                    "text-5xl font-light tracking-tighter tabular-nums font-sans transition-colors block mb-4",
                                    isPaused ? "text-neutral-500" : "text-white"
                                )}>
                                    {formatTime(elapsed)}
                                </span>

                                {/* Real Stats Row */}
                                <div className="flex items-center justify-center divide-x divide-neutral-800 border-t border-neutral-800 pt-3">
                                    <div className="px-4 flex flex-col items-center">
                                        <span className="text-xl font-medium text-white tabular-nums">{stats.pagesRead}</span>
                                        <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase">PAGES</span>
                                    </div>
                                    <div className="px-4 flex flex-col items-center">
                                        <span className="text-xl font-medium text-white tabular-nums">{pagesPerHour}</span>
                                        <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase">PG/HR</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Physical Controls Area */}
                        <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 mt-2.5 h-[85px]">
                            {/* Record/Pause Button */}
                            <button
                                onClick={onTogglePause}
                                className="bg-[#E0E0E0] hover:bg-[#D6D6D6] rounded-[20px] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.05)] border-t border-white transition-all active:scale-[0.98] active:shadow-inner group/btn"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300",
                                    !isPaused ? "bg-red-500/10 text-red-500" : "bg-transparent text-neutral-400"
                                )}>
                                    <div className={cn(
                                        "rounded-full transition-all duration-300",
                                        !isPaused ? "w-3 h-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" : "w-3 h-3 bg-neutral-400"
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

                        {/* Speaker Grille Detail - More realistic mesh */}
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1 opacity-20 pointer-events-none w-32 justify-center flex-wrap">
                            {[...Array(24)].map((_, i) => (
                                <div key={i} className="w-[2px] h-[2px] rounded-full bg-black/60" />
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
