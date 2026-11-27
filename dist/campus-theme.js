(() => {
  const root = document.documentElement;
  const storageKey = 'penglai-campus.appearance';
  const minute = 60000;
  const day = 1440 * minute;
  const radians = Math.PI / 180;
  const huangbohai = root.dataset.campus === 'huangbohai';
  const latitude = (huangbohai ? 37.7322 : 37.80598) * radians;
  const longitude = huangbohai ? 120.9875 : 120.70525;
  const campusName = huangbohai ? '黄渤海' : '蓬莱';
  const timeFormat = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  let preference = 'auto';
  let timer;

  function readPreference() {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === 'dark' || stored === 'light' ? stored : 'auto';
    } catch { return 'auto'; }
  }

  // NOAA General Solar Position Calculations, with east-positive longitude.
  // Anchor each day in the campus time zone, regardless of the visitor's time zone.
  function solarTimes(now) {
    const local = new Date(now + 8 * 60 * minute);
    const year = local.getUTCFullYear();
    const yearStart = Date.UTC(year, 0, 1);
    const midnightUTC = Date.UTC(year, local.getUTCMonth(), local.getUTCDate());
    const phase = 2 * Math.PI * (midnightUTC - yearStart) / (Date.UTC(year + 1, 0, 1) - yearStart);
    const cos = Math.cos, sin = Math.sin;
    const equation = 229.18 * (.000075 + .001868*cos(phase) - .032077*sin(phase)
      - .014615*cos(2*phase) - .040849*sin(2*phase));
    const declination = .006918 - .399912*cos(phase) + .070257*sin(phase)
      - .006758*cos(2*phase) + .000907*sin(2*phase) - .002697*cos(3*phase) + .00148*sin(3*phase);
    const hourAngle = Math.acos(cos(90.833*radians) / (cos(latitude)*cos(declination))
      - Math.tan(latitude)*Math.tan(declination)) / radians;
    const noon = midnightUTC + (720 - 4*longitude - equation) * minute;
    return {
      sunrise: Math.round((noon - 4*hourAngle*minute) / minute) * minute,
      sunset: Math.round((noon + 4*hourAngle*minute) / minute) * minute,
      nextDate: midnightUTC + day - 8*60*minute
    };
  }

  function update() {
    const now = Date.now();
    const {sunrise, sunset, nextDate} = solarTimes(now);
    const daylight = now >= sunrise && now < sunset;
    const theme = preference === 'auto' ? (daylight ? 'light' : 'dark') : preference;
    if (root.dataset.theme !== theme) {
      root.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#191d20' : '#f8f7f4';
      window.dispatchEvent(new Event('campusthemechange'));
    }
    const choice = document.querySelector('#appearance input[value="' + preference + '"]');
    if (choice) {
      choice.checked = true;
      const times = campusName + ' · 日出 ' + timeFormat.format(sunrise) + ' / 日落 ' + timeFormat.format(sunset);
      document.getElementById('sunrise-time').textContent = timeFormat.format(sunrise);
      document.getElementById('sunset-time').textContent = timeFormat.format(sunset);
      document.querySelector('#appearance input[value="auto"]').parentElement.title = '自动切换（' + times + '）';
    }
    clearTimeout(timer);
    const next = now < sunrise ? sunrise : daylight ? sunset : nextDate;
    timer = setTimeout(update, next - now);
  }

  preference = readPreference();
  update();
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('appearance').addEventListener('change', event => {
      preference = event.target.value;
      try { localStorage.setItem(storageKey, preference); } catch {}
      update();
    });
    update();
  }, {once:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('pageshow', update);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      preference = readPreference();
      update();
    }
  });
})();
