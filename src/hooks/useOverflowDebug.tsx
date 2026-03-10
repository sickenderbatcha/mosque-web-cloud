import { useEffect } from "react";

/**
 * Development-only hook to detect and highlight elements causing horizontal overflow.
 * Adds a red outline to overflowing elements and logs them to the console.
 * 
 * Usage: Call useOverflowDebug() in your App component or any page to enable debugging.
 * Only runs in development mode (import.meta.env.DEV).
 */
export const useOverflowDebug = (enabled: boolean = true) => {
  useEffect(() => {
    const STYLE_ID = "overflow-debug-styles";
    const DEBUG_CLASS = "overflow-debug-highlight";

    const cleanupExisting = () => {
      document.getElementById(STYLE_ID)?.remove();
      document.querySelectorAll(`.${DEBUG_CLASS}`).forEach((el) => {
        el.classList.remove(DEBUG_CLASS);
      });
    };

    // Dev-only. Also: if disabled, make sure we remove any leftover debug styles from earlier sessions.
    if (!import.meta.env.DEV || !enabled) {
      cleanupExisting();
      return;
    }


    // Add debug styles
    const addDebugStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        .${DEBUG_CLASS} {
          outline: 2px solid hsl(var(--destructive)) !important;
          outline-offset: 0 !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Remove debug styles
    const removeDebugStyles = () => {
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    };

    // Find elements causing horizontal overflow
    const findOverflowingElements = (): HTMLElement[] => {
      const docWidth = document.documentElement.offsetWidth;
      const overflowing: HTMLElement[] = [];

      document.querySelectorAll("*").forEach((element) => {
        const el = element as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // Check if element extends beyond viewport
        if (rect.right > docWidth || rect.left < 0) {
          // Exclude elements that are intentionally positioned (like fixed/absolute with transforms)
          const style = window.getComputedStyle(el);
          const isIntentional = 
            style.position === "fixed" || 
            (style.position === "absolute" && style.transform !== "none");
          
          if (!isIntentional && rect.width > 0) {
            overflowing.push(el);
          }
        }

        // Also check if element's scroll width exceeds its client width
        if (el.scrollWidth > el.clientWidth + 1) {
          const style = window.getComputedStyle(el);
          if (style.overflowX !== "hidden" && style.overflowX !== "scroll" && style.overflowX !== "auto") {
            // This element has content overflowing
            if (!overflowing.includes(el)) {
              overflowing.push(el);
            }
          }
        }
      });

      return overflowing;
    };

    // Highlight overflowing elements
    const highlightOverflow = () => {
      // Remove previous highlights
      document.querySelectorAll(`.${DEBUG_CLASS}`).forEach((el) => {
        el.classList.remove(DEBUG_CLASS);
      });

      const overflowing = findOverflowingElements();

      if (overflowing.length > 0) {
        console.group(
          "%c🚨 Overflow Debug: Found " + overflowing.length + " element(s) causing horizontal overflow",
          "color: red; font-weight: bold; font-size: 14px;"
        );

        overflowing.forEach((el, index) => {
          el.classList.add(DEBUG_CLASS);
          
          const rect = el.getBoundingClientRect();
          const docWidth = document.documentElement.offsetWidth;
          
          console.log(
            `%c${index + 1}. ${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className ? "." + el.className.split(" ").join(".") : ""}`,
            "color: red; font-weight: bold;"
          );
          console.log("   Element:", el);
          console.log(`   Bounds: left=${rect.left.toFixed(0)}, right=${rect.right.toFixed(0)}, width=${rect.width.toFixed(0)}`);
          console.log(`   Viewport width: ${docWidth}`);
          console.log(`   Overflow by: ${Math.max(0, rect.right - docWidth).toFixed(0)}px right, ${Math.max(0, -rect.left).toFixed(0)}px left`);
          
          if (el.scrollWidth > el.clientWidth) {
            console.log(`   Scroll overflow: scrollWidth=${el.scrollWidth}, clientWidth=${el.clientWidth}`);
          }
        });

        console.groupEnd();
      } else {
        console.log(
          "%c✅ Overflow Debug: No horizontal overflow detected",
          "color: green; font-weight: bold;"
        );
      }
    };

    // Initial setup
    addDebugStyles();
    
    // Run after a short delay to ensure page is fully rendered
    const initialTimeout = setTimeout(highlightOverflow, 500);

    // Re-run on resize
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(highlightOverflow, 200);
    };
    let resizeTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener("resize", handleResize);

    // Re-run on DOM mutations (for dynamically added content)
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(highlightOverflow, 300);
    });
    let mutationTimeout: ReturnType<typeof setTimeout>;
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      removeDebugStyles();
      document.querySelectorAll(`.${DEBUG_CLASS}`).forEach((el) => {
        el.classList.remove(DEBUG_CLASS);
      });
    };
  }, [enabled]);
};

/**
 * Manual function to check for overflow (can be called from browser console)
 * Usage in browser console: window.checkOverflow()
 */
if (import.meta.env.DEV) {
  (window as any).checkOverflow = () => {
    const docWidth = document.documentElement.offsetWidth;
    const overflowing: HTMLElement[] = [];

    document.querySelectorAll("*").forEach((element) => {
      const el = element as HTMLElement;
      const rect = el.getBoundingClientRect();
      
      if (rect.right > docWidth || rect.left < 0) {
        if (rect.width > 0) {
          overflowing.push(el);
        }
      }
    });

    if (overflowing.length > 0) {
      console.log("🚨 Elements causing overflow:", overflowing);
      overflowing.forEach((el) => {
        el.style.outline = "3px solid red";
      });
      console.log("Tip: Run window.clearOverflowHighlight() to remove highlights");
    } else {
      console.log("✅ No horizontal overflow detected");
    }

    return overflowing;
  };

  (window as any).clearOverflowHighlight = () => {
    document.querySelectorAll("*").forEach((el) => {
      (el as HTMLElement).style.outline = "";
    });
    console.log("Overflow highlights cleared");
  };
}

export default useOverflowDebug;
