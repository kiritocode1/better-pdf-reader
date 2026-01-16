"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePdf } from "@/components/providers/pdf-provider";
import { useTheme } from "better-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Copy01Icon,
    FileScriptIcon,
    Sun01Icon,
    Moon01Icon,
    ComputerIcon,
    Cancel01Icon,
    Search01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    GridViewIcon,
} from "@hugeicons/core-free-icons";

interface Command {
    id: string;
    label: string;
    description?: string;
    icon: typeof Copy01Icon;
    action: () => void;
    keywords?: string[];
    shortcut?: string;
}

interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const {
        currentDocument,
        copyPageAsMarkdown,
        copyDocumentAsMarkdown,
        closeDocument,
        pagesPerView,
        setPagesPerView,
    } = usePdf();
    const { theme, setTheme } = useTheme();

    // Define all commands
    const commands: Command[] = [
        // Theme commands
        {
            id: "theme-light",
            label: "Light Theme",
            description: "Switch to light mode",
            icon: Sun01Icon,
            action: () => setTheme("light"),
            keywords: ["theme", "light", "bright", "day"],
            shortcut: "L",
        },
        {
            id: "theme-dark",
            label: "Dark Theme",
            description: "Switch to dark mode",
            icon: Moon01Icon,
            action: () => setTheme("dark"),
            keywords: ["theme", "dark", "night"],
            shortcut: "D",
        },
        {
            id: "theme-system",
            label: "System Theme",
            description: "Follow system preference",
            icon: ComputerIcon,
            action: () => setTheme("system"),
            keywords: ["theme", "system", "auto"],
            shortcut: "S",
        },
        // Copy commands
        {
            id: "copy-page",
            label: "Copy Current Page",
            description: "Copy page content as Markdown",
            icon: Copy01Icon,
            action: async () => {
                await copyPageAsMarkdown();
            },
            keywords: ["copy", "page", "markdown", "export", "current"],
            shortcut: "⌘C",
        },
        {
            id: "copy-all",
            label: "Copy Entire Document",
            description: "Copy all pages as Markdown",
            icon: FileScriptIcon,
            action: async () => {
                await copyDocumentAsMarkdown();
            },
            keywords: ["copy", "all", "document", "full", "entire", "markdown", "export"],
            shortcut: "⇧⌘C",
        },
        // Layout commands
        {
            id: "layout-1",
            label: "Single Page View",
            description: "Display one page at a time",
            icon: GridViewIcon,
            action: () => setPagesPerView(1),
            keywords: ["layout", "single", "one", "page", "view"],
            shortcut: "1",
        },
        {
            id: "layout-2",
            label: "Two Page View",
            description: "Display two pages side by side",
            icon: GridViewIcon,
            action: () => setPagesPerView(2),
            keywords: ["layout", "two", "double", "page", "view", "spread"],
            shortcut: "2",
        },
        {
            id: "layout-4",
            label: "Four Page View",
            description: "Display four pages in a grid",
            icon: GridViewIcon,
            action: () => setPagesPerView(4),
            keywords: ["layout", "four", "quad", "page", "view", "grid"],
            shortcut: "4",
        },
        // Document commands
        ...(currentDocument ? [{
            id: "close-doc",
            label: "Close Document",
            description: `Close ${currentDocument.name}`,
            icon: Cancel01Icon,
            action: () => closeDocument(),
            keywords: ["close", "document", "exit"],
            shortcut: "⌘W",
        }] : []),
    ];

    // Filter commands based on query
    const filteredCommands = query.trim() === ""
        ? commands
        : commands.filter((cmd) => {
            const searchLower = query.toLowerCase();
            return (
                cmd.label.toLowerCase().includes(searchLower) ||
                cmd.description?.toLowerCase().includes(searchLower) ||
                cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))
            );
        });

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [open]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && filteredCommands.length > 0) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            selectedElement?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex, filteredCommands.length]);

    const executeCommand = useCallback((command: Command) => {
        command.action();
        onClose();
    }, [onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    executeCommand(filteredCommands[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                onClose();
                break;
        }
    }, [filteredCommands, selectedIndex, executeCommand, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

            {/* Palette */}
            <div
                className="relative w-full max-w-lg border border-border bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.5} className="text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-secondary border border-border">
                        ESC
                    </kbd>
                </div>

                {/* Commands list */}
                <div
                    ref={listRef}
                    className="max-h-[320px] overflow-y-auto py-2"
                >
                    {filteredCommands.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No commands found
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                onClick={() => executeCommand(cmd)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                                    ${index === selectedIndex
                                        ? "bg-secondary"
                                        : "hover:bg-secondary/50"
                                    }
                                `}
                            >
                                <div className={`
                                    w-8 h-8 flex items-center justify-center
                                    ${index === selectedIndex ? "text-foreground" : "text-muted-foreground"}
                                `}>
                                    <HugeiconsIcon icon={cmd.icon} size={16} strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {cmd.label}
                                    </p>
                                    {cmd.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {cmd.description}
                                        </p>
                                    )}
                                </div>
                                {cmd.shortcut && (
                                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border">
                                        {cmd.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={ArrowUp01Icon} size={10} strokeWidth={2} />
                            <HugeiconsIcon icon={ArrowDown01Icon} size={10} strokeWidth={2} />
                            Navigate
                        </span>
                        <span>↵ Select</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        {filteredCommands.length} commands
                    </span>
                </div>
            </div>
        </div>
    );
}

// Hook for keyboard shortcut
export function useCommandPalette() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return {
        open,
        setOpen,
        onClose: () => setOpen(false),
    };
}
