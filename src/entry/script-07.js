
/* Mobile workspace v7. The original controls are moved, never cloned: their live
   input handlers and scientific state are shared with the unchanged v2 app. Every
   move has a placeholder, so crossing back to desktop restores the exact DOM. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const phone = matchMedia('(max-width:900px)');
  const landscape = matchMedia('(max-width:900px) and (max-height:500px) and (min-aspect-ratio:6/5)');
  const app = document.querySelector('.app');
  let active = false, cleanup = null;

  function enter() {
    if (active) return;
    active = true;
    const slots = [], generated = [], pages = [], scrolls = new Map();
    let current = '', lastLesson = '', collapsed = false, size = null, preferredSize = null, frame = 0, drag = null, suppressClick = false;
    const make = (tag, cls, parent) => {
      const el = document.createElement(tag); el.className = cls;
      if (parent) parent.append(el);
      return el;
    };
    const move = (node, parent) => {
      const slot = document.createComment('v7 mobile position');
      node.before(slot); slots.push({node, slot}); parent.append(node);
    };
    const fold = (parent, title, nodes, first = false) => {
      const details = make('details', 'mobile-accordion');
      const summary = make('summary', '', details); summary.textContent = title;
      if (first) parent.insertBefore(details, parent.firstChild); else parent.append(details);
      generated.push(details);
      nodes.forEach(node => move(node, details));
      return details;
    };

    const toolbar = make('div', 'mobile-workspace mobile-toolbar', app);
    const lessonSelect = make('select', '', toolbar);
    lessonSelect.id = 'mobileLesson'; lessonSelect.setAttribute('aria-label', 'Lesson');
    const views = make('div', 'seg', toolbar); views.setAttribute('aria-label', 'Visualization');
    const targetButton = make('button', '', views);
    targetButton.type = 'button'; targetButton.textContent = 'Target'; targetButton.dataset.mobileView = 'target'; targetButton.hidden = true;
    targetButton.addEventListener('click', () => { setCollapsed(true); setResult('target'); });
    const resultButtons = ['3D view', 'Graphs'].map((label, i) => {
      const b = make('button', '', views); b.type = 'button'; b.textContent = label;
      b.dataset.mobileView = i ? 'graph' : 'scene';
      b.addEventListener('click', () => setResult(b.dataset.mobileView));
      return b;
    });
    const contextbar = make('div', 'mobile-workspace mobile-contextbar');
    contextbar.setAttribute('role', 'region'); contextbar.setAttribute('aria-label', 'Lesson guide');
    app.before(contextbar);
    const guideButton = make('button', 'btn-quiet mobile-guide-button', contextbar);
    guideButton.id = 'mobileGuide'; guideButton.type = 'button'; guideButton.textContent = 'Guide';
    guideButton.setAttribute('aria-controls', 'mobilePage-guide');
    guideButton.addEventListener('click', () => current === 'guide' && !collapsed ? setCollapsed(true) : choose('guide'));
    const tray = make('section', 'mobile-workspace mobile-tray', app);
    tray.id = 'mobileTray'; tray.setAttribute('aria-label', 'Control tray');
    const handle = make('button', 'mobile-fold', tray);
    handle.type = 'button'; handle.id = 'mobileFold';
    handle.setAttribute('aria-controls', 'mobileTrayContent');
    handle.title = 'Drag to resize; tap to hide or show the controls';
    handle.innerHTML = '<span class="mobile-fold-title">Controls</span><span class="mobile-fold-action"><span class="mobile-fold-word">Hide</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    const tabs = make('div', 'mobile-tray-tabs', tray);
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Control groups');
    const content = make('div', 'mobile-tray-content', tray); content.id = 'mobileTrayContent';

    function addPage(key, title, nodes, available = () => true) {
      const button = make('button', '', tabs); button.type = 'button';
      button.id = `mobileTab-${key}`; button.textContent = title; button.dataset.mobileTab = key;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', `mobilePage-${key}`);
      const panel = make('section', 'mobile-tray-page', content);
      panel.id = `mobilePage-${key}`; panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id); panel.hidden = true;
      nodes.forEach(node => move(node, panel));
      const page = {key, title, button, panel, available}; pages.push(page);
      button.addEventListener('click', () => choose(key));
      return page;
    }
    const group = key => document.querySelector(`[data-group="${key}"]`);
    const groups = ['museum', 'design', 'harmonic', 'plane', 'particle', 'series', 'cluster', 'msorders', 'light'];
    const titles = {museum:'Exhibit details', design:'Design settings', harmonic:'Harmonics', plane:'Series', particle:'Particle', series:'Multipoles', cluster:'Chain', msorders:'Exchanges', light:'Light'};
    let colourDetails;
    for (const key of groups) {
      const node = group(key);
      addPage(key, titles[key], [node], () => !node.hidden);
      if (key === 'particle') {
        const colour = addPage('colour', 'Concentration', [$('swatchWrap'), $('swPhiRow')], () => !$('swatchWrap').hidden && MieExplorer.state.lesson !== 'design');
        const note = make('p', 'mobile-colour-note', colour.panel);
        note.textContent = 'Watch the through-light and scattered-light colours above the spectrum as you change the concentration.';
        colourDetails = make('details', 'mobile-accordion mobile-colour-details', colour.panel);
        const summary = make('summary', '', colourDetails); summary.textContent = 'Colour model & scattering details';
        const explanation = make('p', 'mobile-colour-note', colourDetails);
        explanation.textContent = 'Colours are simulated for a 1 cm cell in daylight. Multiple scattering is included using Monte Carlo light transport; the particles are assumed not to interact.';
        move($('swWarn'), colourDetails);
      }
    }
    const display = group('display');
    addPage('display', 'Display', [display], () => !display.hidden);
    addPage('guide', 'Guide', [document.querySelector('.lesson-head'), $('tasks'), $('ideasBox')]);
    addPage('results', 'Results', [$('metrics')]);

    // Give swatches their own row at the top right of the spectrum. The canvas
    // gets the remaining height, so neither its data nor the 3D view is covered.
    const spectrumHead = make('div', 'mobile-spectrum-head');
    $('plotWrap').prepend(spectrumHead); generated.push(spectrumHead);
    move($('swatch'), spectrumHead);
    const swatchInfo = make('button', 'mobile-swatch-info', $('swatch'));
    swatchInfo.type = 'button'; swatchInfo.textContent = 'i';
    swatchInfo.setAttribute('aria-label', 'Colour model and scattering details');
    generated.push(swatchInfo);
    swatchInfo.addEventListener('click', () => {
      choose('colour'); colourDetails.open = true;
      content.scrollTop = colourDetails.offsetTop - content.offsetTop;
    });

    // The target picker is a main-window view, with the full available canvas
    // area. Only exact-value and candidate settings stay in the lower tray.
    const design = group('design'), designChildren = [...design.children];
    const candidateStart = designChildren.indexOf(design.querySelectorAll('h2')[1]);
    const targetView = make('section', 'mobile-target-view', document.querySelector('.view-card'));
    targetView.id = 'mobileTargetView'; targetView.hidden = true;
    targetView.setAttribute('aria-label', 'Target colour picker'); generated.push(targetView);
    const picker = make('div', 'mobile-target-picker', targetView);
    const targetIntro = make('p', 'mobile-target-intro', picker);
    targetIntro.textContent = 'Choose the colour you want';
    move($('tPresets'), picker);
    const mapSlot = make('div', 'mobile-target-map-slot', picker);
    const mapWrap = design.querySelector('.tmap-wrap');
    move(mapWrap, mapSlot);
    const targetKnobs = make('div', 'mobile-target-knobs', picker);
    move(design.querySelector('label[for="tLSlider"]'), targetKnobs);
    move($('tLSlider'), targetKnobs);
    const previewLabel = make('p', 'mobile-target-preview-label', targetKnobs);
    previewLabel.textContent = 'Your target';
    move($('tSwatch'), targetKnobs);
    move($('tGamut'), picker);
    const resizeTarget = () => {
      if (!mapSlot.clientHeight || !mapSlot.clientWidth) return;
      const axes = [...mapWrap.querySelectorAll('.tmap-ax')].reduce((sum, el) => sum + el.offsetHeight, 0) + 8;
      const side = Math.max(60, Math.floor(Math.min(mapSlot.clientWidth, mapSlot.clientHeight - axes)));
      mapSlot.style.setProperty('--mobile-map-size', `${side}px`);
    };
    const targetObserver = new ResizeObserver(resizeTarget); targetObserver.observe(mapSlot);
    fold(design, 'Exact L*a*b* values & colour-map guide', [design.querySelector('.lab-row'), design.querySelector('.note.small')]);
    fold(design, 'Candidate particles & ranking', designChildren.slice(candidateStart));

    // Put the live size control first, and fold infrequent settings into short sections.
    // Data-dependent visibility stays on its original parent (units / core-shell / custom).
    const particle = group('particle');
    fold(particle, 'Units & particle structure', [$('units'), $('struct')], true);
    const dim = particle.querySelector('[data-units="dim"]');
    const dimChildren = [...dim.children], indexStart = dimChildren.findIndex(el => el.classList.contains('pair'));
    fold(dim, 'Material & refractive index', dimChildren.slice(indexStart));
    const phys = particle.querySelector('[data-units="phys"]');
    const children = [...phys.children];
    const mediumStart = children.indexOf(phys.querySelector('label[for="medSel"]'));
    const sizeStart = children.indexOf($('sizeBy').previousElementSibling);
    const reportStart = children.indexOf($('report').previousElementSibling);
    const sizeControls = make('div', 'mobile-size-controls', phys); generated.push(sizeControls);
    children.slice(sizeStart, reportStart).forEach(node => move(node, sizeControls));
    fold(phys, 'Wavelength & spectral range', children.slice(0, mediumStart));
    fold(phys, 'Material & surrounding medium', children.slice(mediumStart, sizeStart));
    fold(phys, 'Reported quantities & data sources', children.slice(reportStart));

    const caption = $('graphCaption');
    const graphNote = make('details', 'mobile-graph-note', caption.parentElement);
    const graphSummary = make('summary', '', graphNote); graphSummary.textContent = 'About this graph';
    move(caption, graphNote); generated.push(graphNote);

    function setResult(which) {
      if (which === 'target' && MieExplorer.state.lesson !== 'design') which = 'scene';
      app.dataset.mobileResult = which;
      targetView.hidden = which !== 'target';
      [targetButton, ...resultButtons].forEach(b => {
        const on = b.dataset.mobileView === which;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      viewport();
      // Existing canvas ResizeObservers repaint the newly visible result.
    }
    function setCollapsed(value) {
      collapsed = value; tray.classList.toggle('collapsed', value);
      app.dataset.mobileCollapsed = String(value);
      content.hidden = value;
      handle.setAttribute('aria-expanded', String(!value));
      handle.setAttribute('aria-label', value ? 'Show controls' : 'Hide controls');
      handle.querySelector('.mobile-fold-word').textContent = value ? 'Show' : 'Hide';
      syncGuide();
    }
    function syncGuide() {
      const shown = current === 'guide' && !collapsed;
      guideButton.classList.toggle('on', shown); guideButton.setAttribute('aria-pressed', String(shown));
    }
    function choose(key, open = true, reveal = true) {
      const next = pages.find(p => p.key === key && !p.button.hidden);
      if (!next) return;
      if (current !== key) {
        scrolls.set(current, content.scrollTop); current = key;
        content.scrollTop = 0;
      }
      pages.forEach(p => {
        const selected = p === next;
        p.panel.hidden = !selected;
        p.button.setAttribute('aria-selected', String(selected));
        p.button.tabIndex = selected ? 0 : -1;
      });
      content.scrollTop = scrolls.get(key) || 0;
      if (open) setCollapsed(false);
      if (key === 'design') setResult('target');
      if (key === 'colour') {
        // Use the original tab handler so the spectrum and live swatches agree.
        if (MieExplorer.state.graph !== 'spectrum') $('graphTabs').querySelector('[data-g="spectrum"]')?.click();
        setResult('graph');
      }
      if (reveal) {
        // Scroll only the tab strip, never the document or the live scene.
        tabs.scrollLeft = Math.max(0, next.button.offsetLeft - tabs.offsetLeft - (tabs.clientWidth - next.button.offsetWidth) / 2);
      }
      syncGuide();
    }

    let navKey = '', lastGraph = '';
    const entryParameters = new URLSearchParams((window.__mieStartHash || '').replace(/^#/, ''));
    function sync() {
      frame = 0; if (!active) return;
      const source = [...$('lessonNav').querySelectorAll('button')];
      const nextKey = source.map(b => b.textContent).join('|');
      if (nextKey !== navKey) {
        navKey = nextKey; lessonSelect.replaceChildren();
        source.forEach(b => {
          const copy = b.cloneNode(true), no = copy.querySelector('span');
          const number = no?.textContent || ''; no?.remove();
          const option = document.createElement('option'); option.value = b.dataset.lesson;
          option.textContent = `${number} · ${copy.textContent.trim()}`; lessonSelect.append(option);
        });
      }
      const lesson = MieExplorer.state.lesson;
      const lessonChanged = lesson !== lastLesson;
      const previousLesson = lastLesson;
      app.dataset.mobileLesson = lesson; targetButton.hidden = lesson !== 'design';
      views.hidden = lesson === 'museum';
      lessonSelect.value = lesson;
      pages.forEach(p => { const hidden = !p.available(); if (p.button.hidden !== hidden) p.button.hidden = hidden; });
      const selected = pages.find(p => p.key === current);
      if (lesson !== lastLesson || !selected || selected.button.hidden) {
        if (lesson !== lastLesson) { scrolls.clear(); current = ''; content.scrollTop = 0; }
        lastLesson = lesson;
        const primary = pages.find(p => !p.button.hidden);
        if (primary) choose(primary.key, false);
        if (lessonChanged && lesson === 'design') { setCollapsed(true); setResult('target'); }
        else if (lessonChanged && lesson === 'museum') { setCollapsed(true); setResult('scene'); }
        else if (lessonChanged && ['real','chain'].includes(lesson)) {
          const explicitGraph = previousLesson === '' && entryParameters.get('l') === lesson && entryParameters.has('graph');
          if (!explicitGraph && MieExplorer.state.units !== 'dim' && MieExplorer.state.graph !== 'spectrum') {
            MieExplorer.state.graph = 'spectrum'; MieExplorer.refresh(true);
          }
          setResult('graph');
        }
        else if (lessonChanged && app.dataset.mobileResult === 'target') setResult('scene');
        if (lessonChanged && !['design','museum'].includes(lesson) && ['design','museum'].includes(previousLesson)) setCollapsed(false);
      }
      const spectrum = String(MieExplorer.state.graph === 'spectrum' && !$('swatch').hidden);
      const graphChanged = lastGraph !== MieExplorer.state.graph || app.dataset.mobileSpectrum !== spectrum;
      lastGraph = MieExplorer.state.graph; app.dataset.mobileSpectrum = spectrum;
      resultButtons[0].textContent = lesson === 'design' ? 'Result' : '3D view';
      if (lessonChanged || graphChanged) viewport();
    }
    const schedule = () => { if (active && !frame) frame = requestAnimationFrame(sync); };
    const observer = new MutationObserver(schedule);
    [...groups.map(group), display, $('swatchWrap'), $('swatch')].forEach(node => observer.observe(node, {attributes:true, attributeFilter:['hidden']}));
    [$('lessonTitle'), $('lessonNav')].forEach(node => observer.observe(node, {childList:true, subtree:true, characterData:true}));
    lessonSelect.addEventListener('change', () => { MieExplorer.setLesson(lessonSelect.value); sync(); });
    content.addEventListener('input', schedule);
    content.addEventListener('change', schedule);
    $('graphTabs').addEventListener('click', schedule);
    content.addEventListener('scroll', () => scrolls.set(current, content.scrollTop), {passive:true});
    tabs.addEventListener('keydown', event => {
      const visible = pages.filter(p => !p.button.hidden), i = visible.findIndex(p => p.key === current);
      const step = {ArrowRight:1, ArrowLeft:-1}[event.key];
      let next;
      if (step) next = visible[(i + step + visible.length) % visible.length];
      if (event.key === 'Home') next = visible[0];
      if (event.key === 'End') next = visible.at(-1);
      if (next) { event.preventDefault(); event.stopPropagation(); choose(next.key); next.button.focus({preventScroll:true}); }
    });

    const bounds = () => {
      const available = app.clientHeight - toolbar.offsetHeight;
      const graph = app.dataset.mobileResult === 'graph';
      const graphChrome = document.querySelector('.graph-bar').offsetHeight + graphNote.offsetHeight + 14 + (MieExplorer.state.graph === 'spectrum' && !$('swatch').hidden ? 40 : 0);
      const museumChrome = document.querySelector('.museum-navigation').offsetHeight + document.querySelector('.museum-tools').offsetHeight + document.querySelector('.museum-console').offsetHeight + document.querySelector('.museum-key').offsetHeight + document.querySelector('.museum-source').offsetHeight + 14;
      const reserved = MieExplorer.state.lesson === 'museum' ? Math.max(170,museumChrome+85) : graph ? Math.max(170, graphChrome + 100) : app.dataset.mobileResult === 'target' ? 320 : 170;
      const compact = matchMedia('(max-width:520px) and (max-height:500px) and (max-aspect-ratio:6/5)').matches;
      const max = Math.max(compact?84:110, available - Math.min(reserved, available * (compact?.75:.65)));
      return {min:Math.min(190, max), max};
    };
    function setSize(value, remember = true) {
      if (remember) preferredSize = value;
      const {min, max} = bounds(); size = Math.max(min, Math.min(max, value));
      tray.style.setProperty('--mobile-tray-size', `${Math.round(size)}px`);
    }
    function viewport() {
      if (!active) return;
      const height = Math.round(window.visualViewport?.height || innerHeight);
      document.body.style.setProperty('--mobile-vh', `${height}px`);
      if (!landscape.matches) {
        const defaultSize = Math.min(320, Math.max(260, app.clientHeight * .4));
        setSize(preferredSize ?? defaultSize, false);
      }
    }
    handle.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      setCollapsed(!collapsed);
    });
    handle.addEventListener('pointerdown', event => {
      if (event.button || landscape.matches) return;
      drag = {id:event.pointerId, y:event.clientY, height:tray.getBoundingClientRect().height, collapsed, moved:false};
      suppressClick = false; handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = drag.y - event.clientY;
      if (!drag.moved && Math.abs(delta) < 6) return;
      drag.moved = true; suppressClick = true; tray.classList.add('dragging');
      setCollapsed(false); setSize(drag.height + delta);
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moved) {
        if (event.type === 'pointercancel') setCollapsed(drag.collapsed);
        else setCollapsed(drag.height + drag.y - event.clientY < 140);
      }
      tray.classList.remove('dragging'); drag = null;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    }
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key) || landscape.matches) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'ArrowUp') { setCollapsed(false); setSize((size || 220) + 40); }
      else if (collapsed || size <= bounds().min + 5) setCollapsed(true);
      else setSize(size - 40);
    });
    const escape = event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !collapsed) {
        setCollapsed(true); handle.focus({preventScroll:true});
      }
    };
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('resize', viewport);
    document.body.classList.add('mobile-lab');
    setResult('scene'); setCollapsed(false); sync(); viewport();

    cleanup = () => {
      targetObserver.disconnect();
      observer.disconnect(); if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', viewport);
      window.visualViewport?.removeEventListener('resize', viewport);
      document.removeEventListener('keydown', escape);
      $('graphTabs').removeEventListener('click', schedule);
      const focusOnNewUI = toolbar.contains(document.activeElement) || contextbar.contains(document.activeElement) || tabs.contains(document.activeElement) || document.activeElement === handle;
      slots.forEach(({node, slot}) => slot.replaceWith(node));
      generated.forEach(node => node.remove()); toolbar.remove(); tray.remove(); contextbar.remove();
      document.body.classList.remove('mobile-lab'); document.body.style.removeProperty('--mobile-vh');
      delete app.dataset.mobileResult; delete app.dataset.mobileCollapsed; delete app.dataset.mobileSpectrum; delete app.dataset.mobileLesson;
      if (focusOnNewUI) $('scene').focus({preventScroll:true});
    };
  }
  function adapt() {
    if (phone.matches) enter();
    else if (active) { active = false; cleanup(); cleanup = null; }
  }
  phone.addEventListener('change', adapt);
  adapt();
})();

