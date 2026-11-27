(() => {
  const picker = document.querySelector('.campus-picker');
  const trigger = picker.querySelector('summary');
  const options = [...picker.querySelectorAll('a')];
  const backdrop = document.createElement('div');
  backdrop.className = 'campus-picker-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  function close() {
    picker.open = false;
    trigger.focus({preventScroll: true});
  }

  picker.addEventListener('toggle', () => {
    trigger.setAttribute('aria-expanded', String(picker.open));
    if (!picker.open) return;
    const plan = document.getElementById('plan').getAttribute('aria-pressed') === 'true'
      || new URLSearchParams(location.search).get('view') === 'plan';
    for (const link of options) {
      if (link.hasAttribute('aria-current')) continue;
      const url = new URL(link.href);
      if (plan) url.searchParams.set('view', 'plan');
      else url.searchParams.delete('view');
      link.href = url.href;
    }
  });
  picker.addEventListener('click', event => {
    if (event.target.closest('a[aria-current]')) {
      event.preventDefault();
      close();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (event.target !== backdrop && !picker.contains(event.target)) picker.open = false;
  });
  backdrop.addEventListener('pointerdown', event => event.preventDefault());
  backdrop.addEventListener('click', close);
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) picker.open = false;
  });
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker.open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    picker.open = true;
    const current = options.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? current + 1 : current < 0 ? options.length - 1 : current - 1;
    options[(next + options.length) % options.length].focus();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) picker.open = false;
  });
})();
