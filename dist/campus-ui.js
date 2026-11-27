import {motionTiming} from './motion-timing.js';

const element = id => document.getElementById(id);
const mobile = window.matchMedia('(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rail = element('rail');
const scrim = element('drawer-scrim');
const stage = element('stage');
const masthead = document.querySelector('.masthead');
const directoryButton = element('mobile-nav');
const closeDirectory = element('close-directory');
const search = element('place-search');
const layersButton = element('layers-button');
const layerPanel = element('layers-panel');
const detail = element('detail');
const credits = element('credits');
const viewport = window.visualViewport;
const panelAnimations = new Map();
const directoryAnimations = new Map();
const panelShapes = {
  side: {origin: 'top left', enter: 'translateY(-13px) scale(.97)', settle: 'translateY(2px)', exit: 'translateY(-8px) scale(.985)'},
  sheet: {origin: 'bottom center', enter: 'translateY(68px)', settle: 'translateY(-3px)', exit: 'translateY(52px)', duration: motionTiming.reveal},
  detail: {origin: 'bottom left', enter: 'translateY(16px) scale(.97)', settle: 'translateY(-2px)', exit: 'translateY(12px) scale(.985)'},
  help: {enter: 'translateY(14px) scale(.97)', settle: 'translateY(-2px)', exit: 'translateY(9px) scale(.985)'},
  scrim: {duration: motionTiming.leave}
};
let detailOrigin, detailId, detailContentMotion = [], detailSizeMotion = [];

const controlsChanged = () => stage.dispatchEvent(new Event('mapcontrolschange'));

function animatePanel(node, open, shape, animate = true) {
  const running = panelAnimations.get(node);
  const dialog = node === credits;
  const visible = dialog ? credits.open : !node.hidden;
  const shouldAnimate = animate && !reducedMotion.matches && typeof node.animate === 'function' && (open || visible);
  let start;
  if (running && shouldAnimate) {
    const current = getComputedStyle(node);
    start = {opacity: Number(current.opacity), transform: current.transform};
  }
  running?.animation.cancel();
  panelAnimations.delete(node);
  node.inert = !open;
  if (open) {
    if (dialog && !credits.open) credits.showModal();
    else node.hidden = false;
  }
  const settleVisibility = () => {
    if (dialog) {
      if (!open) credits.close();
    } else {
      node.hidden = !open;
      if (node === detail && !open) stopDetailMotion();
    }
  };
  if (!shouldAnimate) {
    settleVisibility();
    return;
  }
  const {origin = 'center', enter = 'none', settle = 'none', exit = 'none', duration = motionTiming.enter} = shape;
  const keyframes = open ? [
    {...(start || {opacity: 0, transform: enter}), easing: motionTiming.settle},
    {opacity: 1, transform: settle, offset: .72, easing: motionTiming.settle},
    {opacity: 1, transform: 'none'}
  ] : [
    start || {opacity: 1, transform: 'none'},
    {opacity: 0, transform: exit}
  ];
  for (const keyframe of keyframes) keyframe.transformOrigin = origin;
  const animation = node.animate(keyframes, {duration: open ? duration : motionTiming.leave, easing: open ? 'linear' : motionTiming.exit, fill: 'both'});
  const finish = () => {
    if (panelAnimations.get(node)?.animation !== animation) return;
    panelAnimations.delete(node);
    settleVisibility();
    animation.cancel();
    if (node !== scrim && !dialog) controlsChanged();
  };
  panelAnimations.set(node, {animation, finish});
  animation.addEventListener('finish', finish, {once: true});
}

function stopDetailSizeMotion() {
  for (const animation of detailSizeMotion) animation.cancel();
  detailSizeMotion = [];
}

function stopDetailMotion() {
  for (const animation of detailContentMotion) animation.cancel();
  detailContentMotion = [];
  stopDetailSizeMotion();
}

export function captureDetailHeight(id, animate = true) {
  if (!animate || reducedMotion.matches || detail.hidden || detailId === id ||
      !detail.animate || !CSS.supports('scale', '1 .9')) return;
  const style = getComputedStyle(detail);
  const scaleY = Number(style.getPropertyValue('scale').split(/\s+/)[1]) || 1;
  return detail.offsetHeight * scaleY;
}

function resizeDetail(previousHeight, children) {
  if (!previousHeight) return false;
  const height = detail.offsetHeight;
  if (!height || Math.abs(previousHeight - height) < 2) return false;
  const ratio = previousHeight / height;
  // Resize the border from the docked bottom edge, while leaving the new
  // layout available to focus, scroll and map labels from the first frame.
  const stops = Array.from({length: 9}, (_, step) => ratio ** (1 - step / 8));
  const frames = (origin, ratioFor) => stops.map(size => ({scale: `1 ${ratioFor(size)}`, transformOrigin: origin}));
  const timing = {duration: motionTiming.enter, easing: motionTiming.settle, fill: 'both'};
  const shell = detail.animate(frames('bottom left', size => size), timing);
  detailSizeMotion = [shell, ...children.map(child => child.animate(frames('top left', size => 1 / size), timing))];
  shell.addEventListener('finish', () => {
    if (detailSizeMotion[0] === shell) stopDetailSizeMotion();
  }, {once: true});
  return true;
}

export function showDetail(id, animate = true, previousHeight) {
  const opening = detail.hidden || detail.inert;
  if (opening) animatePanel(detail, true, panelShapes.detail, animate);
  detail.scrollTop = 0;
  if (detailId !== id) {
    stopDetailMotion();
    if (animate && !reducedMotion.matches && typeof detail.animate === 'function') {
      const children = [...detail.children].filter(child => !child.hidden);
      const resizing = resizeDetail(previousHeight, children);
      const content = children.filter(child => child.id !== 'close-detail');
      if (!opening || resizing) detailContentMotion = content.map((child, index) => child.animate(
        [{opacity: .16, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}],
        {duration: motionTiming.leave, delay: (resizing ? motionTiming.press : 0) + Math.min(index, 3) * 15,
          easing: motionTiming.settle, fill: 'backwards'}));
    }
  }
  detailId = id;
  controlsChanged();
}

export function hideDetail(animate = true) {
  if (detail.hidden || (detail.inert && animate)) return;
  detailId = null;
  animatePanel(detail, false, panelShapes.detail, animate);
  controlsChanged();
}

function updateDirectoryMotion(node, rise = 0) {
  if (directoryAnimations.has(node) || reducedMotion.matches || rail.inert || !rail.classList.contains('opened') || typeof node.animate !== 'function') return;
  const animation = node.animate([{opacity: .65, transform: `translateY(${rise}px)`}, {opacity: 1, transform: 'none'}],
    {duration: motionTiming.quick, easing: motionTiming.settle});
  directoryAnimations.set(node, animation);
  animation.addEventListener('finish', () => {
    if (directoryAnimations.get(node) === animation) directoryAnimations.delete(node);
  }, {once: true});
}

reducedMotion.addEventListener('change', event => {
  if (!event.matches) return;
  for (const {finish} of panelAnimations.values()) finish();
  stopDetailMotion();
  for (const animation of directoryAnimations.values()) animation.cancel();
  directoryAnimations.clear();
});

export const toolIcons = {
  atlas: '<path d="m2 14 10-9 10 9-10-4.4z" fill="currentColor" stroke="none"/><path d="m2 18 10-6.3L22 18l-10-3.4z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 5v4"/>'
};

const icons={info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10"/>',map:'<path d="m2 5 7-3 6 3 7-3v16l-7 3-6-3-7 3zM9 2v16m6-13v16"/>',fit:'<path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6"/><circle cx="12" cy="12" r="2"/>',list:'<path d="M3 6h18M3 12h18M3 18h18"/>',library:'<path d="m3 7 9-4 9 4H3zm1 13h16M6 10v7m4-7v7m4-7v7m4-7v7"/>',teaching:'<path d="M3 21V6h18v15M7 10h2m5 0h3m-10 4h2m5 0h3M10 21v-3h4v3"/>',sports:'<ellipse cx="12" cy="12" rx="10" ry="6"/><path d="M3 10v5c2 5 16 6 18 0v-5"/>',gate:'<path d="M2 18h20M4 17V6m3 11V4m10 13V4m3 13V6M8 12h8v5H8z"/>',plaza:'<path d="m2 13 10-6 10 6-10 6zM5 15l7 4 7-4m-7-8v8"/>',hall:'<path d="M3 19v-7a9 7 0 0 1 18 0v7zM2 19h20m-15-7v5m5-5v5m5-5v5"/>'};
Object.assign(icons,toolIcons,{
 dining:'<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18m10 0V3c-4 3-4 9 0 9"/>',
 village:'<path d="m2 12 6-5 6 5M4 11v9h8v-9m0-2 4-4 6 5m-7 10h5V9"/>',
 hill:'<path d="m2 19 7-12 5 8 3-5 5 9H2zm4-7 3 1 2-2"/>'
});
export function mapIcon(key){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[key]||icons.cube)+'</svg>'}
const layersOpen = () => layersButton.getAttribute('aria-expanded') === 'true';
const directoryOpen = () => rail.classList.contains('opened');

function setPanelStyle(panel, key, value) {
  if (panel.style.getPropertyValue(key) === value) return false;
  panel.style.setProperty(key, value);
  return true;
}

function positionLayers() {
  if (!layersOpen()) return false;
  const anchor = layersButton.getBoundingClientRect();
  const bounds = stage.getBoundingClientRect();
  const below = bounds.bottom - anchor.bottom - 19;
  const above = anchor.top - bounds.top - 19;
  const openAbove = below < layerPanel.scrollHeight && above > below;
  const side = openAbove ? 'above' : 'below';
  const right = Math.min(0, anchor.right - bounds.left - layerPanel.offsetWidth - 12);
  const sideChanged = layerPanel.dataset.side !== side;
  const heightChanged = setPanelStyle(layerPanel, 'max-height', Math.max(48, openAbove ? above : below) + 'px');
  const rightChanged = setPanelStyle(layerPanel, 'right', right + 'px');
  if (sideChanged) layerPanel.dataset.side = side;
  return sideChanged || heightChanged || rightChanged;
}

function layers(open) {
  if (layersOpen() === open) return;
  layersButton.setAttribute('aria-expanded', String(open));
  if (open) {
    layerPanel.hidden = false;
    positionLayers();
  }
  const above = layerPanel.dataset.side === 'above';
  animatePanel(layerPanel, open, {
    origin: above ? 'bottom right' : 'top right',
    enter: `translateY(${above ? 8 : -8}px) scale(.97)`, settle: `translateY(${above ? -1 : 1}px)`,
    exit: `translateY(${above ? 5 : -5}px) scale(.985)`
  });
  if (open) layerPanel.querySelector('button')?.focus({preventScroll:true});
  controlsChanged();
}

function positionDirectory() {
  if (!directoryOpen()) return false;
  const frame = stage.getBoundingClientRect();
  if (mobile.matches) {
    const inset = viewport?.scale === 1 ? Math.max(0, frame.bottom - viewport.offsetTop - viewport.height) : 0;
    return setPanelStyle(rail, '--directory-inset-bottom', inset + 'px');
  }
  const anchor = directoryButton.getBoundingClientRect();
  const left = Math.max(12, Math.min(anchor.left - frame.left, frame.width - rail.offsetWidth - 12));
  const top = Math.min(anchor.bottom - frame.top + 9, Math.max(12, frame.height - 230));
  const leftChanged = setPanelStyle(rail, '--directory-left', left + 'px');
  const topChanged = setPanelStyle(rail, '--directory-top', top + 'px');
  return leftChanged || topChanged;
}

function setDirectoryMode(animate) {
  const modal = directoryOpen() && mobile.matches;
  if (modal !== (!scrim.hidden && !scrim.inert)) animatePanel(scrim, modal, panelShapes.scrim, animate);
  stage.inert = modal;
  masthead.inert = modal;
  if (modal) {
    rail.setAttribute('role', 'dialog');
    rail.setAttribute('aria-modal', 'true');
  } else {
    rail.removeAttribute('role');
    rail.removeAttribute('aria-modal');
  }
}

export function menu(open, restoreFocus = true) {
  if (directoryOpen() === open) return;
  animatePanel(rail, open, mobile.matches ? panelShapes.sheet : panelShapes.side);
  rail.classList.toggle('opened', open);
  directoryButton.setAttribute('aria-expanded', String(open));
  setDirectoryMode(true);
  if (open) {
    layers(false);
    positionDirectory();
    (mobile.matches ? closeDirectory : search).focus({preventScroll: true});
  } else if (restoreFocus) {
    directoryButton.focus({preventScroll: true});
  }
  controlsChanged();
}

export function focusDetail(trigger = document.activeElement) {
  if (trigger === directoryButton || rail.contains(trigger)) detailOrigin = directoryButton;
  else if (trigger?.matches('.tag')) detailOrigin = trigger;
  else if (!detail.contains(trigger)) {
    detailOrigin = null;
    return;
  }
  element('detail-name').focus({preventScroll: true});
}

export function restoreDetailFocus() {
  const origin = detailOrigin?.getClientRects().length ? detailOrigin : directoryButton;
  detailOrigin = null;
  origin.focus({preventScroll: true});
}

// When history dismisses a place, keep keyboard navigation at the control
// that opened it. Leave focus alone if the visitor was using another control.
export function restorePlaceFromHistory(restoreRoute) {
  const readingDetail = detail.contains(document.activeElement);
  restoreRoute(true);
  if (readingDetail && (detail.hidden || detail.inert)) restoreDetailFocus();
}

directoryButton.addEventListener('click', () => menu(!directoryOpen()));
closeDirectory.addEventListener('click', () => menu(false));
scrim.addEventListener('click', () => menu(false));
function updateDirectoryTrigger() {
  if (mobile.matches) directoryButton.setAttribute('aria-haspopup', 'dialog');
  else directoryButton.removeAttribute('aria-haspopup');
}
mobile.addEventListener('change', () => {
  const focused = document.activeElement;
  panelAnimations.get(rail)?.finish();
  panelAnimations.get(scrim)?.finish();
  setDirectoryMode(false);
  updateDirectoryTrigger();
  if (directoryOpen()) {
    positionDirectory();
    if (!rail.contains(focused) || !focused.getClientRects().length) {
      (mobile.matches ? closeDirectory : search).focus({preventScroll: true});
    }
  }
  controlsChanged();
});
updateDirectoryTrigger();
let panelPositionFrame;
function requestPanelPositions() {
  if (panelPositionFrame || (!directoryOpen() && !layersOpen())) return;
  panelPositionFrame = requestAnimationFrame(() => {
    panelPositionFrame = null;
    const directoryMoved = positionDirectory();
    const layersMoved = positionLayers();
    if (directoryMoved || layersMoved) controlsChanged();
  });
}
window.addEventListener('resize', requestPanelPositions);
viewport?.addEventListener('resize', requestPanelPositions);
viewport?.addEventListener('scroll', requestPanelPositions);
new MutationObserver(requestPanelPositions).observe(stage, {
  attributes: true,
  attributeFilter: ['data-exhibit']
});
layersButton.addEventListener('click', () => layers(!layersOpen()));
element('sources').addEventListener('click', () => {
  if (!credits.open) animatePanel(credits, true, panelShapes.help);
});
function closeHelp() {
  if (credits.open && !credits.inert) animatePanel(credits, false, panelShapes.help);
}
element('close-sources').addEventListener('click', closeHelp);
credits.addEventListener('click', event => {
  if (event.target !== credits) return;
  const {left, right, top, bottom} = credits.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) closeHelp();
});
credits.addEventListener('cancel', event => {
  event.preventDefault();
  closeHelp();
});
function dismissOutsidePanel(target) {
  if (layersOpen() && !target.closest('.layer-tool')) layers(false);
  if (!mobile.matches && directoryOpen() && !rail.contains(target) && !directoryButton.contains(target)) {
    menu(false, false);
  }
}
document.addEventListener('pointerdown', event => dismissOutsidePanel(event.target));
document.addEventListener('focusin', event => dismissOutsidePanel(event.target));
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || credits.open) return;
  if (!directoryButton.disabled && event.key.toLowerCase() === 'k' &&
      (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey &&
      !event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) {
    event.preventDefault();
    if (!directoryOpen()) menu(true);
    search.focus({preventScroll: true});
    return;
  }
  if (event.key === 'Tab' && directoryOpen() && mobile.matches) {
    const choices = [...rail.querySelectorAll(':is(button:not(:disabled),input:not(:disabled),a[href]):not([hidden])')];
    const first = choices.find(control => control.getClientRects().length);
    const last = choices.findLast(control => control.getClientRects().length);
    const active = document.activeElement;
    if (first && (!rail.contains(active) || active === (event.shiftKey ? first : last))) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
  if (event.key !== 'Escape') return;
  if (layersOpen()) {
    event.preventDefault();
    layers(false);
    layersButton.focus();
  } else if (directoryOpen()) {
    event.preventDefault();
    menu(false);
  } else if (!detail.hidden && !detail.inert && detail.contains(event.target)) {
    event.preventDefault();
    element('close-detail').click();
  }
});

const searchWords = value => value.normalize('NFKC').toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);

function searchMatch(term) {
  const startsWithDigit = /^\d/.test(term);
  const endsWithDigit = /\d$/.test(term);
  if (!startsWithDigit && !endsWithDigit) return text => text.includes(term);
  const literal = term.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  const before = startsWithDigit ? '(?:^|\\D)' : '';
  const after = endsWithDigit ? '(?!\\d)' : '';
  const pattern = new RegExp(before + literal + after);
  return text => pattern.test(text);
}

function searchScore(name, keywords, query, matchQuery, matchTerms) {
  if (name === query) return 3;
  if (matchQuery(name)) return 2;
  if (matchQuery(keywords)) return 1;
  return matchTerms.every(matches => matches(keywords)) ? 0 : -1;
}

export function setupDirectory(rows, groupButtons, preferredResults, firstPlaces = []) {
  const count = element('place-count');
  const clearButton = element('clear-search');
  const empty = element('empty-results');
  const landmarks = element('landmarks');
  const entries = [...rows].map(([id, button]) => ({
    id,
    button,
    category: button.hasAttribute('data-search-only') ? null : button.dataset.group,
    name: searchWords(button.textContent).join(''),
    keywords: searchWords(button.dataset.search).join('')
  }));
  let group = 'campus';
  let results = [];

  function filter(animate = false) {
    const terms = searchWords(search.value);
    const query = terms.join('');
    const matchQuery = searchMatch(query);
    const matchTerms = terms.map(searchMatch);
    const preferred = query ? preferredResults?.get(query) ?? [] : firstPlaces;
    const ranked = [];
    const previousResults = results;
    const focused = document.activeElement;
    const focusedResult = landmarks.contains(focused) ? focused : null;
    for (const {id, button, name, keywords, category} of entries) {
      const score = query ? searchScore(name, keywords, query, matchQuery, matchTerms) : (category === group ? 0 : -1);
      if (button.hidden !== (score < 0)) button.hidden = score < 0;
      if (score >= 0) {
        const preference = preferred.indexOf(id);
        ranked.push({button, score, priority: preference < 0 ? 0 : preferred.length - preference});
      }
    }
    ranked.sort((first, second) => second.priority - first.priority || second.score - first.score);
    results = ranked.map(({button}) => button);
    const resultsChanged = previousResults.length !== results.length || results.some((button, index) => button !== previousResults[index]);
    // Keep the visual order, Tab order and the Enter key's first result in sync.
    if (resultsChanged) {
      let cursor = landmarks.firstElementChild;
      for (const button of results) {
        while (cursor?.hidden) cursor = cursor.nextElementSibling;
        if (button === cursor) cursor = cursor.nextElementSibling;
        else landmarks.insertBefore(button, cursor);
      }
    }
    if (focusedResult && !rail.inert && (focusedResult.hidden || document.activeElement !== focusedResult)) {
      (focusedResult.hidden ? search : focusedResult).focus({preventScroll: true});
    }
    for (const button of groupButtons) {
      button.setAttribute('aria-pressed', String(!query && button.dataset.group === group));
    }
    const status = query ? results.length + ' 个结果' : results.length + ' 项';
    if (count.textContent !== status) {
      count.textContent = status;
      if (animate) updateDirectoryMotion(count);
    }
    clearButton.hidden = !search.value;
    empty.hidden = results.length !== 0;
    landmarks.scrollTop = 0;
    if (animate && resultsChanged) {
      const changedScreen = Boolean(previousResults.length) !== Boolean(results.length);
      if (changedScreen || !query) updateDirectoryMotion(results.length ? landmarks : empty, changedScreen ? 4 : 0);
    }
  }

  function clearSearch() {
    search.value = '';
    filter(true);
    search.focus({preventScroll: true});
  }
  search.addEventListener('input', event => {
    if (!event.isComposing) filter(true);
  });
  search.addEventListener('compositionend', () => filter(true));
  clearButton.addEventListener('click', clearSearch);
  search.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape' && search.value) {
      event.preventDefault();
      clearSearch();
    } else if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      results[0].focus();
    } else if (event.key === 'Enter' && searchWords(search.value).length && results.length) {
      event.preventDefault();
      results[0].click();
    }
  });
  landmarks.addEventListener('keydown', event => {
    const index = results.indexOf(event.target);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    let next;
    switch (event.key) {
      case 'ArrowUp': next = results[index-1] || search; break;
      case 'ArrowDown': next = results[index+1] || event.target; break;
      case 'Home': next = results[0]; break;
      case 'End': next = results.at(-1); break;
      default: return;
    }
    event.preventDefault();
    next.focus();
  });
  search.disabled = false;
  directoryButton.disabled = false;
  return value => {
    const changed = group !== value || Boolean(search.value);
    group = value;
    search.value = '';
    filter(changed);
  };
}
