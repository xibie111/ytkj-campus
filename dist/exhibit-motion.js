import {motionTiming} from './motion-timing.js';

export function bindExhibitMotion(stage, reducedMotion) {
  const title = stage.querySelector('.map-title');
  const actions = title.querySelector('.hero-actions');
  if (!actions.animate) return;
  const masthead = document.querySelector('.masthead');
  const flat = stage.querySelector('#flat');
  const detail = stage.querySelector('#detail');
  const detailActive = () => !detail.hidden && !detail.inert;
  const docked = () => (stage.hasAttribute('data-exhibit') && stage.dataset.exhibit !== 'overview') ||
    !flat.hidden || detailActive();
  const measure = () => {
    const {left, top} = actions.getBoundingClientRect();
    return {left, top};
  };
  let observer, sizes, destination, wasDocked, wasDetailActive, stageWidth, stageHeight, flight;

  function finish() {
    const current = flight;
    flight = undefined;
    current?.cancel();
  }

  function offset() {
    const transform = getComputedStyle(actions).transform;
    return new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
  }

  function moveFrom(left, top, duration) {
    const dx = left - destination.left, dy = top - destination.top;
    const distance = Math.hypot(dx, dy);
    if (distance < .5) return;
    const next = actions.animate([
      {transform: `translate(${dx}px, ${dy}px)`}, {transform: 'none'}
    ], {duration: duration ?? (distance > 330 ? motionTiming.reveal : motionTiming.enter), easing: motionTiming.settle, fill: 'both'});
    flight = next;
    next.onfinish = () => { if (flight === next) finish(); };
  }

  function changeLayout() {
    const nextDocked = docked();
    const isDetailActive = detailActive();
    const dismissedDetail = wasDetailActive && !isDetailActive;
    wasDetailActive = isDetailActive;
    // Settle the controls after a dismissal so the next tap has a stable target.
    if (dismissedDetail) {
      finish();
      wasDocked = nextDocked;
      destination = measure();
      return;
    }
    if (nextDocked === wasDocked) return;
    wasDocked = nextDocked;
    stage.dataset.actionsMoved = '';
    const {left, top} = destination;
    const {e = 0, f = 0} = flight ? offset() : {};
    finish();
    destination = measure();
    moveFrom(left + e, top + f);
  }

  function trackSize(entries) {
    if (entries.some(entry => entry.target === stage) &&
        (stageWidth !== stage.clientWidth || stageHeight !== stage.clientHeight)) {
      stageWidth = stage.clientWidth;
      stageHeight = stage.clientHeight;
      finish();
    }
    const measured = measure();
    if (!flight) {
      destination = measured;
      return;
    }
    // Font and header changes can move the resting position under an active
    // transform. Retarget before painting so the controls stay where they were.
    const {e, f} = offset();
    const {left, top} = destination;
    destination = {left: measured.left - e, top: measured.top - f};
    if (Math.hypot(left - destination.left, top - destination.top) < .5) return;
    const remaining = flight.effect.getComputedTiming().endTime - (flight.currentTime || 0);
    finish();
    moveFrom(left + e, top + f, Math.max(motionTiming.press, remaining));
  }

  function syncPreference() {
    finish();
    observer?.disconnect();
    sizes?.disconnect();
    if (reducedMotion.matches) return;
    wasDocked = docked();
    wasDetailActive = detailActive();
    if (wasDocked) stage.dataset.actionsMoved = '';
    destination = measure();
    stageWidth = stage.clientWidth;
    stageHeight = stage.clientHeight;
    observer ??= new MutationObserver(changeLayout);
    observer.observe(stage, {attributeFilter: ['data-exhibit']});
    observer.observe(flat, {attributeFilter: ['hidden']});
    observer.observe(detail, {attributeFilter: ['hidden', 'inert']});
    sizes ??= new ResizeObserver(trackSize);
    sizes.observe(stage);
    sizes.observe(title);
    sizes.observe(actions);
    sizes.observe(masthead);
  }

  // Keep the clicked target, then give its panel the settled anchor position.
  actions.addEventListener('click', finish, {capture: true});
  reducedMotion.addEventListener('change', syncPreference);
  syncPreference();
}
