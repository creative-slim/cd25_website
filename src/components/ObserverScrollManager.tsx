import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { OBSERVER_CONFIG } from '../config/observerConfig';

// Register Observer plugin
gsap.registerPlugin(Observer);

interface ObserverScrollManagerProps {
    sections: string[];
    onSectionChange?: (sectionIndex: number, direction: 'up' | 'down', previousSection: number) => void;
    scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function ObserverScrollManager({
    sections,
    onSectionChange,
    scrollContainerRef
}: ObserverScrollManagerProps) {
    const currentSectionRef = useRef(0);
    const isAnimatingRef = useRef(false);
    const lastWheelTimeRef = useRef(0);
    const lastTouchTimeRef = useRef(0);
    const previousSectionRef = useRef(0);
    const scrollContainer = scrollContainerRef?.current || document.querySelector('[data-scroll-container]') || document.documentElement;

    // Snap to specific section with direction tracking
    const snapToSection = useCallback((sectionIndex: number, direction: 'up' | 'down' = 'down') => {
        if (isAnimatingRef.current || sectionIndex < 0 || sectionIndex >= sections.length) {
            return;
        }

        const previousSection = currentSectionRef.current;
        isAnimatingRef.current = true;
        previousSectionRef.current = previousSection;
        currentSectionRef.current = sectionIndex;

        const targetSection = document.getElementById(sections[sectionIndex]);
        if (!targetSection) return;

        if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
            console.log(`%c[OBSERVER]%c Snapping to section ${sectionIndex} (${direction})`,
                'color: #f542c8; font-weight: bold;',
                'color: inherit;'
            );
        }

        gsap.to(scrollContainer, {
            scrollTop: targetSection.offsetTop,
            duration: OBSERVER_CONFIG.SNAP_DURATION,
            ease: OBSERVER_CONFIG.SNAP_EASE,
            onComplete: () => {
                isAnimatingRef.current = false;
                onSectionChange?.(sectionIndex, direction, previousSection);
                if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
                    console.log(`%c[OBSERVER]%c Completed snap to section ${sectionIndex}`,
                        'color: #f542c8; font-weight: bold;',
                        'color: inherit;'
                    );
                }
            }
        });
    }, [sections, scrollContainer, onSectionChange]);

    // Handle wheel events for section navigation with throttling
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        if (isAnimatingRef.current) return;

        const now = Date.now();
        if (now - lastWheelTimeRef.current < OBSERVER_CONFIG.WHEEL_THROTTLE) {
            return;
        }
        lastWheelTimeRef.current = now;

        const direction = e.deltaY > 0 ? 'down' : 'up';
        const nextSection = Math.max(0, Math.min(sections.length - 1, currentSectionRef.current + (e.deltaY > 0 ? 1 : -1)));

        if (nextSection !== currentSectionRef.current) {
            snapToSection(nextSection, direction);
        }
    }, [sections, snapToSection]);

    // Handle keyboard navigation
    const handleKeydown = useCallback((e: KeyboardEvent) => {
        if (isAnimatingRef.current) return;

        let nextSection = currentSectionRef.current;

        let direction: 'up' | 'down' = 'down';

        switch (e.key) {
            case 'ArrowDown':
            case 'PageDown':
                e.preventDefault();
                direction = 'down';
                nextSection = Math.min(sections.length - 1, currentSectionRef.current + 1);
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                direction = 'up';
                nextSection = Math.max(0, currentSectionRef.current - 1);
                break;
            case 'Home':
                e.preventDefault();
                direction = 'up';
                nextSection = 0;
                break;
            case 'End':
                e.preventDefault();
                direction = 'down';
                nextSection = sections.length - 1;
                break;
            default:
                return;
        }

        if (nextSection !== currentSectionRef.current) {
            snapToSection(nextSection, direction);
        }
    }, [sections, snapToSection]);

    // Initialize Observer with performance optimizations
    useEffect(() => {
        // Prevent default scroll behavior
        const preventDefault = (e: Event) => e.preventDefault();

        // Add event listeners
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('touchstart', preventDefault, { passive: false });
        window.addEventListener('touchmove', preventDefault, { passive: false });

        // Initialize Observer for touch/swipe detection with throttling
        Observer.create({
            type: OBSERVER_CONFIG.OBSERVER_TYPES,
            wheelSpeed: OBSERVER_CONFIG.WHEEL_SPEED,
            onDown: () => {
                if (isAnimatingRef.current) return;

                const now = Date.now();
                if (now - lastTouchTimeRef.current < OBSERVER_CONFIG.TOUCH_THROTTLE) {
                    return;
                }
                lastTouchTimeRef.current = now;

                const nextSection = Math.min(sections.length - 1, currentSectionRef.current + 1);
                if (nextSection !== currentSectionRef.current) {
                    snapToSection(nextSection, 'down');
                }
            },
            onUp: () => {
                if (isAnimatingRef.current) return;

                const now = Date.now();
                if (now - lastTouchTimeRef.current < OBSERVER_CONFIG.TOUCH_THROTTLE) {
                    return;
                }
                lastTouchTimeRef.current = now;

                const nextSection = Math.max(0, currentSectionRef.current - 1);
                if (nextSection !== currentSectionRef.current) {
                    snapToSection(nextSection, 'up');
                }
            }
        });

        if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
            console.log(`%c[OBSERVER]%c Initialized with ${sections.length} sections`,
                'color: #f542c8; font-weight: bold;',
                'color: inherit;'
            );
        }

        // Cleanup
        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('touchstart', preventDefault);
            window.removeEventListener('touchmove', preventDefault);
            // Kill all Observer instances
            const observers = Observer.getAll ? Observer.getAll() : [];
            observers.forEach(observer => observer.kill());

            if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
                console.log(`%c[OBSERVER]%c Cleaned up`,
                    'color: #f542c8; font-weight: bold;',
                    'color: inherit;'
                );
            }
        };
    }, [handleWheel, handleKeydown, sections, snapToSection]);

    // Expose methods for external control
    useEffect(() => {
        if (OBSERVER_CONFIG.ENABLE_WINDOW_EXPOSE) {
            (window as any).observerScrollManager = {
                snapToSection,
                getCurrentSection: () => currentSectionRef.current
            };
        }
    }, [snapToSection]);

    return null;
} 