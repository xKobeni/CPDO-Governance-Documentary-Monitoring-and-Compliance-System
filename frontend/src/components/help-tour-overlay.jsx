import { useEffect, useMemo, useState } from "react";
import { CircleHelp, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function getRectForSelector(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: Math.max(rect.top - 8, 8),
    left: Math.max(rect.left - 8, 8),
    width: Math.max(rect.width + 16, 24),
    height: Math.max(rect.height + 16, 24),
  };
}

function clickSelectorIfExists(selector) {
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.click();
}

export default function HelpTourOverlay({ steps, buttonLabel = "Help" }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeRect, setActiveRect] = useState(null);
  const [tourCardPos, setTourCardPos] = useState({ top: null, left: null });

  const safeSteps = useMemo(() => steps?.filter(Boolean) ?? [], [steps]);
  const hasSteps = safeSteps.length > 0;
  const currentStep = hasSteps ? safeSteps[stepIndex] : null;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === safeSteps.length - 1;

  useEffect(() => {
    if (!open || !currentStep) return;
    let rafId = null;

    const refreshRect = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const runPlacement = () => {
          if (currentStep.tabValue) {
            const tabTrigger = document.querySelector(`[data-tour-tab="${currentStep.tabValue}"]`);
            tabTrigger?.click();
          }

          const resolveAndPlace = (attempt = 0) => {
          const maxAttempts = currentStep.preActionSelector ? 28 : 12;
          const rect = getRectForSelector(currentStep.selector);
          if (!rect && attempt < maxAttempts) {
            window.setTimeout(() => resolveAndPlace(attempt + 1), 120);
            return;
          }

          setActiveRect(rect);
          if (rect) {
            const margin = 16;
            const cardWidth = Math.min(420, window.innerWidth - margin * 2);
            const cardHeight = 280;
            const spaceBelow = window.innerHeight - (rect.top + rect.height);
            const spaceAbove = rect.top;

            const preferredTop =
              spaceBelow >= cardHeight + 20
                ? rect.top + rect.height + 12
                : spaceAbove >= cardHeight + 20
                  ? rect.top - cardHeight - 12
                  : Math.max((window.innerHeight - cardHeight) / 2, margin);

            const preferredLeft = Math.min(
              Math.max(rect.left, margin),
              window.innerWidth - cardWidth - margin
            );

            setTourCardPos({ top: preferredTop, left: preferredLeft });
            const targetEl = document.querySelector(currentStep.selector);
            targetEl?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          } else {
            setTourCardPos({ top: null, left: null });
          }
          };

          resolveAndPlace();
        };

        if (currentStep.preActionSelector) {
          clickSelectorIfExists(currentStep.preActionSelector);
          window.setTimeout(runPlacement, 200);
        } else {
          runPlacement();
        }
      });
    };

    refreshRect();
    window.addEventListener("resize", refreshRect);
    window.addEventListener("scroll", refreshRect, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect, true);
    };
  }, [open, currentStep]);

  if (!hasSteps) return null;

  return (
    <>
      <button
        type="button"
        aria-label={buttonLabel}
        title={buttonLabel}
        onClick={() => {
          setStepIndex(0);
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      {open && activeRect && (
        <div
          className="pointer-events-none fixed z-[60] rounded-xl border-2 border-amber-400 bg-amber-100/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] will-change-[top,left,width,height] transition-[top,left,width,height] duration-300 ease-out"
          style={{
            top: `${activeRect.top}px`,
            left: `${activeRect.left}px`,
            width: `${activeRect.width}px`,
            height: `${activeRect.height}px`,
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md rounded-xl p-0 overflow-hidden z-[70] translate-x-0 translate-y-0"
          overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none dark:bg-transparent"
          style={{
            top: tourCardPos.top ?? undefined,
            left: tourCardPos.left ?? undefined,
            transform: tourCardPos.top !== null ? "none" : undefined,
          }}
          showCloseButton={false}
        >
          <div className="p-4 pb-3 border-b">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                Step {stepIndex + 1} of {safeSteps.length}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <DialogHeader className="px-5 pt-4">
            <DialogTitle className="text-xl">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-sm">{currentStep.description}</DialogDescription>
            {currentStep.selectorLabel && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1">
                Focus: {currentStep.selectorLabel}
              </p>
            )}
          </DialogHeader>

          <div className="px-5">
            <div className="flex items-center justify-center gap-1.5 py-2">
              {safeSteps.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    idx <= stepIndex ? "bg-amber-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-5 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={isFirstStep}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Skip
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    setOpen(false);
                    return;
                  }
                  setStepIndex((prev) => Math.min(prev + 1, safeSteps.length - 1));
                }}
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
