(function () {
  const root = document.documentElement;

  function viewportHeight() {
    return Math.max(220, Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight || document.documentElement.clientHeight || 0));
  }

  function viewportWidth() {
    return Math.max(220, Math.round((window.visualViewport && window.visualViewport.width) || window.innerWidth || document.documentElement.clientWidth || 0));
  }

  function updateViewportVars() {
    root.style.setProperty("--config-vh", viewportHeight() + "px");
    root.style.setProperty("--config-vw", viewportWidth() + "px");
  }

  function getSetupOverlay() {
    return document.getElementById("setupOverlay") || document.querySelector(".setup-overlay");
  }

  function isSetupOpen() {
    const overlay = getSetupOverlay();
    return !!(overlay && overlay.classList.contains("show"));
  }

  function normalizeSetupDom() {
    const overlay = getSetupOverlay();
    if (!overlay) return;

    overlay.classList.add("unified-setup-overlay");
    const card = overlay.querySelector(".setup-card");
    const top = overlay.querySelector(".setup-top");
    const grid = overlay.querySelector(".setup-grid");

    if (card) card.classList.add("unified-setup-card");
    if (top) top.classList.add("unified-setup-top");
    if (grid) {
      grid.classList.add("unified-setup-grid");
      const panels = Array.from(grid.children).filter(el => el.nodeType === 1);
      if (panels[0]) panels[0].classList.add("unified-bank-panel");
      if (panels[1]) panels[1].classList.add("unified-options-panel");
    }

    overlay.querySelectorAll(".category-list").forEach(list => {
      list.classList.add("unified-bank-list");
    });

    overlay.querySelectorAll(".level-section").forEach(section => {
      if (!section.hasAttribute("data-unified-ready")) {
        section.setAttribute("data-unified-ready", "1");
      }
    });

    // Evita que estilos viejos de alto fijo sigan mandando por atributo inline.
    overlay.querySelectorAll(".setup-grid, .category-list, .level-category-list, .word-chip-grid").forEach(el => {
      if (el.style && /height|max-height|overflow/.test(el.getAttribute("style") || "")) {
        el.style.removeProperty("height");
        el.style.removeProperty("max-height");
        el.style.removeProperty("overflow");
        el.style.removeProperty("overflow-y");
        el.style.removeProperty("overflow-x");
      }
    });
  }

  function syncSetupState() {
    updateViewportVars();
    normalizeSetupDom();
    const open = isSetupOpen();
    root.classList.toggle("setup-open", open);
    if (!open && root.classList.contains("setup-first-run")) {
      root.classList.remove("setup-first-run");
    }
  }

  function installOverlayObserver() {
    const overlay = getSetupOverlay();
    if (!overlay || overlay.__configRuntimeObserved) return;
    overlay.__configRuntimeObserved = true;
    const observer = new MutationObserver(syncSetupState);
    observer.observe(overlay, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "aria-hidden", "style", "open"] });
  }

  function removeFirstRunAfterStart(event) {
    const button = event.target && event.target.closest && event.target.closest("button, [role='button']");
    if (!button) return;
    const overlay = button.closest(".setup-overlay");
    if (!overlay) return;
    const text = (button.textContent || "").toLowerCase();
    const startsGame = /generar|empezar|iniciar|start|play|aplicar|aceptar|crear/.test(text);
    if (!startsGame) return;
    setTimeout(syncSetupState, 60);
    setTimeout(syncSetupState, 240);
  }

  updateViewportVars();

  document.addEventListener("DOMContentLoaded", function () {
    updateViewportVars();
    normalizeSetupDom();
    installOverlayObserver();
    syncSetupState();
    document.addEventListener("click", removeFirstRunAfterStart, true);
    setTimeout(function () {
      normalizeSetupDom();
      installOverlayObserver();
      syncSetupState();
    }, 350);
  });

  window.addEventListener("resize", syncSetupState, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(syncSetupState, 120);
    setTimeout(syncSetupState, 420);
  }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncSetupState, { passive: true });
    window.visualViewport.addEventListener("scroll", updateViewportVars, { passive: true });
  }
})();
