// 영역별 스크롤: 휠 한 번에 이전·다음 영역으로 부드럽게 이동
// moveSection(true/false)은 터미널 입력칸의 위·아래 화살표에서도 씀
var moveSection = function () { return false; };
(function () {
  // 배너 → 공개 범위 → 소개 → 활동 → 근거
  var sections = Array.prototype.slice.call(document.querySelectorAll('.hero, .section'));
  if (sections.length < 2) return;
  var locked = false;

  function currentIndex() {
    var index = 0;
    sections.forEach(function (section, i) {
      if (section.getBoundingClientRect().top <= 1) index = i;
    });
    return index;
  }

  window.addEventListener('wheel', function (event) {
    if (event.ctrlKey || Math.abs(event.deltaY) < 4) return;
    // 자세히 보기 창이 떠 있으면 영역 이동 대신 창 안을 스크롤
    if (document.querySelector('dialog[open]')) return;
    // 터미널 창 안처럼 자체 스크롤이 있는 곳은, 그 안에서 더 굴릴 수 있으면 영역 이동 대신 안쪽을 스크롤
    var inner = event.target.closest && event.target.closest('.terminal-body, .terminal-help');
    if (inner) {
      var canDown = inner.scrollTop + inner.clientHeight < inner.scrollHeight - 1;
      var canUp = inner.scrollTop > 0;
      if ((event.deltaY > 0 && canDown) || (event.deltaY < 0 && canUp)) return;
    }
    if (locked) { event.preventDefault(); return; }
    if (moveSection(event.deltaY > 0)) event.preventDefault();
  }, { passive: false });

  // 다음(true)·이전(false) 영역으로 이동. 이동했으면 true
  moveSection = function (down) {
    if (locked) return true;
    var i = currentIndex();
    var rect = sections[i].getBoundingClientRect();
    // 한 화면보다 긴 영역(좁은 화면, 펼친 강점 등)은 끝에 닿을 때까지 그냥 스크롤
    if (down && rect.bottom > window.innerHeight + 2) return false;
    if (!down && rect.top < -2) return false;

    var target = sections[down ? i + 1 : i - 1];
    if (!target) return false;

    locked = true;
    var reduced = document.documentElement.getAttribute('data-motion') === 'reduced';
    window.scrollTo({ top: target.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(function () { locked = false; }, reduced ? 100 : 800);
    return true;
  };
})();

// 배너 배경 애니메이션: 떠다니는 입자와 연결선 + 마우스 입체감
(function () {
  var hero = document.querySelector('.hero');
  var canvas = document.querySelector('.hero-canvas');
  if (!hero || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var width = 0, height = 0, frame = null, visible = true;
  var LINK = 140;

  function isReduced() { return root.getAttribute('data-motion') === 'reduced'; }

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var count = Math.round(Math.min(110, width * height / 14000));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.6
      });
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      for (var j = i + 1; j < particles.length; j++) {
        var q = particles[j];
        var dx = p.x - q.x, dy = p.y - q.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * (1 - dist / LINK)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      var mx = p.x - mouse.x, my = p.y - mouse.y;
      var md = Math.sqrt(mx * mx + my * my);
      if (md < LINK * 1.4) {
        ctx.strokeStyle = 'rgba(255,225,77,' + (0.45 * (1 - md / (LINK * 1.4))) + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function step() {
    frame = null;
    if (isReduced() || !visible || document.hidden) return;
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    });
    draw();
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (frame === null && !isReduced()) frame = requestAnimationFrame(step);
  }

  hero.addEventListener('mousemove', function (event) {
    var rect = hero.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    if (isReduced()) return;
    // -1 ~ 1 값으로 바꿔 키워드를 깊이별로 움직임
    hero.style.setProperty('--mx', ((mouse.x / width) * 2 - 1).toFixed(3));
    hero.style.setProperty('--my', ((mouse.y / height) * 2 - 1).toFixed(3));
  });
  hero.addEventListener('mouseleave', function () {
    mouse.x = mouse.y = -9999;
    hero.style.setProperty('--mx', 0);
    hero.style.setProperty('--my', 0);
  });

  // 배너가 화면 밖이거나 탭이 숨겨지면 멈춰서 자원을 아낌
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', start);
  // 움직임 줄이기를 켜고 끌 때 바로 반영
  new MutationObserver(function () {
    if (isReduced()) {
      hero.style.setProperty('--mx', 0);
      hero.style.setProperty('--my', 0);
      draw();
    } else {
      start();
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });

  window.addEventListener('resize', resize);
  resize();
  start();
})();

// 좌측 영역 표시기: 화면 가운데에 걸친 영역의 눈금을 진하게 표시
(function () {
  var nav = document.querySelector('.section-nav');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var targets = links.map(function (link) { return document.querySelector(link.getAttribute('href')); });
  var current = -1, ticking = false;

  function update() {
    ticking = false;
    var middle = window.innerHeight / 2;
    var index = 0;
    targets.forEach(function (target, i) {
      if (target && target.getBoundingClientRect().top <= middle) index = i;
    });
    if (index === current) return;
    current = index;
    links.forEach(function (link, i) {
      if (i === index) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    // 첫 번째 영역(배너)에서는 숨기고, 다른 영역으로 가면 서서히 나타남
    nav.classList.toggle('is-hidden', index === 0);
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// 소개·활동 영역: 처음 들어오면 아이콘·흐름선·카드 애니메이션을 한 번 재생(스크립트가 없으면 처음부터 완성된 모습)
['intro', 'activity'].forEach(function (id) {
  var section = document.getElementById(id);
  if (!section || !('IntersectionObserver' in window)) return;
  section.classList.add('is-ready');
  new IntersectionObserver(function (entries, observer) {
    if (entries[0].isIntersecting) {
      section.classList.add('is-visible');
      observer.disconnect();
    }
  }, { threshold: 0.4 }).observe(section);
});

// 활동 자세히 보기: 카드(또는 "자세히 보기" 버튼)를 누르면 위에 창을 띄움.
// 창 내용은 카드 + 관련 강점의 상황·행동·결과 + (있으면) 근거 사실 카드를 복사해 만들어, 페이지 내용과 항상 같게 유지
(function () {
  var dialog = document.getElementById('activity-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var body = dialog.querySelector('.dialog-body');
  var opener = null;

  function heading(text) {
    var h = document.createElement('h3');
    h.textContent = text;
    return h;
  }

  function open(card) {
    body.textContent = '';
    var icon = card.querySelector('.activity-icon');
    if (icon) body.appendChild(icon.cloneNode(true));
    body.appendChild(card.querySelector('.activity-num').cloneNode(true));
    var title = document.createElement('h2');
    title.id = 'activity-dialog-title';
    title.textContent = card.querySelector('h3').textContent;
    body.appendChild(title);
    body.appendChild(card.querySelector('.activity-desc').cloneNode(true));
    var now = card.querySelector('.activity-now');
    if (now) body.appendChild(now.cloneNode(true));

    body.appendChild(heading('한 일'));
    body.appendChild(card.querySelector('.activity-did').cloneNode(true));

    // 카드에는 안 보이고 창에서만 보여 줄 추가 내용(<template class="activity-extra">)
    var extra = card.querySelector('template.activity-extra');
    if (extra) body.appendChild(extra.content.cloneNode(true));

    // 관련 강점: 소개 영역 카드의 상황·행동·결과를 그대로 보여 줌
    var strengthLink = card.querySelector('a[href^="#strength-"]');
    var strength = strengthLink && document.querySelector(strengthLink.getAttribute('href'));
    if (strength) {
      body.appendChild(heading('관련 강점 — ' + strength.querySelector('.strength-name').textContent));
      body.appendChild(strength.querySelector('.star').cloneNode(true));
    }

    // 근거로 이어지는 활동이면 근거 사실 카드도 보여 줌
    var facts = card.querySelector('a[href="#evidence"]') && document.querySelector('.evidence-facts');
    if (facts) {
      body.appendChild(heading('근거'));
      body.appendChild(facts.cloneNode(true));
    }

    // 이동 링크(관련 강점·근거 보기)만 복사. 누르면 창을 닫고 이동
    var links = document.createElement('p');
    links.className = 'activity-links';
    card.querySelectorAll('.activity-links a').forEach(function (a) {
      var copy = a.cloneNode(true);
      copy.addEventListener('click', function () { dialog.close(); });
      links.appendChild(copy);
    });
    body.appendChild(links);

    opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector('.dialog-panel').scrollTop = 0;
    dialog.querySelector('.dialog-close').focus();
  }

  document.querySelectorAll('.activity').forEach(function (card) {
    // 카드 아무 곳이나 눌러도 열림 (안의 링크는 원래대로 이동)
    card.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;
      open(card);
    });
  });

  dialog.querySelector('.dialog-close').addEventListener('click', function () { dialog.close(); });
  // 창 바깥(어두운 배경)을 누르면 닫힘
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
  // Esc·닫기 버튼 등 어떤 방법으로 닫혀도 원래 누른 곳으로 초점을 돌려 줌
  dialog.addEventListener('close', function () {
    if (opener && document.contains(opener) && !location.hash.match(/^#(strength-|evidence)/)) opener.focus({ preventScroll: true });
    opener = null;
  });
})();

// 터미널 창: 영역에 들어오면 한 줄씩 출력(스크립트가 없으면 처음부터 다 보임)
(function () {
  var terminal = document.querySelector('[data-terminal]');
  if (!terminal || !('IntersectionObserver' in window)) return;
  terminal.classList.add('is-ready');
  new IntersectionObserver(function (entries, observer) {
    if (entries[0].isIntersecting) {
      terminal.classList.add('is-visible');
      observer.disconnect();
    }
  }, { threshold: 0.3 }).observe(terminal);
})();

// 터미널 명령어 입력: 자동완성 + 실행 결과
// 결과에 쓰는 글은 페이지에 이미 있는 내용(공개 범위·강점·활동·근거)을 그대로 읽어 와서 항상 같게 유지함
(function () {
  var form = document.querySelector('.t-input-line');
  var input = document.getElementById('t-input');
  var list = document.getElementById('t-suggest');
  var output = document.querySelector('.t-output');
  var body = document.querySelector('.terminal-body');
  if (!form || !input || !list || !output || !body) return;
  var ghostTyped = form.querySelector('.t-ghost-typed');
  var ghostRest = form.querySelector('.t-ghost-rest');
  var measure = form.querySelector('.t-measure');
  var caret = form.querySelector('.t-caret');
  var scope = document.getElementById('scope');
  var PROMPT = 'mj@about-me ~ %';
  var cycling = false;      // Tab을 연달아 눌러 추천을 차례로 채우는 중인지
  var scopeInView = false;  // 터미널 영역이 화면에 보이는지

  // 블록 커서를 입력 위치(글자 뒤)로 옮김
  function updateCaret() {
    if (!measure || !caret) return;
    var at = input.selectionStart == null ? input.value.length : input.selectionStart;
    measure.textContent = input.value.slice(0, at);
    var x = Math.min(measure.offsetWidth - input.scrollLeft, input.clientWidth - 12);
    caret.style.setProperty('--caret-x', Math.max(0, x) + 'px');
  }

  function texts(selector) {
    return Array.prototype.map.call(document.querySelectorAll(selector), function (el) {
      return el.textContent.replace(/\s+/g, ' ').trim();
    });
  }
  function goTo(id, label) {
    var target = document.getElementById(id);
    if (!target) return [['t-out-error', label + ' 영역을 찾을 수 없습니다.']];
    var reduced = document.documentElement.getAttribute('data-motion') === 'reduced';
    window.scrollTo({ top: target.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
    return [['t-out-ok', label + ' 영역으로 이동합니다.']];
  }

  // 명령어 목록: name(입력할 글자), alias(같은 뜻의 다른 입력), desc(추천 목록 설명), run(결과 줄 [class, 글])
  var COMMANDS = [
    { name: 'help', alias: ['도움말', '?'], desc: '사용할 수 있는 명령어',
      run: function () {
        return [['t-out-title', '사용할 수 있는 명령어']].concat(COMMANDS.map(function (c) {
          return ['t-out-row', [c.name, c.desc]];
        }));
      } },
    { name: 'whoami', alias: ['나', '누구'], desc: '나는 누구인가요',
      run: function () {
        var name = (document.querySelector('.section-nav-name') || {}).textContent || 'MJ';
        return [['t-out-title', name], ['t-out-ok', texts('.terminal .purpose')[0] || '']];
      } },
    { name: 'ls', alias: ['목록', 'dir'], desc: '공개 범위 폴더 보기',
      run: function () {
        return [['t-out-title', '공개하는_정보/    공개하지_않는_정보/']];
      } },
    { name: 'cat 공개하는_정보', alias: ['공개', 'public'], desc: '공개하는 정보',
      run: function () {
        return [['t-out-title', '✓ 공개하는 정보']].concat(texts('.t-open li').map(function (t) {
          return ['t-out-ok', '  - ' + t];
        }));
      } },
    { name: 'cat 공개하지_않는_정보', alias: ['비공개', 'private'], desc: '공개하지 않는 정보',
      run: function () {
        return [['t-out-warn', '✕ 공개하지 않는 정보 (항목 이름만 보여 줍니다)']].concat(texts('.t-closed li').map(function (t) {
          return ['t-out-ok', '  - ' + t];
        }));
      } },
    { name: '강점', alias: ['strengths', '소개'], desc: '강점·좋아하는 것 3가지',
      run: function () {
        var names = texts('.strength-name');
        var results = texts('.star dd:nth-of-type(3)');
        var lines = [['t-out-title', '강점·좋아하는 것 ' + names.length + '가지']];
        names.forEach(function (n, i) {
          lines.push(['t-out-ok', (i + 1) + '. ' + n]);
          if (results[i]) lines.push(['t-out-muted', '   결과: ' + results[i]]);
        });
        lines.push(['t-out-muted', "자세히 보려면 'cd 소개'"]);
        return lines;
      } },
    { name: '활동', alias: ['activity', '경험'], desc: '활동 경험',
      run: function () {
        var titles = texts('.activity-list h3');
        var descs = texts('.activity-desc');
        var lines = [['t-out-title', '활동 경험 ' + titles.length + '가지']];
        titles.forEach(function (t, i) {
          lines.push(['t-out-ok', (i + 1) + '. ' + t]);
          if (descs[i]) lines.push(['t-out-muted', '   ' + descs[i]]);
        });
        return lines;
      } },
    { name: '근거', alias: ['evidence'], desc: '근거 자료',
      run: function () {
        return [['t-out-title', '근거'], ['t-out-ok', texts('.evidence-figure figcaption')[0] || ''],
                ['t-out-muted', "자세히 보려면 'cd 근거'"]];
      } },
    { name: 'cd 소개', alias: [], desc: '소개 영역으로 이동', run: function () { return goTo('intro', '소개'); } },
    { name: 'cd 활동', alias: [], desc: '활동 영역으로 이동', run: function () { return goTo('activity', '활동'); } },
    { name: 'cd 근거', alias: [], desc: '근거 영역으로 이동', run: function () { return goTo('evidence', '근거'); } },
    { name: 'clear', alias: ['지우기', 'cls'], desc: '결과 지우기', run: function () { output.textContent = ''; return null; } }
  ];

  function normalize(text) { return text.replace(/\s+/g, ' ').trim().toLowerCase(); }

  function find(text) {
    var q = normalize(text);
    for (var i = 0; i < COMMANDS.length; i++) {
      var c = COMMANDS[i];
      if (normalize(c.name) === q || c.alias.some(function (a) { return normalize(a) === q; })) return c;
    }
    return null;
  }

  // 입력과 관련된 명령어: 앞부분이 같은 것 먼저, 그다음 중간에 들어 있는 것
  function suggestions(text) {
    var q = normalize(text);
    if (!q) return [];
    var starts = [], contains = [];
    COMMANDS.forEach(function (c) {
      var words = [c.name].concat(c.alias).map(normalize);
      var desc = normalize(c.desc);
      if (words.some(function (w) { return w.indexOf(q) === 0; })) starts.push(c);
      else if (words.some(function (w) { return w.indexOf(q) > 0; }) || desc.indexOf(q) >= 0) contains.push(c);
    });
    return starts.concat(contains).slice(0, 6);
  }

  var items = [], active = -1;

  function renderSuggestions() {
    cycling = false;
    items = suggestions(input.value);
    if (find(input.value) && items.length === 1) items = [];   // 이미 정확히 입력했으면 목록을 닫음
    list.textContent = '';
    active = items.length ? 0 : -1;
    items.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 't-s-' + i;
      li.setAttribute('role', 'option');
      var name = document.createElement('span');
      var q = normalize(input.value);
      var at = c.name.toLowerCase().indexOf(q);
      if (at >= 0 && q) {
        name.appendChild(document.createTextNode(c.name.slice(0, at)));
        var mark = document.createElement('mark');
        mark.textContent = c.name.slice(at, at + q.length);
        name.appendChild(mark);
        name.appendChild(document.createTextNode(c.name.slice(at + q.length)));
      } else {
        name.textContent = c.name;
      }
      var desc = document.createElement('span');
      desc.className = 't-s-desc';
      desc.textContent = c.desc;
      li.appendChild(name);
      li.appendChild(desc);
      li.addEventListener('mousedown', function (event) {
        event.preventDefault();   // 입력칸 초점을 잃지 않게
        input.value = c.name;
        run();
      });
      list.appendChild(li);
    });
    list.hidden = !items.length;
    input.setAttribute('aria-expanded', String(!!items.length));
    highlight();
  }

  function highlight() {
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) input.setAttribute('aria-activedescendant', 't-s-' + active);
    else input.removeAttribute('aria-activedescendant');
    // 입력한 글자로 시작하는 추천이면 남은 부분을 흐리게 미리 보여 줌
    var c = items[active];
    var typed = input.value;
    if (c && typed && c.name.toLowerCase().indexOf(typed.toLowerCase()) === 0) {
      ghostTyped.textContent = typed;
      ghostRest.textContent = c.name.slice(typed.length);
    } else {
      ghostTyped.textContent = '';
      ghostRest.textContent = '';
    }
  }

  function closeList() {
    cycling = false;
    items = [];
    active = -1;
    list.hidden = true;
    list.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    highlight();
  }

  function accept() {
    if (active < 0 || !items[active]) return false;
    input.value = items[active].name;
    closeList();
    return true;
  }

  function print(lines) {
    lines.forEach(function (line) {
      var p = document.createElement('p');
      p.className = line[0];
      if (Array.isArray(line[1])) {
        // 두 칸 줄(명령어 | 설명): 한글이 섞여도 칸이 맞도록 CSS 격자로 배치
        line[1].forEach(function (text) {
          var cell = document.createElement('span');
          cell.textContent = text;
          p.appendChild(cell);
        });
      } else {
        p.textContent = line[1];
      }
      output.appendChild(p);
    });
  }

  function run() {
    var text = input.value.trim();
    closeList();
    if (!text) return;
    var echo = document.createElement('p');
    echo.className = 't-out-echo';
    var prompt = document.createElement('span');
    prompt.className = 't-prompt';
    prompt.textContent = PROMPT + ' ';
    echo.appendChild(prompt);
    echo.appendChild(document.createTextNode(text));
    output.appendChild(echo);

    var command = find(text);
    var lines = command
      ? command.run()
      : [['t-out-error', 'zsh: command not found: ' + text], ['t-out-muted', "'help' 를 입력하면 사용할 수 있는 명령어가 나옵니다."]];
    if (lines) print(lines);
    input.value = '';
    updateCaret();
    body.scrollTop = body.scrollHeight;
  }

  // 줄별 등장 효과가 아직 안 끝났어도, 입력칸에 초점이 오면 바로 다 보이게
  input.addEventListener('focus', function () {
    var terminal = input.closest('[data-terminal]');
    if (terminal) terminal.classList.add('is-visible');
    updateCaret();
  });
  input.addEventListener('input', function () { renderSuggestions(); updateCaret(); });
  ['keyup', 'click', 'select'].forEach(function (type) { input.addEventListener(type, updateCaret); });
  input.addEventListener('blur', function () { setTimeout(closeList, 100); });
  input.addEventListener('keydown', function (event) {
    var open = !list.hidden && items.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // 위·아래 화살표는 입력 중에도 영역 이동 (터미널 밖과 똑같이)
      event.preventDefault();
      // 터미널 영역을 떠나면 입력칸 초점도 놓아, 다른 영역에서 친 글자가 안 보이는 곳에 들어가지 않게
      if (moveSection(event.key === 'ArrowDown')) input.blur();
    } else if (event.key === 'Tab' && open) {
      // 추천이 열려 있으면 Tab을 누를 때마다 다음 추천으로 채움(Shift+Tab은 이전).
      // 추천이 닫혀 있으면 Tab은 원래대로 다음 요소로 이동
      event.preventDefault();
      if (cycling) active = (active + (event.shiftKey ? -1 : 1) + items.length) % items.length;
      cycling = true;
      input.value = items[active].name;
      highlight();
      updateCaret();
    } else if (event.key === 'ArrowRight' && open && input.selectionStart === input.value.length) {
      event.preventDefault();
      accept();
      updateCaret();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeList();
    }
  });

  // 터미널 영역에 오면 바로 입력할 수 있게 입력칸에 초점, 떠나면 초점을 놓음.
  // (Tab으로 다른 요소에 있을 때는 초점을 빼앗지 않음.
  //  휴대폰·태블릿처럼 손가락으로 쓰는 화면은 자동 초점이 화면 키보드를 띄우므로 하지 않음)
  var finePointer = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  function nothingFocused() {
    var a = document.activeElement;
    return !a || a === document.body || a === document.documentElement;
  }
  if (scope && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      scopeInView = entries[0].isIntersecting;
      if (scopeInView && finePointer && nothingFocused()) input.focus({ preventScroll: true });
      if (!scopeInView && document.activeElement === input) input.blur();
    }, { threshold: 0.6 }).observe(scope);
  }

  // 터미널 화면에서 아무 데나 글자를 치면 입력칸으로 들어가게
  window.addEventListener('keydown', function (event) {
    if (!scopeInView || event.target === input) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!nothingFocused()) return;   // 버튼·링크 등에 초점이 있으면 그 동작(Enter·Space)을 그대로 둠
    var typing = event.key.length === 1 || event.key === 'Process' || event.key === 'Backspace';
    if (typing) input.focus({ preventScroll: true });
  });

  // 오른쪽 명령어 목록 칸: 명령어 표에서 채우고, 누르면 그 명령어를 실행
  var help = document.querySelector('.terminal-help');
  var helpList = help && help.querySelector('.t-help-list');
  if (helpList) {
    COMMANDS.forEach(function (c) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      var cmd = document.createElement('span');
      cmd.className = 't-help-cmd';
      cmd.textContent = c.name;
      var desc = document.createElement('span');
      desc.className = 't-help-desc';
      desc.textContent = c.desc;
      button.appendChild(cmd);
      button.appendChild(desc);
      button.addEventListener('click', function () {
        input.value = c.name;
        run();
        input.focus({ preventScroll: true });
      });
      li.appendChild(button);
      helpList.appendChild(li);
    });
    help.hidden = false;
  }

  // 터미널 창 안을 누르면(글자를 드래그해 고르는 중이 아니면) 입력칸으로
  body.addEventListener('click', function (event) {
    if (event.target.closest('a, button, input, li[role="option"]')) return;
    var selection = window.getSelection && String(window.getSelection());
    if (!selection) input.focus({ preventScroll: true });
  });
  updateCaret();
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    // 추천에서 고른 것이 있고 아직 정확한 명령어가 아니면 고른 것을 실행
    if (!find(input.value) && active >= 0) accept();
    run();
  });
})();

// 움직임 줄이기 토글: 처음 값은 OS 설정을 따르고, 선택은 이 브라우저에만 기억
(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('motion-toggle');
  if (!toggle) return;
  var label = toggle.querySelector('[data-motion-state]');

  function readSaved() {
    try { return localStorage.getItem('motion'); } catch (e) { return null; }
  }
  function save(value) {
    try { localStorage.setItem('motion', value); } catch (e) { /* 저장 불가 시 무시 */ }
  }
  function apply(reduced) {
    root.setAttribute('data-motion', reduced ? 'reduced' : 'full');
    toggle.setAttribute('aria-pressed', String(reduced));
    if (label) label.textContent = reduced ? '켬' : '끔';
  }

  var saved = readSaved();
  var osReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  apply(saved ? saved === 'reduced' : osReduced);

  toggle.addEventListener('click', function () {
    var reduced = toggle.getAttribute('aria-pressed') !== 'true';
    apply(reduced);
    save(reduced ? 'reduced' : 'full');
  });
})();
