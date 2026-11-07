import './scroll.js';

if (!('CSSViewTransitionRule' in globalThis)) {
  document.documentElement.classList.add('page-motion-fallback');
}

const search = document.querySelector('#catalog-search');
if (search) {
  const sort = document.querySelector('#catalog-sort');
  const grid = document.querySelector('.product-grid');
  const empty = document.querySelector('#catalog-empty');
  const normalize = (value) => value.toLowerCase().replaceAll('ё', 'е').replace(/[^\p{L}\d]+/gu, ' ').trim();
  const compareNames = new Intl.Collator('ru', { numeric: true }).compare;
  const entries = [...grid.querySelectorAll('[data-catalog-item]')].map((card, index) => ({
    card, index, name: card.dataset.name, text: normalize(card.dataset.search),
    price: card.dataset.price === '' ? null : Number(card.dataset.price),
  }));
  function compare(a, b) {
    if (sort.value === 'default') return a.index - b.index;
    const direction = sort.value.endsWith('-up') ? 1 : -1;
    if (sort.value.startsWith('name')) return direction * compareNames(a.name, b.name);
    if (a.price == null || b.price == null) return Number(a.price == null) - Number(b.price == null) || compareNames(a.name, b.name);
    return direction * (a.price - b.price) || compareNames(a.name, b.name);
  }
  function updateCatalog() {
    const terms = normalize(search.value).split(' ');
    const ordered = [...entries].sort(compare);
    for (const { card, text } of ordered) {
      card.hidden = !terms.every((term) => text.includes(term));
      grid.append(card);
    }
    empty.hidden = ordered.some(({ card }) => !card.hidden);
  }
  search.addEventListener('input', updateCatalog);
  sort.addEventListener('change', updateCatalog);
  updateCatalog();
}

const showcase = document.querySelector('.hero-showcase');
const heroNext = showcase?.querySelector('[data-hero-next]');
if (heroNext) {
  const slides = [...showcase.querySelectorAll('[data-hero-slide]')];
  const position = showcase.querySelector('[data-hero-position]');
  const controls = showcase.querySelector('.hero-controls');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let timer;
  function move(step) {
    slides[active].hidden = true;
    active = (active + slides.length + step) % slides.length;
    slides[active].hidden = false;
    position.textContent = (active + 1) + ' / ' + slides.length;
  }
  function schedule() {
    clearTimeout(timer);
    if (motion.matches || document.hidden || showcase.matches(':hover, :focus-within')) return;
    timer = setTimeout(() => {
      position.setAttribute('aria-live', 'off');
      move(1);
      schedule();
    }, 6000);
  }
  function manual(step) {
    position.setAttribute('aria-live', 'polite');
    move(step);
    schedule();
  }
  heroNext.addEventListener('click', () => manual(1));
  showcase.querySelector('[data-hero-prev]').addEventListener('click', () => manual(-1));
  showcase.addEventListener('pointerenter', schedule);
  showcase.addEventListener('pointerleave', schedule);
  showcase.addEventListener('focusin', schedule);
  showcase.addEventListener('focusout', () => queueMicrotask(schedule));
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', schedule);
  controls.hidden = false;
  schedule();
}

const variantSelect = document.querySelector('#variant-select');
if (variantSelect) {
  const price = document.querySelector('#detail-price');
  const image = document.querySelector('#detail-image');
  const quote = document.querySelector('#detail-quote');
  const caption = document.querySelector('.detail-figure figcaption');
  const original = { price: price.textContent, image: image.getAttribute('src'), srcset: image.srcset, quote: quote.getAttribute('href') };
  variantSelect.addEventListener('change', () => {
    const option = variantSelect.selectedOptions[0];
    price.textContent = option.dataset.price ?? original.price;
    const nextImage = option.dataset.image;
    const nextLarge = option.dataset.imageLarge;
    image.src = nextImage ?? original.image;
    image.srcset = nextImage ? (nextLarge ? nextImage + ' 480w, ' + nextLarge + ' 960w' : '') : original.srcset;
    caption.hidden = !(nextImage ? nextLarge : original.srcset);
    quote.href = variantSelect.value === '' ? original.quote : original.quote + '&variant=' + variantSelect.value;
  });
}

const quoteKey = 'uraltech-quote-v1';
const maxItems = 30;
function readQuote() {
  try {
    const items = JSON.parse(localStorage.getItem(quoteKey) ?? '[]');
    return Array.isArray(items) ? items.filter((item) => item && typeof item.product === 'string' &&
      typeof item.variant === 'string' && Number.isInteger(item.quantity) &&
      item.quantity >= 1 && item.quantity <= 100000).slice(0, maxItems) : [];
  } catch { return []; }
}

function updateCounts(items) {
  for (const count of document.querySelectorAll('[data-quote-count]')) {
    count.textContent = items.length;
    count.setAttribute('aria-label', 'Позиций в подборке: ' + items.length);
    count.hidden = items.length === 0;
  }
}

function saveQuote(items) {
  let persisted = false;
  try {
    localStorage.setItem(quoteKey, JSON.stringify(items));
    persisted = true;
  } catch {}
  updateCounts(items);
  return persisted;
}

function addToQuote(items, product, variant = '') {
  if (items.some((item) => item.product === product && item.variant === variant)) return true;
  if (items.length >= maxItems) return false;
  items.push({ product, variant, quantity: 1 });
  return true;
}

updateCounts(readQuote());
window.addEventListener('storage', (event) => {
  if (event.key === quoteKey) updateCounts(readQuote());
});

function selectedVariant(link) {
  return link.hasAttribute('data-quote-detail') ? (variantSelect?.value ?? '') : (link.dataset.quoteVariant ?? '');
}

for (const link of document.querySelectorAll('[data-quote-add]')) {
  const label = link.firstChild;
  const initialLabel = label.textContent;
  function repaint(items = readQuote()) {
    const added = items.some((item) => item.product === link.dataset.quoteAdd && item.variant === selectedVariant(link));
    link.classList.toggle('is-added', added);
    label.textContent = added ? 'В подборке ✓' : initialLabel;
  }
  repaint();
  if (link.hasAttribute('data-quote-detail')) variantSelect?.addEventListener('change', () => repaint());
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const items = readQuote();
    if (addToQuote(items, link.dataset.quoteAdd, selectedVariant(link))) {
      if (!saveQuote(items)) return location.assign(link.href);
      repaint(items);
    } else {
      location.assign(new URL('./request/', import.meta.url));
    }
  });
}

const form = document.querySelector('#request-form');
if (form) {
  const query = new URLSearchParams(location.search);
  const editor = form.querySelector('[data-quote-editor]');
  const rows = form.querySelector('#quote-rows');
  const add = form.querySelector('#quote-new');
  const status = form.querySelector('.form-status');
  const submit = form.querySelector('button[type=submit]');
  let catalog = [];
  let items = readQuote();
  let requestKey = '';
  let previousFields = '';
  const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
  const attributionKey = 'uraltech-attribution';

  function labeled(label, input) {
    const element = document.createElement('label');
    element.append(label, input);
    return element;
  }

  function renderRows(focusIndex = -1) {
    rows.replaceChildren();
    add.disabled = items.length >= maxItems;
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'quote-row';
      const model = document.createElement('select');
      model.required = true;
      model.append(new Option('Выберите модель', ''), ...catalog.map(({ id, title }) => new Option(title, id)));
      model.value = item.product;
      const choices = catalog.find((product) => product.id === item.product)?.variants ?? [];
      const variant = document.createElement('select');
      variant.append(new Option('Уточнить при заказе', ''), ...choices.map(({ id, name }) => new Option(name, id)));
      variant.value = item.variant;
      variant.disabled = choices.length === 0;
      const quantity = document.createElement('input');
      Object.assign(quantity, { type: 'number', min: '1', max: '100000', value: item.quantity, required: true });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'quote-remove';
      remove.setAttribute('aria-label', 'Убрать позицию ' + (index + 1));
      remove.textContent = '×';
      row.append(labeled('Модель', model), labeled('Исполнение', variant), labeled('Кол-во', quantity), remove);
      rows.append(row);
      model.addEventListener('change', () => {
        item.product = model.value;
        item.variant = '';
        saveQuote(items);
        renderRows(index);
      });
      variant.addEventListener('change', () => {
        item.variant = variant.value;
        saveQuote(items);
      });
      quantity.addEventListener('input', () => {
        item.quantity = quantity.validity.valid ? Number(quantity.value) : 0;
        if (item.quantity) saveQuote(items);
      });
      remove.addEventListener('click', () => {
        items.splice(index, 1);
        saveQuote(items);
        renderRows(Math.min(index, items.length - 1));
        if (!items.length) add.focus();
      });
      if (index === focusIndex) model.focus();
    });
  }

  submit.disabled = true;
  fetch(new URL('./catalog-variants.json', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error();
    return response.json();
  }).then((data) => {
    catalog = data;
    const available = new Map(catalog.map((item) => [item.id, item]));
    const before = items.length;
    items = items.filter((item) => available.has(item.product));
    if (before !== items.length) {
      status.hidden = false;
      status.textContent = 'Некоторые сохранённые модели больше недоступны в каталоге.';
    }
    const incoming = available.get(query.get('product'));
    if (incoming) {
      const variant = incoming.variants.some((item) => item.id === query.get('variant')) ? query.get('variant') : '';
      addToQuote(items, incoming.id, variant);
    }
    for (const item of items) {
      if (!available.get(item.product).variants.some((variant) => variant.id === item.variant)) item.variant = '';
    }
    if (saveQuote(items) && incoming) {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('product');
      cleanUrl.searchParams.delete('variant');
      history.replaceState(null, '', cleanUrl);
    }
    renderRows();
    editor.hidden = false;
    submit.disabled = false;
  }).catch(() => {
    status.hidden = false;
    status.classList.add('error');
    status.textContent = 'Не удалось загрузить подборку. Обновите страницу или укажите оборудование в комментарии.';
    submit.disabled = false;
  });

  add.addEventListener('click', () => {
    if (items.length >= maxItems) return;
    items.push({ product: '', variant: '', quantity: 1 });
    renderRows(items.length - 1);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    if (form.hasAttribute('data-demo')) {
      status.hidden = false;
      status.classList.remove('error');
      status.textContent = 'Тестовая отправка прошла. Данные никуда не переданы.';
      return;
    }
    if (editor.hidden && !form.elements.message.value.trim()) {
      status.hidden = false;
      status.classList.add('error');
      status.textContent = 'Укажите оборудование в комментарии или обновите страницу.';
      return;
    }
    const fields = new URLSearchParams(new FormData(form));
    fields.set('items', JSON.stringify(editor.hidden ? [] : items));
    try {
      const recorded = JSON.parse(sessionStorage.getItem(attributionKey) ?? '{}');
      for (const key of params) if (recorded[key]) fields.set(key, recorded[key]);
    } catch {}
    const payload = fields.toString();
    if (previousFields !== payload) requestKey = globalThis.crypto?.randomUUID?.() ?? '';
    previousFields = payload;
    fields.set('requestKey', requestKey);
    const controls = [...form.elements].filter((control) => !control.disabled);
    controls.forEach((control) => { control.disabled = true; });
    status.hidden = false;
    status.classList.remove('error');
    status.textContent = 'Отправляем заявку…';
    let accepted = false;
    try {
      const response = await fetch(form.action, { method: 'POST', body: fields, headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      status.textContent = 'Заявка принята. Номер обращения — ' + result.id + '.';
      form.reset();
      items = [];
      saveQuote(items);
      requestKey = '';
      previousFields = '';
      accepted = true;
      form.dispatchEvent(new CustomEvent('uraltech:request-sent', { bubbles: true }));
    } catch (error) {
      status.classList.add('error');
      status.textContent = error instanceof TypeError ? 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.' : error.message;
    } finally {
      controls.forEach((control) => { control.disabled = false; });
      if (accepted) renderRows();
    }
  });
}

try {
  const query = new URLSearchParams(location.search);
  const names = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
  const tags = Object.fromEntries(names.filter((name) => query.get(name)).map((name) => [name, query.get(name).slice(0, 300)]));
  if (Object.keys(tags).length) sessionStorage.setItem('uraltech-attribution', JSON.stringify(tags));
} catch {}

