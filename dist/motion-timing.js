// CSS and scripted transitions use the same timing values, read once when the page opens.
const styles = getComputedStyle(document.documentElement);
const token = name => styles.getPropertyValue('--motion-' + name).trim();
const duration = name => parseFloat(token(name)) || 0;
export const motionTiming = {
  press: duration('press'),
  quick: duration('quick'),
  enter: duration('enter'),
  leave: duration('leave'),
  reveal: duration('reveal'),
  settle: token('settle') || 'linear',
  spring: token('spring') || 'linear',
  exit: token('exit') || 'linear'
};
