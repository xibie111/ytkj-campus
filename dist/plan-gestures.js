// Coordinates are CSS pixels relative to the plan canvas. A new gesture starts
// whenever a pointer joins or leaves so the remaining finger can continue to pan.
export function bindPlanGestures(canvas,{worldAt,zoomLevel,place,pick,interrupt=()=>{},end=()=>{}}) {
  const pointers=new Map();
  let base=null,tap=null;
  function local(event){
    const rect=canvas.getBoundingClientRect();
    return [event.clientX-rect.left,event.clientY-rect.top];
  }
  function pose(){
    const [a,b]=pointers.values();
    if(!b)return {point:a,distance:1};
    return {point:[(a[0]+b[0])/2,(a[1]+b[1])/2],distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]))};
  }
  function rebase(){
    if(!pointers.size){base=null;return}
    const {point,distance}=pose();
    base={anchor:worldAt(point),zoom:zoomLevel(),distance};
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    interrupt();
    const point=local(event);
    pointers.set(event.pointerId,point);
    tap=pointers.size===1?point:null;
    canvas.setPointerCapture(event.pointerId);
    rebase();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!base)return;
    const point=local(event);
    pointers.set(event.pointerId,point);
    if(tap&&Math.hypot(point[0]-tap[0],point[1]-tap[1])<=4)return;
    tap=null;
    const current=pose();
    place(base.anchor,current.point,base.zoom*current.distance/base.distance,pointers.size===1?'pan':'pinch');
  });
  function release(event){
    if(!pointers.has(event.pointerId))return;
    const point=local(event);
    const didTap=event.type==='pointerup'&&tap&&pointers.size===1&&Math.hypot(point[0]-tap[0],point[1]-tap[1])<=4;
    pointers.delete(event.pointerId);tap=null;rebase();
    if(!pointers.size)end();
    if(didTap)pick(worldAt(point));
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
  canvas.addEventListener('wheel',event=>{
    event.preventDefault();
    if(!event.deltaY)return;
    interrupt();
    const point=local(event),factor=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
    const steps=Math.max(-2,Math.min(2,-event.deltaY*factor/100));
    place(worldAt(point),point,zoomLevel()*1.18**steps);
    if(pointers.size)rebase();
  },{passive:false});
  function cancel(){
    if(!pointers.size)return;
    const captured=[...pointers.keys()];
    pointers.clear();base=tap=null;
    for(const id of captured)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    end();
  }
  // A second finger can press a control, or keyboard focus can leave the map,
  // while the first finger still owns pointer capture.
  for(const type of ['focusin','pointerdown'])document.addEventListener(type,event=>{
    if(event.target!==canvas)cancel();
  },{capture:true});
  canvas.addEventListener('keydown',event=>{
    if(event.key.startsWith('Arrow')||['+','-','='].includes(event.key))cancel();
  },{capture:true});
  window.addEventListener('popstate',cancel);
  window.addEventListener('hashchange',cancel);
  return {rebase,cancel};
}
