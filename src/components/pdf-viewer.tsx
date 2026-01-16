"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useTheme } from "better-themes";

interface PdfViewerProps {
    pdf: PDFDocumentProxy;
    currentPage: number;
    onPageChange?: (page: number) => void;
}

export function PdfViewer({ pdf, currentPage, onPageChange }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const [scale, setScale] = useState(1.5);
    const [isRendering, setIsRendering] = useState(false);
    const { theme } = useTheme();

    const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            if (!canvasRef.current || !pdf) return;

            // Cancel any pending render
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // Ignore cancellation errors
                }
                renderTaskRef.current = null;
            }

            setIsRendering(true);

            try {
                const page = await pdf.getPage(currentPage);

                if (cancelled) return;

                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");

                if (!context || cancelled) return;

                const viewport = page.getViewport({ scale });

                // Set canvas dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Clear the canvas before rendering
                context.clearRect(0, 0, canvas.width, canvas.height);

                // Start rendering
                const renderTask = page.render({
                    canvasContext: context,
                    viewport,
                    canvas
                });

                renderTaskRef.current = renderTask;

                await renderTask.promise;

                if (!cancelled) {
                    setIsRendering(false);
                }
            } catch (e) {
                // Ignore cancellation errors
                if (e instanceof Error && e.message.includes("Rendering cancelled")) {
                    return;
                }
                console.error("Failed to render page:", e);
                if (!cancelled) {
                    setIsRendering(false);
                }
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            // Cancel pending render on cleanup
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // Ignore
                }
                renderTaskRef.current = null;
            }
        };
    }, [currentPage, scale, pdf]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " ") {
                e.preventDefault();
                if (currentPage < pdf.numPages) {
                    onPageChange?.(currentPage + 1);
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (currentPage > 1) {
                    onPageChange?.(currentPage - 1);
                }
            } else if (e.key === "+" || e.key === "=") {
                e.preventDefault();
                setScale((s) => Math.min(s + 0.25, 3));
            } else if (e.key === "-") {
                e.preventDefault();
                setScale((s) => Math.max(s - 0.25, 0.5));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentPage, pdf.numPages, onPageChange]);

    return (
        <div
            ref={containerRef}
            className="relative flex-1 overflow-auto bg-muted/30"
        >
            {/* Zoom Controls */}
            <div className="sticky top-4 left-4 z-10 inline-flex items-center gap-2 rounded-xl bg-background/80 backdrop-blur-md border border-border px-3 py-2 shadow-lg">
                <button
                    onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-foreground"
                    aria-label="Zoom out"
                >
                    −
                </button>
                <span className="text-sm font-medium text-muted-foreground min-w-[4rem] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-foreground"
                    aria-label="Zoom in"
                >
                    +
                </button>
            </div>

            {/* PDF Canvas */}
            <div className="flex justify-center py-8 px-4">
                <div
                    className={`
            shadow-2xl rounded-lg overflow-hidden transition-all duration-300
            ${isDark ? "invert hue-rotate-180" : ""}
          `}
                    style={{
                        background: isDark ? "#1a1a2e" : "#ffffff",
                    }}
                >
                    <canvas ref={canvasRef} className="block" />
                </div>
            </div>

            {/* Loading overlay */}
            {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
