// Yantai Institute of Science and Technology, 13th Athletics Meeting, May 2024.
// 00:30.9 gives the two cross-pitch outlines. 00:25.2 shows the reverse angle.
export function drawTrainingCourts(ctx,field,lineWidth=.105) {
  const centerOffset=field.length*.206, halfWidth=10, end=20;
  const penaltyRadius=6, halfGoal=1.5;
  ctx.save();
  ctx.strokeStyle='#d6c963';
  ctx.lineWidth=lineWidth;
  for(const sign of [-1,1]) {
    ctx.save();
    ctx.translate(sign*centerOffset,0);
    ctx.strokeRect(-halfWidth,-end,2*halfWidth,2*end);
    ctx.beginPath();
    ctx.moveTo(-halfWidth,0);
    ctx.lineTo(halfWidth,0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0,0,3,0,2*Math.PI);
    ctx.stroke();
    for(const side of [-1,1]){
      ctx.save();
      ctx.scale(1,side);
      ctx.beginPath();
      ctx.arc(-halfGoal,end,penaltyRadius,Math.PI,1.5*Math.PI);
      ctx.lineTo(halfGoal,end-penaltyRadius);
      ctx.arc(halfGoal,end,penaltyRadius,-.5*Math.PI,0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}
