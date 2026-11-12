(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const gradeKeys = ['10', '11', '12'];
  const letters = gradeKeys.flatMap(grade => (HEART_DATA[grade] || []).map((entry, index) => ({
    ...entry,
    grade,
    index,
    title: entry.name,
    content: LETTER_CONTENT[entry.id] || ''
  })));

  const state = { grade: 'all', query: '', activeLetter: null };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let toastTimer = 0;
  let lastOpenedButton = null;

  function normalize(value) {
    return String(value).toLocaleLowerCase('vi').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }

  function filteredLetters() {
    const query = normalize(state.query);
    return letters.filter(item =>
      (state.grade === 'all' || item.grade === state.grade) &&
      (!query || normalize(`${item.title} ${item.specialty} khoi ${item.grade}`).includes(query))
    );
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove('show'), 2300);
  }

  function updateResults(items) {
    $('#searchEmpty').hidden = items.length > 0;
    $('#resultCount').textContent = `${items.length} / ${letters.length}`;
    if (state.query) {
      $('#resultTitle').textContent = items.length
        ? `${items.length} kết quả phù hợp`
        : 'Không có kết quả phù hợp';
      $('#resultSubtitle').textContent = `Từ khóa: “${state.query}”`;
    } else if (state.grade === 'all') {
      $('#resultTitle').textContent = '36 lời nhắn đang chờ';
      $('#resultSubtitle').textContent = 'Ba khối · Một tập thể Chuyên Hạ Long';
    } else {
      $('#resultTitle').textContent = `Lời nhắn khối ${state.grade}`;
      $('#resultSubtitle').textContent = `12 tập thể · Khối ${state.grade}`;
    }
  }

  function renderHearts() {
    const grid = $('#heartCanvas');
    const items = filteredLetters();
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `class-card grade-${item.grade}`;
      button.dataset.id = item.id;
      button.setAttribute('aria-label', `Mở thư ${item.title}, khối ${item.grade}`);

      const top = document.createElement('span');
      top.className = 'card-topline';
      const number = document.createElement('span');
      number.className = 'card-number';
      number.textContent = `${String(letters.indexOf(item) + 1).padStart(2, '0')} / 36`;
      const mark = document.createElement('span');
      mark.className = 'card-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<span>♡</span><i></i>';
      top.append(number, mark);

      const bottom = document.createElement('span');
      bottom.className = 'card-bottom';
      const name = document.createElement('span');
      name.className = 'node-name';
      name.textContent = item.title;
      const meta = document.createElement('span');
      meta.className = 'node-meta';
      meta.textContent = `${item.specialty} · KHỐI ${item.grade}`;
      bottom.append(name, meta);
      const openLabel = document.createElement('span');
      openLabel.className = 'card-open-label';
      openLabel.innerHTML = 'MỞ LỜI NHẮN <span aria-hidden="true">↗</span>';
      button.append(top, bottom, openLabel);
      button.addEventListener('click', () => openLetter(item, button));
      fragment.append(button);
    });

    grid.replaceChildren(fragment);
    updateResults(items);
  }

  function resetFeedback() {
    $$('.feedback-options button').forEach(button => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    const thanks = $('#feedbackThanks');
    thanks.textContent = '';
    thanks.classList.remove('feedback-thanks-show');
  }

  function updateLetterNavigation() {
    const items = filteredLetters();
    const currentIndex = items.findIndex(item => item.id === state.activeLetter?.id);
    const previous = $('#previousLetter');
    const next = $('#nextLetter');
    const hasItems = items.length > 1 && currentIndex >= 0;

    previous.disabled = !hasItems;
    next.disabled = !hasItems;
    if (!hasItems) return;

    previous.querySelector('b').textContent = items[(currentIndex - 1 + items.length) % items.length].title;
    next.querySelector('b').textContent = items[(currentIndex + 1) % items.length].title;
  }

  function updateLetter(item) {
    state.activeLetter = item;
    const dialog = $('#letterDialog');
    dialog.className = `letter-dialog grade-${item.grade}`;
    $('#dialogGrade').textContent = `KHỐI ${item.grade} · ${item.specialty.toLocaleUpperCase('vi')}`;
    $('#dialogTitle').textContent = item.title;
    $('#dialogCopy').textContent = item.content || 'Lá thư đang được cập nhật.';
    $('#signoffClass').textContent = item.title.toLocaleUpperCase('vi');
    $('#dialogIndex').textContent = `${String(letters.indexOf(item) + 1).padStart(2, '0')} / 36`;
    resetFeedback();
    updateLetterNavigation();
    dialog.scrollTop = 0;
    $('.letter-content', dialog).scrollTop = 0;
  }

  function openLetter(item, triggerButton = null) {
    lastOpenedButton = triggerButton || (document.activeElement === document.body ? null : document.activeElement);
    updateLetter(item);
    const dialog = $('#letterDialog');
    if (!dialog.open) dialog.showModal();
    $('.letter-content', dialog).scrollTop = 0;
    $('#closeDialog').focus({ preventScroll: true });
  }

  function closeLetter() {
    const dialog = $('#letterDialog');
    if (dialog.open) dialog.close();
  }

  function moveLetter(direction) {
    const items = filteredLetters();
    if (items.length < 2 || !state.activeLetter) return;
    const index = items.findIndex(item => item.id === state.activeLetter.id);
    if (index < 0) return;
    const nextIndex = (index + direction + items.length) % items.length;
    updateLetter(items[nextIndex]);
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Clipboard permission unavailable');
  }

  function letterShareUrl(item) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('letter', item.id);
    return url.toString();
  }

  async function copyLetter() {
    if (!state.activeLetter) return;
    const item = state.activeLetter;
    const text = `${item.title} · Chuyên Hạ Long\n19.11.2026\n\n${item.content}\n\n${letterShareUrl(item)}`;
    try {
      await copyText(text);
      toast('Đã sao chép lời nhắn và đường dẫn của lớp.');
    } catch (error) {
      toast('Trình duyệt chưa cho phép sao chép. Hãy thử chia sẻ bằng nút bên cạnh.');
    }
  }

  async function shareLetter() {
    if (!state.activeLetter) return;
    const item = state.activeLetter;
    const url = letterShareUrl(item);
    const shareData = {
      title: `${item.title} · 19.11 Chuyên Hạ Long`,
      text: `Một lời nhắn dành cho ${item.title}.`,
      url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyText(url);
        toast('Đã sao chép đường dẫn riêng của lá thư.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast('Chưa thể chia sẻ lúc này. Hãy thử sao chép lời nhắn.');
    }
  }

  function syncGradeTabs() {
    $$('.grade-tab').forEach(tab => {
      const selected = tab.dataset.grade === state.grade;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
  }

  $('#closeDialog').addEventListener('click', closeLetter);
  $('#letterDialog').addEventListener('close', () => {
    if (lastOpenedButton?.isConnected) lastOpenedButton.focus({ preventScroll: true });
    else $('#heartSearch').focus({ preventScroll: true });
  });
  $('#letterDialog').addEventListener('click', event => {
    if (event.target === $('#letterDialog')) closeLetter();
  });
  $('#previousLetter').addEventListener('click', () => moveLetter(-1));
  $('#nextLetter').addEventListener('click', () => moveLetter(1));
  $('#copyLetter').addEventListener('click', copyLetter);
  $('#shareLetter').addEventListener('click', shareLetter);

  const feedbackReplies = [
    'Đã ghi nhận cảm nhận của cậu trên trang này ♡',
    'Một lời cảm ơn thật dễ thương ✦',
    'Mong rằng sự quan tâm này sẽ ở lại thật lâu ☀'
  ];
  $$('.feedback-options button').forEach((button, index) => button.addEventListener('click', () => {
    $$('.feedback-options button').forEach(candidate => {
      const chosen = candidate === button;
      candidate.classList.toggle('selected', chosen);
      candidate.setAttribute('aria-pressed', String(chosen));
    });
    const thanks = $('#feedbackThanks');
    thanks.textContent = feedbackReplies[index];
    thanks.classList.remove('feedback-thanks-show');
    window.requestAnimationFrame(() => thanks.classList.add('feedback-thanks-show'));
  }));

  $$('.grade-tab').forEach(button => button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    syncGradeTabs();
    renderHearts();
    if (state.activeLetter && !filteredLetters().some(item => item.id === state.activeLetter.id)) {
      const replacement = filteredLetters()[0];
      if (replacement) updateLetter(replacement);
      else closeLetter();
    } else if (state.activeLetter) {
      updateLetter(state.activeLetter);
    }
  }));

  $('#heartSearch').addEventListener('input', event => {
    state.query = event.target.value.trim();
    $('#clearSearch').hidden = !state.query;
    renderHearts();
    if (state.activeLetter) {
      const matches = filteredLetters();
      if (!matches.some(item => item.id === state.activeLetter.id)) {
        if (matches[0]) updateLetter(matches[0]);
        else closeLetter();
      } else {
        updateLetter(state.activeLetter);
      }
    }
  });

  $('#clearSearch').addEventListener('click', () => {
    $('#heartSearch').value = '';
    state.query = '';
    $('#clearSearch').hidden = true;
    renderHearts();
    $('#heartSearch').focus();
  });

  $('#resetFilters').addEventListener('click', () => {
    state.grade = 'all';
    state.query = '';
    $('#heartSearch').value = '';
    $('#clearSearch').hidden = true;
    syncGradeTabs();
    renderHearts();
  });

  $('#randomLetter').addEventListener('click', () => {
    const options = filteredLetters();
    if (!options.length) return toast('Không có lớp phù hợp để chọn ngẫu nhiên.');
    const item = options[Math.floor(Math.random() * options.length)];
    const trigger = $(`.class-card[data-id="${CSS.escape(item.id)}"]`);
    openLetter(item, trigger);
  });

  const inviteOriginal = {
    eyebrow: 'AND THEN, THE LETTERS',
    copy: 'Mỗi tập thể có một cách quan tâm riêng. Chọn tên lớp, mở lá thư và đọc trọn vẹn lời nhắn được gửi đến mình.',
    action: 'Đi đến vườn thư'
  };
  function resetFilmInvite() {
    $('#filmInvite').classList.remove('film-finished');
    $('#filmInviteEyebrow').textContent = inviteOriginal.eyebrow;
    $('#filmInviteCopy').textContent = inviteOriginal.copy;
    $('#filmInviteAction').textContent = inviteOriginal.action;
  }

  $('#memoryPlayer').addEventListener('loadedmetadata', () => {
    $('#memoryEmpty').hidden = true;
    $('#memoryPlayer').hidden = false;
    $('#mediaMeta').textContent = 'Một video · Chuyên Hạ Long 19.11';
  });
  $('#memoryPlayer').addEventListener('play', resetFilmInvite);
  $('#memoryPlayer').addEventListener('ended', () => {
    $('#filmInvite').classList.add('film-finished');
    $('#filmInviteCopy').textContent = 'Thước phim khép lại, nhưng những lời nhắn vẫn còn ở phía trước. Chọn một lớp để đọc tiếp nhé.';
    $('#filmInviteEyebrow').textContent = 'THE NEXT LITTLE SURPRISE';
    $('#filmInviteAction').textContent = 'Mở vườn lời nhắn';
  });
  $('#memoryPlayer').addEventListener('error', () => {
    $('#memoryPlayer').hidden = true;
    $('#memoryEmpty').hidden = false;
    $('#mediaMeta').textContent = 'Video chưa tải được. Vui lòng kiểm tra lại tệp.';
    toast('Video chưa tải được. Hãy kiểm tra lại tệp video nhé.');
  });

  $$('.mobile-dock a').forEach(link => link.addEventListener('click', () => {
    if (document.activeElement === $('#heartSearch')) $('#heartSearch').blur();
  }));

  // A shared URL can open a specific class letter directly.
  function openSharedLetter() {
    const id = new URLSearchParams(window.location.search).get('letter');
    if (!id) return;
    const item = letters.find(letter => letter.id === id);
    if (item) {
      window.setTimeout(() => openLetter(item), 80);
    } else {
      toast('Đường dẫn này không trỏ đến một lá thư hợp lệ.');
    }
  }

  const missingLetters = letters.filter(item => !item.content.trim());
  if (letters.length !== 36 || missingLetters.length) {
    console.warn('19.11 data check:', {
      classes: letters.length,
      missingLetters: missingLetters.map(item => item.id)
    });
  }

  renderHearts();
  openSharedLetter();
})();
