import { useState, useEffect, useRef } from "react";
import { usePdf } from "@/components/providers/pdf-provider";

export interface PageTime {
    page: number;
    duration: number; // in milliseconds
}

export interface ReadingSession {
    startTime: number;
    totalDuration: number | (() => number);
    getCurrentPageDuration: () => number;
    pagesRead: number;
    averageTimePerPage: number;
    history: PageTime[];
    currentPage: number;
}

export function useReadingStats() {
    const { currentDocument, currentPage } = usePdf();
    const [isOpen, setIsOpen] = useState(false);

    // Session state
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [history, setHistory] = useState<PageTime[]>([]);

    // Pause state
    const [isPaused, setIsPaused] = useState(false);
    const pauseStartRef = useRef<number | null>(null);

    // Refs for tracking intervals without re-renders
    const lastPageParams = useRef({ page: 1, time: Date.now() });

    // Helper: Adjust timestamps when resuming to ignore the paused duration
    const togglePause = () => {
        if (isPaused) {
            // RESUMING
            if (pauseStartRef.current) {
                const pauseDuration = Date.now() - pauseStartRef.current;

                // Shift the session start time forward by the pause duration
                // So (Now - StartTime) will effectively exclude the pause
                setStartTime(prev => prev + pauseDuration);

                // Shift the current page's start time forward too
                lastPageParams.current.time += pauseDuration;
            }
            pauseStartRef.current = null;
            setIsPaused(false);
        } else {
            // PAUSING
            pauseStartRef.current = Date.now();
            setIsPaused(true);
        }
    };

    // Reset on new document
    useEffect(() => {
        if (currentDocument) {
            setStartTime(Date.now());
            setHistory([]);
            lastPageParams.current = { page: currentPage, time: Date.now() };
            setIsPaused(false);
            pauseStartRef.current = null;
        }
    }, [currentDocument?.id]);

    // Track page changes
    useEffect(() => {
        if (!currentDocument) return;

        // If paused, we don't want to accumulate time for the PREVIOUS page.
        // But if the user switches pages while paused, we should update the tracker 
        // to start tracking the NEW page from "now" (which will be corrected on resume).

        if (isPaused) {
            // Just update the page index, don't touch the time or history.
            // The time ref will be shifted when we unpause.
            lastPageParams.current.page = currentPage;
            return;
        }

        const now = Date.now();
        const { page: lastPage, time: lastTime } = lastPageParams.current;
        const duration = now - lastTime;

        if (lastPage !== currentPage) {
            // Record history
            setHistory(prev => {
                const existingIndex = prev.findIndex(p => p.page === lastPage);

                if (existingIndex >= 0) {
                    const newHistory = [...prev];
                    const item = newHistory[existingIndex];
                    if (item) {
                        newHistory[existingIndex] = { ...item, duration: item.duration + duration };
                    }
                    return newHistory;
                }

                return [...prev, { page: lastPage, duration }];
            });

            // Update refs
            lastPageParams.current = { page: currentPage, time: now };
        }
    }, [currentPage, currentDocument, isPaused]);

    // Live duration calculation helper
    const getSessionDuration = () => {
        if (isPaused && pauseStartRef.current) {
            return pauseStartRef.current - startTime;
        }
        return Date.now() - startTime;
    };

    const getCurrentPageDuration = () => {
        if (isPaused && pauseStartRef.current) {
            return pauseStartRef.current - lastPageParams.current.time;
        }
        return Date.now() - lastPageParams.current.time;
    };

    // Calculate derived stats
    const totalPagesRead = new Set(history.map(h => h.page)).size;
    const totalRecordedTime = history.reduce((acc, curr) => acc + curr.duration, 0);
    const avgTime = totalPagesRead > 0 ? totalRecordedTime / totalPagesRead : 0;

    return {
        isOpen,
        setIsOpen,
        isPaused,
        togglePause,
        stats: {
            startTime,
            totalDuration: getSessionDuration, // function to get live time
            getCurrentPageDuration, // function to get live page time
            pagesRead: totalPagesRead,
            averageTimePerPage: avgTime,
            history,
            currentPage: lastPageParams.current.page
        }
    };
}
