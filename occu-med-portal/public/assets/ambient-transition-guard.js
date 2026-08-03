(() => {
  const SOUNDTRACK_TITLE = 'How To Kurzgesagt by Epic Mountain';
  const PORTAL_VOLUME = 3;
  let iframe = null;
  let widget = null;
  let pausedForTransition = false;

  function getWidget() {
    const nextIframe = document.querySelector(`iframe[title="${SOUNDTRACK_TITLE}"]`);
    if (!nextIframe || !window.SC?.Widget) return null;

    if (nextIframe !== iframe) {
      iframe = nextIframe;
      widget = window.SC.Widget(nextIframe);
    }

    return widget;
  }

  function transitionIsOpen() {
    return Boolean(document.querySelector('.portal-launch-overlay .portal-close-button'));
  }

  function synchronizeSoundtrack() {
    const soundtrack = getWidget();
    if (!soundtrack) return;

    if (transitionIsOpen()) {
      // Enforce true silence for the entire transition, including its own sound effects.
      soundtrack.setVolume(0);
      soundtrack.pause();
      pausedForTransition = true;
      return;
    }

    if (pausedForTransition) {
      soundtrack.setVolume(PORTAL_VOLUME);
      soundtrack.play();
      pausedForTransition = false;
    }
  }

  const observer = new MutationObserver(synchronizeSoundtrack);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // The interval also prevents another listener from restarting the soundtrack
  // while a transition overlay is still open.
  window.setInterval(synchronizeSoundtrack, 100);
  document.addEventListener('pointerdown', () => queueMicrotask(synchronizeSoundtrack), true);
  document.addEventListener('keydown', () => queueMicrotask(synchronizeSoundtrack), true);
  window.addEventListener('load', synchronizeSoundtrack);
})();
