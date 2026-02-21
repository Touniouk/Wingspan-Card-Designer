const ICON_BASE = 'assets/icons/';
const DEFAULT_SILHOUETTE = 'assets/silhouettes/southern-ground-hornbill-2.png';
let bgX = 0, bgY = 0, bgSize = 85, bgFlipped = false;
let silhouetteDataUrl = null;

/* ── Menu toggle (mobile) ── */
function toggleMenu() {
  document.getElementById('editor-panel').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}

function toggleSection(header) {
  if (window.innerWidth > 768) return;
  header.closest('.collapsible').classList.toggle('collapsed');
}

function initMobile() {
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.collapsible').forEach(c => c.classList.add('collapsed'));
  }
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.getElementById('editor-panel').classList.remove('open');
    document.getElementById('overlay').classList.remove('visible');
    document.querySelectorAll('.collapsible').forEach(c => c.classList.remove('collapsed'));
  }
});

/* ── Silhouette controls ── */
function applyBackground() {
  const urlInput = document.getElementById('f-silhouette-url').value.trim();
  const url = silhouetteDataUrl || urlInput || DEFAULT_SILHOUETTE;
  const layer = document.getElementById('silhouette-layer');
  layer.style.backgroundImage = `url('${url}')`;
  layer.style.backgroundSize = bgSize + '%';
  layer.style.backgroundPosition = `calc(50% + ${bgX}px) calc(50% + ${bgY}px)`;
  layer.style.transform = bgFlipped ? 'scaleX(-1)' : '';
}

function nudgeBg(dx, dy) {
  bgX += dx; bgY += dy;
  document.getElementById('bg-pos').textContent = `${bgX}px, ${bgY}px`;
  applyBackground();
}

function zoomBg(delta) {
  bgSize = Math.max(10, bgSize + delta);
  document.getElementById('bg-size').textContent = bgSize + '%';
  applyBackground();
}

function flipBg() {
  bgFlipped = !bgFlipped;
  document.getElementById('flip-btn').classList.toggle('active', bgFlipped);
  applyBackground();
}

function resetBg() {
  bgX = 0; bgY = 0; bgSize = 85; bgFlipped = false;
  document.getElementById('bg-pos').textContent = '0, 0';
  document.getElementById('bg-size').textContent = '85%';
  document.getElementById('flip-btn').classList.remove('active');
  applyBackground();
}

const _bgRemovalReady = import('https://esm.sh/@imgly/background-removal')
  .then(m => { if (typeof m.preload === 'function') m.preload(); return m; })
  .catch(() => null);

async function removeSilhouetteBg() {
  const btn = document.getElementById('remove-bg-btn');
  const urlInput = document.getElementById('f-silhouette-url');
  const source = silhouetteDataUrl || urlInput.value.trim();
  if (!source) { alert('Upload an image or paste a URL first.'); return; }
  btn.disabled = true;
  btn.textContent = 'Loading model…';
  try {
    const { removeBackground } = await _bgRemovalReady;
    btn.textContent = 'Processing…';
    const blob = await removeBackground(source);
    silhouetteDataUrl = URL.createObjectURL(blob);
    urlInput.value = '';
    applyBackground();
  } catch (e) {
    console.error(e);
    alert('Could not remove background.\n\n' + (e.message || e) + '\n\nIf this is a CORS error, the image host is blocking cross-origin access. Try saving the image locally and serving via a local server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Remove background';
  }
}

/* ── Download ── */
async function downloadCard() {
  const btn = document.getElementById('download-btn');
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  try {
    const canvas = await html2canvas(document.querySelector('.card-wrapper'), {
      useCORS: true,
      scale: 2,
      backgroundColor: null
    });
    const name = document.getElementById('f-name').value.trim() || 'bird-card';
    const link = document.createElement('a');
    link.download = name.replace(/\s+/g, '-').toLowerCase() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Download card';
  }
}

/* ── Icon helpers ── */
function iconPicture(name) {
  return `<picture class="icon-picture"><source type="image/webp" srcset="${ICON_BASE}${name}.webp"><source type="image/png" srcset="${ICON_BASE}${name}.png"><img class="icon-image" src="${ICON_BASE}${name}.png" alt="${name}" aria-label="${name} icon"></picture>`;
}

// Mirrors iconize.pipe.ts
function iconize(text, dark = false, glow = false) {
  if (!text) return '';
  const NON_SEP = '\\.|\,|;|\\-|_|\\)';
  let r = text
    .replace(new RegExp('\\[([a-z_-]+)\\](?!' + NON_SEP + ')', 'g'), (_, n) => iconPicture(n))
    .replace(new RegExp('\\[([a-z_-]+)\\](' + NON_SEP + ')', 'g'), (_, n, s) => `<span class="nobr">${iconPicture(n)}${s}</span>`);
  if (dark) {
    r = r.replace(/seed\.(png|webp)/g, 'seed-dark.$1');
  }
  if (glow) {
    const gm = { forest:'forest-glow', grassland:'grassland-glow', wetland:'wetland-glow',
      seed:'seed-glow', 'seed-dark':'seed-dark-glow', invertebrate:'invertebrate-glow',
      fish:'fish-glow', fruit:'fruit-glow', rodent:'rodent-glow', nectar:'nectar-glow', wild:'wild-glow' };
    Object.entries(gm).forEach(([k, v]) => {
      r = r.replace(new RegExp(k.replace(/-/g, '\\-') + '\\.(png|webp)', 'g'), (_, ext) => `${v}.${ext}`);
    });
  }
  return r;
}

/* ── Card update ── */
function updateCard() {
  // Identity
  const name       = document.getElementById('f-name').value;
  const native     = document.getElementById('f-native').value.trim();
  const scientific = document.getElementById('f-scientific').value;
  document.getElementById('card-name').textContent = name;
  const nativeEl = document.getElementById('card-native');
  nativeEl.textContent = native;
  nativeEl.style.display = native ? '' : 'none';
  document.getElementById('card-scientific').textContent = scientific;

  // Habitats
  const habs = ['forest','grassland','wetland'].filter(h => document.getElementById('f-hab-' + h).checked);
  document.getElementById('card-habitats').innerHTML = habs.map((h, i) => {
    const cls = habs.length === 3 && i === 1 ? 'habitat-wrapper habitat-2-3' : 'habitat-wrapper';
    return `<picture class="${cls}"><source type="image/webp" srcset="${ICON_BASE}${h}.webp"><source type="image/png" srcset="${ICON_BASE}${h}.png"><img src="${ICON_BASE}${h}.png" alt="${h}" class="habitat"></picture>`;
  }).join('');

  // Food cost
  const foods = ['invertebrate','seed','fish','fruit','rodent','nectar','wild'];
  const foodOr   = document.getElementById('f-food-or').checked;
  const foodStar = document.getElementById('f-food-star').checked;
  let foodIcons = [];
  foods.forEach(f => {
    const n = parseInt(document.getElementById('f-food-' + f).value) || 0;
    for (let i = 0; i < n; i++) foodIcons.push(`[${f}]`);
  });
  const foodStr = (foodStar ? '*' : '') + (foodIcons.join(foodOr ? '/' : '+') || '[no-food]');
  document.getElementById('card-food').innerHTML = iconize(foodStr);

  // VP
  document.getElementById('card-points').textContent = document.getElementById('f-vp').value;

  // Nest
  const nestType = document.getElementById('f-nest').value;
  const nestEl   = document.getElementById('card-nest');
  nestEl.innerHTML = nestType
    ? `<source type="image/webp" srcset="${ICON_BASE}${nestType}.webp"><source type="image/png" srcset="${ICON_BASE}${nestType}.png"><img src="${ICON_BASE}${nestType}.png" alt="${nestType}">`
    : '';

  // Eggs
  const eggCount = parseInt(document.getElementById('f-eggs').value) || 0;
  document.getElementById('card-eggs').innerHTML = Array.from({length: eggCount}, () =>
    `<picture class="egg"><source type="image/webp" srcset="${ICON_BASE}smallegg.webp"><source type="image/png" srcset="${ICON_BASE}smallegg.png"><img src="${ICON_BASE}smallegg.png" alt="egg"></picture>`
  ).join('');

  // Wingspan
  const ws = document.getElementById('f-wingspan').value.trim();
  document.getElementById('card-wingspan-value').textContent = ws ? ws + 'cm' : '';

  // Power color
  const color = document.getElementById('f-power-color').value;
  const powerRow = document.getElementById('card-power-row');
  powerRow.classList.remove('brown','pink','teal','yellow','white');
  if (color) powerRow.classList.add(color);

  // Power icons
  const iconMap = { predator:'predator', flocking:'flocking', bonus:'bonus_cards' };
  document.getElementById('card-power-icons').innerHTML = ['predator','flocking','bonus']
    .filter(k => document.getElementById('f-icon-' + k).checked)
    .map(k => `<span>${iconPicture(iconMap[k])}</span>`)
    .join('');

  // Power text + title
  const powerTitles = { brown:'WHEN ACTIVATED', white:'WHEN PLAYED', pink:'ONCE BETWEEN TURNS', teal:'ROUND END', yellow:'GAME END' };
  const isDark = !!(color && color !== 'white');
  const titleHtml = color ? `<span class="intro">${powerTitles[color] || ''}: </span>` : '';
  document.getElementById('card-power-text').innerHTML =
    titleHtml + `<span>${iconize(document.getElementById('f-power-text').value, isDark, isDark)}</span>`;

  // Flavor text
  document.getElementById('card-flavor').textContent = document.getElementById('f-flavor').value;

  // Continents
  const contMap = { na:'map_na', amn:'map_amn', ams:'map_ams', e:'map_e', a:'map_a', af:'map_af', o:'map_o', an:'map_an' };
  let contHtml = `<picture><source type="image/webp" srcset="${ICON_BASE}map.webp"><source type="image/png" srcset="${ICON_BASE}map.png"><img class="continent-base" src="${ICON_BASE}map.png" alt="map"></picture>`;
  Object.entries(contMap).forEach(([key, icon]) => {
    if (document.getElementById('f-cont-' + key).checked)
      contHtml += `<picture><source type="image/webp" srcset="${ICON_BASE}${icon}.webp"><source type="image/png" srcset="${ICON_BASE}${icon}.png"><img class="continent-top" src="${ICON_BASE}${icon}.png" alt="${key}"></picture>`;
  });
  document.getElementById('card-continent').innerHTML = contHtml;

  // Expansion indicator
  const exp = document.getElementById('f-expansion').value;
    // Custom expansion indicator
    if (exp === 'custom') {
      // Render custom buttons 
      document.getElementById('custom-expansion-options').style.display = '';
      document.getElementById('card-expansion').innerHTML = `<span id="custom-expansion-indicator" class="custom-expansion-indicator"></span>`;
      // Update custom indicator on input
      const updateCustomIndicator = () => {
        const indicator = document.getElementById('custom-expansion-indicator');
        const color = document.getElementById('f-expansion-custom-picker').value;
        const text = document.getElementById('f-expansion-custom-text').value.trim();
        indicator.style.backgroundColor = color;
        indicator.textContent = text;
      };
      document.getElementById('f-expansion-custom-picker').addEventListener('input', updateCustomIndicator);
      document.getElementById('f-expansion-custom-text').addEventListener('input', updateCustomIndicator);
      updateCustomIndicator();
    } else {
      // Render image-based indicator
      const expBase = 'assets/icons/expansion-indicators/';
      document.getElementById('card-expansion').innerHTML = exp
        ? `<picture><source type="image/webp" srcset="${expBase}${exp}.webp"><source type="image/png" srcset="${expBase}${exp}.png"><img class="expansion-indicator" src="${expBase}${exp}.png" alt="${exp}"></picture>`
        : '';
      // Hide custom buttons
      document.getElementById('custom-expansion-options').style.display = 'none';
    }
}

// Attach listeners
document.querySelectorAll('.editor-panel input:not(#f-silhouette-url), .editor-panel select, .editor-panel textarea')
  .forEach(el => { el.addEventListener('input', updateCard); el.addEventListener('change', updateCard); });
document.getElementById('f-silhouette-url').addEventListener('input', () => {
  silhouetteDataUrl = null;
  applyBackground();
});
document.getElementById('f-silhouette-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('f-silhouette-filename').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    silhouetteDataUrl = ev.target.result;
    document.getElementById('f-silhouette-url').value = '';
    applyBackground();
  };
  reader.readAsDataURL(file);
});

initMobile();
updateCard();
applyBackground();
