"use client";

import { useState } from "react";
import { PdfProvider } from "@/components/providers/pdf-provider";
import { LibrarySidebar } from "@/components/library-sidebar";
import { ReaderView } from "@/components/reader-view";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

function PdfReaderAppContent() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const commandPalette = useCommandPalette();

    return (
        <>
            <div className="h-screen flex overflow-hidden bg-background">
                {/* Sidebar - always visible on large screens, toggleable on mobile */}
                <div
                    className={`
                        fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto
                        transform transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0"}
                    `}
                >
                    <LibrarySidebar onDocumentOpen={() => setSidebarOpen(false)} />
                </div>

                {/* Backdrop for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <ReaderView onMenuClick={() => setSidebarOpen(true)} />
            </div>

            {/* Command Palette */}
            <CommandPalette open={commandPalette.open} onClose={commandPalette.onClose} />
        </>
    );
}

export function PdfReaderApp() {
    return (
        <PdfProvider>
            <PdfReaderAppContent />
        </PdfProvider>
    );
}
