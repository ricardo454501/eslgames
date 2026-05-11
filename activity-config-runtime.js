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
    return document.querySelector(".setup-overlay");
  }

  function isSetupOpen() {
    const overlay = getSetupOverlay();
    return !!(overlay && overlay.classList.contains("show"));
  }

  function syncSetupState() {
    updateViewportVars();
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
    observer.observe(overlay, { attributes: true, attributeFilter: ["class", "aria-hidden", "style"] });
  }

  function removeFirstRunAfterStart(event) {
    const button = event.target && event.target.closest && event.target.closest("button, [role='button']");
    if (!button) return;
    const overlay = button.closest(".setup-overlay");
    if (!overlay) return;
    const text = (button.textContent || "").toLowerCase();
    const startsGame = /generar|empezar|iniciar|start|play|aplicar|aceptar/.test(text);
    if (!startsGame) return;
    setTimeout(syncSetupState, 60);
    setTimeout(syncSetupState, 240);
  }

  updateViewportVars();

  document.addEventListener("DOMContentLoaded", function () {
    updateViewportVars();
    installOverlayObserver();
    syncSetupState();
    document.addEventListener("click", removeFirstRunAfterStart, true);
    setTimeout(function () {
      installOverlayObserver();
      syncSetupState();
    }, 350);
  });

  window.addEventListener("resize", updateViewportVars, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(syncSetupState, 120);
    setTimeout(syncSetupState, 420);
  }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncSetupState, { passive: true });
    window.visualViewport.addEventListener("scroll", updateViewportVars, { passive: true });
  }
})();
