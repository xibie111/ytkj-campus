import {motionTiming} from './motion-timing.js';

export function bindMapScale(element) {
  const label=element.firstElementChild, line=element.lastElementChild;
  let metres=0;
  return pixelsPerMetre=>{
    if(!(pixelsPerMetre>0))return;
    const length=metres*pixelsPerMetre;
    // Leave a small margin on either side of a unit change so a slight pinch
    // reversal doesn't repeatedly swap the number. The bar always tracks scale.
    if(length<29||length>85){
      const limit=80/pixelsPerMetre;
      const decade=10**Math.floor(Math.log10(limit));
      const step=limit/decade;
      metres=(step>=5?5:step>=2?2:1)*decade;
      label.textContent=metres+' 米';
    }
    const transform='scaleX('+((metres*pixelsPerMetre)/85).toFixed(4)+')';
    if(line.style.transform!==transform)line.style.transform=transform;
  };
}

export function setMapNotice(node, message) {
  // Retain the text while the live region fades out. Its hidden state removes
  // it from navigation, and a new message can replace it immediately.
  if (message && node.textContent !== message) node.textContent = message;
  node.hidden = !message;
}

export function createMapTransition(stage, reducedMotion) {
  const roadNames=stage.querySelector('#plan-street-names');
  let transition;
  function finish() {
    if (!transition) return;
    const {front, back, animation, namesAnimation} = transition;
    transition = null;
    delete front.dataset.viewLeaving;
    delete back.dataset.viewPeer;
    delete stage.dataset.viewSwitching;
    if(roadNames){delete roadNames.dataset.viewLeaving;delete roadNames.dataset.viewPeer;}
    namesAnimation?.cancel();
    animation?.cancel();
  }
  function hold(front, back) {
    if (!stage.classList.contains('map-ready')) return;
    stage.dataset.viewSwitched = '';
    if (reducedMotion.matches || !front.animate) return;
    if (transition?.animation) {
      transition.animation.reverse();
      transition.namesAnimation?.reverse();
      return;
    }
    if (transition?.front === back) {
      // A second tap returned to the original surface before a new frame existed.
      finish();
      return;
    }
    finish();
    front.dataset.viewLeaving = '';
    back.dataset.viewPeer = '';
    if(front.id==='flat'&&roadNames&&!roadNames.hidden)roadNames.dataset.viewLeaving='';
    stage.dataset.viewSwitching = '';
    transition = {front, back, animation: null};
  }
  function painted() {
    if (!transition || transition.animation) return;
    // The new surface is already drawn underneath. Fade the composited old
    // surface without reading its pixels or drawing another WebGL frame.
    const current = transition;
    const frames=[
      {opacity: 1, transform: 'scale(1)'},
      {opacity: .3, transform: 'scale(1.012)', offset: .66},
      {opacity: 0, transform: 'scale(1.016)'}
    ];
    const timing={duration: motionTiming.enter, easing: motionTiming.settle, fill: 'both'};
    current.animation = current.front.animate(frames,timing);
    if(roadNames?.hasAttribute('data-view-leaving'))current.namesAnimation=roadNames.animate(frames,timing);
    else if(current.back.id==='flat'&&roadNames&&!roadNames.hidden)roadNames.dataset.viewPeer='';
    current.animation.onfinish = () => { if (transition === current) finish(); };
  }
  reducedMotion.addEventListener('change', event => { if (event.matches) finish(); });
  const surfaces = stage.querySelector('.map-surfaces');
  for (const event of ['pointerdown', 'wheel', 'keydown']) {
    surfaces.addEventListener(event, finish, {capture: true, passive: true});
  }
  return {hold, painted, finish};
}

export function finishMapLoad(stage, reducedMotion) {
  stage.querySelector('.map-surfaces').setAttribute('aria-busy', 'false');
  for (const id of ['plus','minus','home']) document.getElementById(id).disabled = false;
  const loading = document.getElementById('loading');
  if (reducedMotion.matches || !loading.animate) { loading.hidden = true; return; }
  loading.inert = true;
  const fade = loading.animate([{opacity: 1}, {opacity: 0}], {duration: motionTiming.quick, fill: 'both'});
  const finish = () => {
    loading.hidden = true;
    reducedMotion.removeEventListener('change', finish);
    fade.cancel();
  };
  fade.onfinish = finish;
  reducedMotion.addEventListener('change', finish);
}

export function showLoadError(error) {
  console.error(error);
  const loading = document.getElementById('loading');
  document.querySelector('.map-surfaces').setAttribute('aria-busy', 'false');
  loading.hidden = false;
  loading.inert = false;
  loading.textContent = '校园地图没能载入。';
  const retry = document.createElement('button');
  retry.textContent = '重新载入';
  retry.onclick = () => { loading.textContent = '正在重新载入校园地图…'; location.reload(); };
  loading.append(retry);
}
