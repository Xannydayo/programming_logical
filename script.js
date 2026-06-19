/* ============================================================
   SELEKSI TEST — Programming & Logical IQ
   Edit array `questions` di bawah untuk menambah/mengubah soal.
   ============================================================ */

const CONFIG = {
  totalTimeSeconds: 70 * 60,
  storageKey: 'testProgressV3',
  warningThreshold: 5 * 60,
};

/* ----- SVG helpers (center-based, tidak miring) ----- */
const SVG = {
  wrap(content, w = 360, h = 100) {
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" shape-rendering="geometricPrecision">${content}</svg>`;
  },
  opt(content) {
    return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">${content}</svg>`;
  },
  circle(cx, cy, r, fill = 'var(--svg-fill-1)') {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  square(cx, cy, size, fill = 'var(--svg-fill-1)', angle = 0) {
    const h = size / 2;
    const base = `x="${cx - h}" y="${cy - h}" width="${size}" height="${size}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"`;
    if (!angle) return `<rect ${base}/>`;
    return `<rect ${base} transform="rotate(${angle} ${cx} ${cy})"/>`;
  },
  triUp(cx, cy, size, fill = 'var(--svg-fill-3)') {
    const h = (size * Math.sqrt(3)) / 2;
    return `<polygon points="${cx},${cy - h * 0.55} ${cx - size / 2},${cy + h * 0.45} ${cx + size / 2},${cy + h * 0.45}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  triRight(cx, cy, size, fill = 'var(--svg-fill-3)') {
    const h = (size * Math.sqrt(3)) / 2;
    return `<polygon points="${cx + size / 2},${cy} ${cx - size / 2},${cy - h / 2} ${cx - size / 2},${cy + h / 2}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  triLeft(cx, cy, size, fill = 'var(--svg-fill-3)') {
    const h = (size * Math.sqrt(3)) / 2;
    return `<polygon points="${cx - size / 2},${cy} ${cx + size / 2},${cy - h / 2} ${cx + size / 2},${cy + h / 2}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  triDown(cx, cy, size, fill = 'var(--svg-fill-3)') {
    const h = (size * Math.sqrt(3)) / 2;
    return `<polygon points="${cx},${cy + h * 0.55} ${cx - size / 2},${cy - h * 0.45} ${cx + size / 2},${cy - h * 0.45}" fill="${fill}" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  arrow(cx, cy, dir, len = 32) {
    const rot = { up: -90, right: 0, down: 90, left: 180 }[dir] ?? 0;
    const hl = len / 2;
    return `<g transform="translate(${cx},${cy}) rotate(${rot})"><line x1="${-hl}" y1="0" x2="${hl - 8}" y2="0" stroke="var(--svg-stroke)" stroke-width="3" stroke-linecap="round"/><polygon points="${hl},0 ${hl - 10},-6 ${hl - 10},6" fill="var(--svg-stroke)"/></g>`;
  },
  dots(count, cols, cx, cy, gap = 13) {
    const rows = Math.ceil(count / cols);
    const w = (cols - 1) * gap;
    const h = (rows - 1) * gap;
    const sx = cx - w / 2;
    const sy = cy - h / 2;
    let s = '';
    for (let i = 0; i < count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      s += `<circle cx="${sx + c * gap}" cy="${sy + r * gap}" r="4.5" fill="var(--svg-stroke)"/>`;
    }
    return s;
  },
  dotGrid(n, cx, cy, gap = 13) {
    return SVG.dots(n * n, n, cx, cy, gap);
  },
  star(cx, cy, r, points = 5) {
    let pts = '';
    for (let i = 0; i < points * 2; i++) {
      const rad = (Math.PI / points) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      pts += `${cx + Math.cos(rad) * rr},${cy + Math.sin(rad) * rr} `;
    }
    return `<polygon points="${pts.trim()}" fill="var(--svg-fill-3)" stroke="var(--svg-stroke)" stroke-width="2"/>`;
  },
  sep(x, y = 50) {
    return `<line x1="${x - 9}" y1="${y}" x2="${x + 5}" y2="${y}" stroke="var(--svg-stroke)" stroke-width="2.5" stroke-linecap="round"/><polygon points="${x + 7},${y} ${x},${y - 5} ${x},${y + 5}" fill="var(--svg-stroke)"/>`;
  },
  q(x, y = 50) {
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="var(--svg-stroke)">?</text>`;
  },
  fillSquare(cx, cy, size, fill) {
    return SVG.square(cx, cy, size, fill, 0);
  },
};

/* ============================================================
     HIGHLIGHT CODE — fixed: stash/restore prevents regex
     cross-contamination between strings, comments & keywords.
     Root cause of old bug:
       Python  → keywords processed BEFORE strings, so
                 class="keyword" inside HTML attr was re-matched
                 by the string regex → visible as literal text.
       HTML    → tag names highlighted first, then string regex
                 caught "keyword" inside attribute values.
     Fix: park strings/comments as opaque tokens (stash), run
     the remaining regexes, then restore the tokens.
  ============================================================ */
function highlightCode(code, lang = 'python') {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = escaped;

  /* tiny helpers — scoped inside each branch to stay isolated */
  function makeStash() {
    const tokens = [];
    const stash = (html) => {
      const key = `\x00T${tokens.length}\x00`;
      tokens.push(html);
      return key;
    };
    const restore = (s) => s.replace(/\x00T(\d+)\x00/g, (_, i) => tokens[+i]);
    return { stash, restore };
  }

  if (lang === 'python' || lang === 'oop') {
    const { stash, restore } = makeStash();

    // 1. Stash comments first (protect from everything below)
    out = out.replace(/(#.*)$/gm, (m) => stash(`<span class="comment">${m}</span>`));

    // 2. Stash string literals (protect from keyword regex)
    out = out.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => stash(`<span class="string">${m}</span>`));

    // 3. Keywords — safe now, no strings/comments left in `out`
    out = out.replace(/\b(def|return|if|else|elif|for|while|in|print|True|False|None|and|or|not|import|from|class|pass|break|continue|lambda|with|as|try|except|range|len|int|str|float|list|input)\b/g, '<span class="keyword">$1</span>');

    // 4. Numbers — applied before restore so they don't touch span attrs
    out = out.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

    // 5. Restore stashed tokens
    out = restore(out);
  } else if (lang === 'html') {
    const { stash, restore } = makeStash();

    // 1. Stash HTML comments
    out = out.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => stash(`<span class="comment">${m}</span>`));

    // 2. Stash attribute key="value" pairs BEFORE highlighting tag names
    //    (old code did tag names first → "keyword" in class="" got re-matched)
    out = out.replace(/([\w-]+=)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (_, attr, val) => stash(`<span class="function">${attr}</span><span class="string">${val}</span>`));

    // 3. Tag names — now safe, attribute strings are already stashed
    out = out.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="keyword">$2</span>');

    // 4. Numbers
    out = out.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

    // 5. Restore
    out = restore(out);
  } else if (lang === 'pseudocode') {
    // No string literals, so no stash needed
    out = out
      .replace(/\b(START|END|IF|THEN|ELSE|ENDIF|FOR|TO|ENDFOR|WHILE|ENDWHILE|DISPLAY|READ|INPUT|OUTPUT|MOD|AND|OR|NOT|REPEAT|UNTIL|DECLARE|PROCEDURE|FUNCTION|RETURN)\b/g, '<span class="keyword">$1</span>')
      .replace(/(<-)/g, '<span class="operator">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
  } else if (lang === 'css') {
    const { stash, restore } = makeStash();

    // 1. Stash block comments
    out = out.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => stash(`<span class="comment">${m}</span>`));

    // 2. Selectors  (.class, #id, element)
    out = out.replace(/([.#]?[\w-]+)(\s*\{)/g, '<span class="keyword">$1</span>$2');

    // 3. Property names  (color:, font-size:, …)
    out = out.replace(/([\w-]+)\s*:/g, '<span class="function">$1</span>:');

    // 4. Stash property values — after property names are done
    out = out.replace(/:\s*([^;}{]+)/g, (_, val) => ': ' + stash(`<span class="string">${val.trim()}</span>`));

    // 5. Numbers (only hit bare text now, not stashed spans)
    out = out.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

    // 6. Restore
    out = restore(out);
  }

  return out;
}

/* Escape HTML entities so labels like <head>, <nav> etc.
     render as visible text instead of being parsed as HTML tags. */
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSectionCounts() {
  const programming = questions.filter((q) => q.section === 'programming').length;
  const logic = questions.filter((q) => q.section === 'logic').length;
  return { programming, logic, total: questions.length };
}

function langLabel(q) {
  if (q.section === 'logic') return 'Logic / IQ';
  const map = { python: 'Python', html: 'HTML', css: 'CSS', oop: 'OOP', pseudocode: 'Pseudocode', javascript: 'JavaScript' };
  return map[q.lang] || 'Programming';
}

/* ============================================================
     DATA SOAL — 50 Programming (id 1-50) + 20 Logic/IQ (id 51-70) = 70
     ============================================================ */
const ORIGINAL_QUESTIONS = [
  /* PYTHON 1-15 */
  {
    id: 1,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print("Halo")',
    options: [
      { id: 'a', label: 'Halo', svg: null },
      { id: 'b', label: '"Halo"', svg: null },
      { id: 'c', label: 'Error', svg: null },
      { id: 'd', label: 'kosong', svg: null },
    ],
    answer: 'a',
    explanation: 'print() menampilkan teks tanpa tanda kutip: Halo.',
  },
  {
    id: 2,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(2 + 3)',
    options: [
      { id: 'a', label: '23', svg: null },
      { id: 'b', label: '5', svg: null },
      { id: 'c', label: '6', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'Operator + pada angka melakukan penjumlahan: 2 + 3 = 5.',
  },
  {
    id: 3,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(len([10, 20, 30]))',
    options: [
      { id: 'a', label: '2', svg: null },
      { id: 'b', label: '3', svg: null },
      { id: 'c', label: '30', svg: null },
      { id: 'd', label: '10', svg: null },
    ],
    answer: 'b',
    explanation: 'len() menghitung jumlah elemen dalam list. Ada 3 elemen.',
  },
  {
    id: 4,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print("Python"[0])',
    options: [
      { id: 'a', label: 'P', svg: null },
      { id: 'b', label: 'p', svg: null },
      { id: 'c', label: 'y', svg: null },
      { id: 'd', label: '0', svg: null },
    ],
    answer: 'a',
    explanation: 'Index 0 adalah karakter pertama string: huruf P.',
  },
  {
    id: 5,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)',
    options: [
      { id: 'a', label: '3', svg: null },
      { id: 'b', label: '6', svg: null },
      { id: 'c', label: '4', svg: null },
      { id: 'd', label: '10', svg: null },
    ],
    answer: 'b',
    explanation: 'range(1,4) = 1,2,3. Total = 1+2+3 = 6.',
  },
  {
    id: 6,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'x = 10\nif x > 5:\n    print("Besar")\nelse:\n    print("Kecil")',
    options: [
      { id: 'a', label: 'Besar', svg: null },
      { id: 'b', label: 'Kecil', svg: null },
      { id: 'c', label: '10', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'a',
    explanation: '10 > 5 bernilai True, sehingga mencetak "Besar".',
  },
  {
    id: 7,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(17 % 5)',
    options: [
      { id: 'a', label: '2', svg: null },
      { id: 'b', label: '3', svg: null },
      { id: 'c', label: '3.4', svg: null },
      { id: 'd', label: '0', svg: null },
    ],
    answer: 'a',
    explanation: 'Operator % (modulo) = sisa bagi: 17 / 5 sisa 2.',
  },
  {
    id: 8,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'buah = ["apel", "jeruk"]\nbuah.append("mangga")\nprint(len(buah))',
    options: [
      { id: 'a', label: '2', svg: null },
      { id: 'b', label: '3', svg: null },
      { id: 'c', label: 'mangga', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'append menambah elemen. List menjadi 3 item.',
  },
  {
    id: 9,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print("ha" * 3)',
    options: [
      { id: 'a', label: 'ha3', svg: null },
      { id: 'b', label: 'hahaha', svg: null },
      { id: 'c', label: 'ha ha ha', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'String * angka mengulang string: "ha" * 3 = "hahaha".',
  },
  {
    id: 10,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(type(7))',
    options: [
      { id: 'a', label: "<class 'str'>", svg: null },
      { id: 'b', label: "<class 'int'>", svg: null },
      { id: 'c', label: 'int', svg: null },
      { id: 'd', label: 'number', svg: null },
    ],
    answer: 'b',
    explanation: 'Angka 7 bertipe integer (int) di Python.',
  },
  {
    id: 11,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(list(range(3)))',
    options: [
      { id: 'a', label: '[0, 1, 2]', svg: null },
      { id: 'b', label: '[1, 2, 3]', svg: null },
      { id: 'c', label: '[0, 1, 2, 3]', svg: null },
      { id: 'd', label: '[3]', svg: null },
    ],
    answer: 'a',
    explanation: 'range(3) menghasilkan 0, 1, 2.',
  },
  {
    id: 12,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'print(True and False)',
    options: [
      { id: 'a', label: 'True', svg: null },
      { id: 'b', label: 'False', svg: null },
      { id: 'c', label: 'None', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'True and False = False (keduanya harus True agar hasil True).',
  },
  {
    id: 13,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'def tambah(a, b):\n    return a + b\nprint(tambah(4, 5))',
    options: [
      { id: 'a', label: '9', svg: null },
      { id: 'b', label: '45', svg: null },
      { id: 'c', label: 'None', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'a',
    explanation: 'Fungsi return 4 + 5 = 9.',
  },
  {
    id: 14,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'angka = [5, 10, 15]\nprint(angka[-1])',
    options: [
      { id: 'a', label: '5', svg: null },
      { id: 'b', label: '15', svg: null },
      { id: 'c', label: '-1', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'Index -1 = elemen terakhir list, yaitu 15.',
  },
  {
    id: 15,
    section: 'programming',
    type: 'code',
    lang: 'python',
    question: 'Apa output kode Python berikut?',
    codeSnippet: 'nilai = 85\nprint("Lulus" if nilai >= 75 else "Tidak")',
    options: [
      { id: 'a', label: 'Lulus', svg: null },
      { id: 'b', label: 'Tidak', svg: null },
      { id: 'c', label: '85', svg: null },
      { id: 'd', label: 'True', svg: null },
    ],
    answer: 'a',
    explanation: '85 >= 75 -> kondisi True, output "Lulus".',
  },

  /* HTML 16-28 */
  {
    id: 16,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Tag HTML manakah yang tepat untuk paragraf teks?',
    codeSnippet: '<p>Ini paragraf</p>',
    options: [
      { id: 'a', label: '<p>', svg: null },
      { id: 'b', label: '<div>', svg: null },
      { id: 'c', label: '<span>', svg: null },
      { id: 'd', label: '<text>', svg: null },
    ],
    answer: 'a',
    explanation: 'Tag <p> digunakan untuk paragraf.',
  },
  {
    id: 17,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Elemen manakah yang akan tampil paling besar (heading utama)?',
    codeSnippet: '<h1>Judul Utama</h1>\n<h2>Subjudul</h2>\n<p>Paragraf</p>',
    options: [
      { id: 'a', label: 'Judul Utama (h1)', svg: null },
      { id: 'b', label: 'Subjudul (h2)', svg: null },
      { id: 'c', label: 'Paragraf (p)', svg: null },
      { id: 'd', label: 'Sama besar', svg: null },
    ],
    answer: 'a',
    explanation: '<h1> adalah heading level tertinggi, tampil paling besar.',
  },
  {
    id: 18,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Atribut manakah yang benar untuk membuat link ke URL?',
    codeSnippet: '<a href="https://example.com">Kunjungi</a>',
    options: [
      { id: 'a', label: 'src', svg: null },
      { id: 'b', label: 'href', svg: null },
      { id: 'c', label: 'link', svg: null },
      { id: 'd', label: 'url', svg: null },
    ],
    answer: 'b',
    explanation: 'Atribut href menentukan tujuan hyperlink.',
  },
  {
    id: 19,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Apa fungsi atribut alt pada tag img?',
    codeSnippet: '<img src="foto.jpg" alt="Foto profil">',
    options: [
      { id: 'a', label: 'Mengatur ukuran gambar', svg: null },
      { id: 'b', label: 'Teks alternatif jika gambar gagal dimuat', svg: null },
      { id: 'c', label: 'Menyimpan URL gambar', svg: null },
      { id: 'd', label: 'Menyembunyikan gambar', svg: null },
    ],
    answer: 'b',
    explanation: 'alt memberi deskripsi aksesibilitas/fallback untuk gambar.',
  },
  {
    id: 20,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Struktur manakah yang benar untuk list bullet?',
    codeSnippet: '<ul>\n  <li>Apel</li>\n  <li>Jeruk</li>\n</ul>',
    options: [
      { id: 'a', label: '<ul> + <li>', svg: null },
      { id: 'b', label: '<ol> + <p>', svg: null },
      { id: 'c', label: '<list> + <item>', svg: null },
      { id: 'd', label: '<dl> + <dt>', svg: null },
    ],
    answer: 'a',
    explanation: 'Unordered list = <ul> berisi item <li>.',
  },
  {
    id: 21,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Tag manakah untuk baris baru tanpa paragraf baru?',
    codeSnippet: 'Baris pertama<br>Baris kedua',
    options: [
      { id: 'a', label: '<br>', svg: null },
      { id: 'b', label: '<hr>', svg: null },
      { id: 'c', label: '<break>', svg: null },
      { id: 'd', label: '<newline>', svg: null },
    ],
    answer: 'a',
    explanation: '<br> = line break, pindah baris di dalam elemen yang sama.',
  },
  {
    id: 22,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Tag manakah untuk teks tebal (bold)?',
    codeSnippet: '<strong>Penting</strong>',
    options: [
      { id: 'a', label: '<em>', svg: null },
      { id: 'b', label: '<strong>', svg: null },
      { id: 'c', label: '<bold>', svg: null },
      { id: 'd', label: '<i>', svg: null },
    ],
    answer: 'b',
    explanation: '<strong> menandai teks penting/tebal.',
  },
  {
    id: 23,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Input manakah untuk mengisi teks satu baris?',
    codeSnippet: '<input type="text" name="nama">',
    options: [
      { id: 'a', label: 'type="text"', svg: null },
      { id: 'b', label: 'type="password"', svg: null },
      { id: 'c', label: 'type="checkbox"', svg: null },
      { id: 'd', label: 'type="submit"', svg: null },
    ],
    answer: 'a',
    explanation: 'type="text" untuk input teks biasa.',
  },
  {
    id: 24,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Syntax komentar HTML yang benar?',
    codeSnippet: '<!-- ini komentar -->',
    options: [
      { id: 'a', label: '<!-- -->', svg: null },
      { id: 'b', label: '// komentar', svg: null },
      { id: 'c', label: '/* komentar */', svg: null },
      { id: 'd', label: '# komentar', svg: null },
    ],
    answer: 'a',
    explanation: 'Komentar HTML: <!-- teks -->.',
  },
  {
    id: 25,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Elemen manakah yang berisi metadata halaman (tidak tampil di body)?',
    codeSnippet: '<head>\n  <title>Halaman Saya</title>\n</head>',
    options: [
      { id: 'a', label: '<head>', svg: null },
      { id: 'b', label: '<body>', svg: null },
      { id: 'c', label: '<main>', svg: null },
      { id: 'd', label: '<footer>', svg: null },
    ],
    answer: 'a',
    explanation: '<head> berisi meta, title, link CSS — tidak ditampilkan langsung.',
  },
  {
    id: 26,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Tag semantic manakah untuk navigasi menu?',
    codeSnippet: '<nav>\n  <a href="/">Home</a>\n</nav>',
    options: [
      { id: 'a', label: '<nav>', svg: null },
      { id: 'b', label: '<menu>', svg: null },
      { id: 'c', label: '<navigation>', svg: null },
      { id: 'd', label: '<header>', svg: null },
    ],
    answer: 'a',
    explanation: '<nav> = landmark navigasi (HTML5 semantic).',
  },
  {
    id: 27,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Atribut manakah agar link terbuka di tab baru?',
    codeSnippet: '<a href="url" target="_blank">Buka</a>',
    options: [
      { id: 'a', label: 'target="_blank"', svg: null },
      { id: 'b', label: 'new="tab"', svg: null },
      { id: 'c', label: 'open="new"', svg: null },
      { id: 'd', label: 'tab="blank"', svg: null },
    ],
    answer: 'a',
    explanation: 'target="_blank" membuka link di tab/jendela baru.',
  },
  {
    id: 28,
    section: 'programming',
    type: 'code',
    lang: 'html',
    question: 'Tag manakah untuk kontainer utama isi halaman?',
    codeSnippet: '<main>\n  <h1>Artikel</h1>\n  <p>Isi...</p>\n</main>',
    options: [
      { id: 'a', label: '<main>', svg: null },
      { id: 'b', label: '<section>', svg: null },
      { id: 'c', label: '<article>', svg: null },
      { id: 'd', label: '<div>', svg: null },
    ],
    answer: 'a',
    explanation: '<main> = konten utama halaman (satu per halaman).',
  },

  /* CSS 29-40 */
  {
    id: 29,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti CSS manakah untuk mengubah warna teks?',
    codeSnippet: 'p {\n  color: blue;\n}',
    options: [
      { id: 'a', label: 'color', svg: null },
      { id: 'b', label: 'background', svg: null },
      { id: 'c', label: 'font-color', svg: null },
      { id: 'd', label: 'text-color', svg: null },
    ],
    answer: 'a',
    explanation: 'color mengatur warna teks.',
  },
  {
    id: 30,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti manakah untuk jarak LUAR elemen (di luar border)?',
    codeSnippet: '.box {\n  margin: 20px;\n}',
    options: [
      { id: 'a', label: 'padding', svg: null },
      { id: 'b', label: 'margin', svg: null },
      { id: 'c', label: 'border', svg: null },
      { id: 'd', label: 'gap', svg: null },
    ],
    answer: 'b',
    explanation: 'Margin = ruang di luar border. Padding = ruang di dalam border.',
  },
  {
    id: 31,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Selector manakah untuk class "btn"?',
    codeSnippet: '.btn {\n  padding: 8px 16px;\n}',
    options: [
      { id: 'a', label: '.btn', svg: null },
      { id: 'b', label: '#btn', svg: null },
      { id: 'c', label: 'btn', svg: null },
      { id: 'd', label: '*btn', svg: null },
    ],
    answer: 'a',
    explanation: 'Class selector diawali titik: .btn.',
  },
  {
    id: 32,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Selector manakah untuk id "header"?',
    codeSnippet: '#header {\n  height: 60px;\n}',
    options: [
      { id: 'a', label: '.header', svg: null },
      { id: 'b', label: '#header', svg: null },
      { id: 'c', label: 'header', svg: null },
      { id: 'd', label: '@header', svg: null },
    ],
    answer: 'b',
    explanation: 'ID selector diawali hash: #header.',
  },
  {
    id: 33,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Nilai display manakah agar elemen memenuhi lebar baris penuh?',
    codeSnippet: 'div {\n  display: block;\n}',
    options: [
      { id: 'a', label: 'inline', svg: null },
      { id: 'b', label: 'block', svg: null },
      { id: 'c', label: 'hidden', svg: null },
      { id: 'd', label: 'none', svg: null },
    ],
    answer: 'b',
    explanation: 'display: block -> elemen block-level, lebar penuh baris.',
  },
  {
    id: 34,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti manakah untuk menengahkan teks secara horizontal?',
    codeSnippet: 'h1 {\n  text-align: center;\n}',
    options: [
      { id: 'a', label: 'align: center', svg: null },
      { id: 'b', label: 'text-align: center', svg: null },
      { id: 'c', label: 'margin: auto', svg: null },
      { id: 'd', label: 'justify: center', svg: null },
    ],
    answer: 'b',
    explanation: 'text-align: center menengahkan teks di dalam elemen.',
  },
  {
    id: 35,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti manakah untuk ukuran huruf?',
    codeSnippet: 'body {\n  font-size: 16px;\n}',
    options: [
      { id: 'a', label: 'text-size', svg: null },
      { id: 'b', label: 'font-size', svg: null },
      { id: 'c', label: 'size', svg: null },
      { id: 'd', label: 'letter-size', svg: null },
    ],
    answer: 'b',
    explanation: 'font-size mengatur ukuran font.',
  },
  {
    id: 36,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti manakah untuk jarak DI DALAM border elemen?',
    codeSnippet: '.card {\n  padding: 12px;\n}',
    options: [
      { id: 'a', label: 'margin', svg: null },
      { id: 'b', label: 'padding', svg: null },
      { id: 'c', label: 'spacing', svg: null },
      { id: 'd', label: 'outline', svg: null },
    ],
    answer: 'b',
    explanation: 'Padding = ruang antara konten dan border.',
  },
  {
    id: 37,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'flex-direction manakah agar item flex tersusun vertikal?',
    codeSnippet: '.flex {\n  display: flex;\n  flex-direction: column;\n}',
    options: [
      { id: 'a', label: 'row', svg: null },
      { id: 'b', label: 'column', svg: null },
      { id: 'c', label: 'vertical', svg: null },
      { id: 'd', label: 'stack', svg: null },
    ],
    answer: 'b',
    explanation: 'flex-direction: column -> item ditumpuk dari atas ke bawah.',
  },
  {
    id: 38,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Pseudo-class manakah untuk style saat mouse di atas elemen?',
    codeSnippet: 'button:hover {\n  background: gray;\n}',
    options: [
      { id: 'a', label: ':active', svg: null },
      { id: 'b', label: ':hover', svg: null },
      { id: 'c', label: ':focus', svg: null },
      { id: 'd', label: ':click', svg: null },
    ],
    answer: 'b',
    explanation: ':hover aktif saat kursor berada di atas elemen.',
  },
  {
    id: 39,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Selector manakah yang lebih spesifik (prioritas lebih tinggi)?',
    codeSnippet: '#menu .item { color: red; }\n.item { color: blue; }',
    options: [
      { id: 'a', label: '.item saja', svg: null },
      { id: 'b', label: '#menu .item', svg: null },
      { id: 'c', label: 'Sama spesifik', svg: null },
      { id: 'd', label: 'Bergantung urutan saja', svg: null },
    ],
    answer: 'b',
    explanation: 'ID + class lebih spesifik dari class saja -> menang.',
  },
  {
    id: 40,
    section: 'programming',
    type: 'code',
    lang: 'css',
    question: 'Properti manakah untuk sudut melengkung kotak?',
    codeSnippet: '.btn {\n  border-radius: 8px;\n}',
    options: [
      { id: 'a', label: 'border-radius', svg: null },
      { id: 'b', label: 'round-corner', svg: null },
      { id: 'c', label: 'corner-radius', svg: null },
      { id: 'd', label: 'radius-border', svg: null },
    ],
    answer: 'a',
    explanation: 'border-radius membulatkan sudut elemen.',
  },

  /* OOP 41-46 */
  {
    id: 41,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Apa output kode Python OOP berikut?',
    codeSnippet: 'class Hewan:\n    def suara(self):\n        return "..."\n\nclass Kucing(Hewan):\n    def suara(self):\n        return "Meow"\n\nk = Kucing()\nprint(k.suara())',
    options: [
      { id: 'a', label: 'Meow', svg: null },
      { id: 'b', label: '...', svg: null },
      { id: 'c', label: 'Kucing', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'a',
    explanation: 'Method suara() di class Kucing menimpa (override) method parent. Output: Meow.',
  },
  {
    id: 42,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Apa output kode Python OOP berikut?',
    codeSnippet: 'class User:\n    def __init__(self, nama):\n        self.nama = nama\n\nu = User("Budi")\nprint(u.nama)',
    options: [
      { id: 'a', label: 'Budi', svg: null },
      { id: 'b', label: 'User', svg: null },
      { id: 'c', label: 'nama', svg: null },
      { id: 'd', label: 'None', svg: null },
    ],
    answer: 'a',
    explanation: '__init__ menyimpan parameter ke self.nama. u.nama = "Budi".',
  },
  {
    id: 43,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Apa output kode Python OOP berikut?',
    codeSnippet: 'class Counter:\n    count = 0\n    def __init__(self):\n        Counter.count += 1\n\nCounter()\nCounter()\nprint(Counter.count)',
    options: [
      { id: 'a', label: '0', svg: null },
      { id: 'b', label: '1', svg: null },
      { id: 'c', label: '2', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'c',
    explanation: 'count adalah atribut class. Dua objek dibuat, count menjadi 2.',
  },
  {
    id: 44,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Konsep OOP manakah yang menggambarkan "satu bentuk, banyak implementasi"?',
    codeSnippet: 'class Bentuk:\n    def luas(self):\n        pass\n\nclass Persegi(Bentuk):\n    def __init__(self, s):\n        self.s = s\n    def luas(self):\n        return self.s * self.s',
    options: [
      { id: 'a', label: 'Polimorfisme', svg: null },
      { id: 'b', label: 'Enkapsulasi', svg: null },
      { id: 'c', label: 'Abstraksi DB', svg: null },
      { id: 'd', label: 'Compiling', svg: null },
    ],
    answer: 'a',
    explanation: 'Polimorfisme: subclass punya implementasi method sendiri (luas) untuk bentuk berbeda.',
  },
  {
    id: 45,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Apa output kode Python OOP berikut?',
    codeSnippet:
      'class BankAccount:\n    def __init__(self):\n        self._saldo = 0\n    def deposit(self, jumlah):\n        self._saldo += jumlah\n    def get_saldo(self):\n        return self._saldo\n\nacc = BankAccount()\nacc.deposit(100)\nprint(acc.get_saldo())',
    options: [
      { id: 'a', label: '0', svg: null },
      { id: 'b', label: '100', svg: null },
      { id: 'c', label: '_saldo', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'b',
    explanation: 'Enkapsulasi: saldo diakses lewat method deposit/get_saldo. Hasil 100.',
  },
  {
    id: 46,
    section: 'programming',
    type: 'code',
    lang: 'oop',
    question: 'Apa fungsi parameter self pada method instance di Python?',
    codeSnippet: 'class Mobil:\n    def jalan(self):\n        return "jalan"\n\n# self merujuk ke...',
    options: [
      { id: 'a', label: 'Objek instance itu sendiri', svg: null },
      { id: 'b', label: 'Class parent', svg: null },
      { id: 'c', label: 'Module Python', svg: null },
      { id: 'd', label: 'Variabel global', svg: null },
    ],
    answer: 'a',
    explanation: 'self adalah referensi ke instance objek yang memanggil method.',
  },

  /* PSEUDOCODE 47-50 */
  {
    id: 47,
    section: 'programming',
    type: 'code',
    lang: 'pseudocode',
    question: 'Apa output pseudocode berikut?',
    codeSnippet: 'x <- 10\nIF x > 5 THEN\n    DISPLAY "Besar"\nELSE\n    DISPLAY "Kecil"\nEND IF',
    options: [
      { id: 'a', label: 'Besar', svg: null },
      { id: 'b', label: 'Kecil', svg: null },
      { id: 'c', label: '10', svg: null },
      { id: 'd', label: 'Error', svg: null },
    ],
    answer: 'a',
    explanation: '10 > 5 benar, jalur THEN dieksekusi: tampil "Besar".',
  },
  {
    id: 48,
    section: 'programming',
    type: 'code',
    lang: 'pseudocode',
    question: 'Apa nilai total setelah pseudocode berikut?',
    codeSnippet: 'total <- 0\nFOR i <- 1 TO 3\n    total <- total + i\nEND FOR\nDISPLAY total',
    options: [
      { id: 'a', label: '3', svg: null },
      { id: 'b', label: '6', svg: null },
      { id: 'c', label: '9', svg: null },
      { id: 'd', label: '0', svg: null },
    ],
    answer: 'b',
    explanation: 'Loop menjumlahkan 1+2+3 = 6.',
  },
  {
    id: 49,
    section: 'programming',
    type: 'code',
    lang: 'pseudocode',
    question: 'Berapa kali DISPLAY "Halo" dieksekusi?',
    codeSnippet: 'count <- 0\nWHILE count < 3\n    DISPLAY "Halo"\n    count <- count + 1\nEND WHILE',
    options: [
      { id: 'a', label: '2', svg: null },
      { id: 'b', label: '3', svg: null },
      { id: 'c', label: '4', svg: null },
      { id: 'd', label: 'Tidak pernah', svg: null },
    ],
    answer: 'b',
    explanation: 'count = 0,1,2 -> loop 3 kali sebelum count < 3 salah.',
  },
  {
    id: 50,
    section: 'programming',
    type: 'code',
    lang: 'pseudocode',
    question: 'Apa output pseudocode berikut?',
    codeSnippet: 'A <- 5\nB <- 2\nIF A MOD B = 0 THEN\n    DISPLAY "Genap"\nELSE\n    DISPLAY "Ganjil"\nEND IF',
    options: [
      { id: 'a', label: 'Genap', svg: null },
      { id: 'b', label: 'Ganjil', svg: null },
      { id: 'c', label: '2', svg: null },
      { id: 'd', label: '5', svg: null },
    ],
    answer: 'b',
    explanation: '5 MOD 2 = 1 (bukan 0), masuk ELSE: "Ganjil".',
  },

  /* LOGIC / IQ 51-70 */
  {
    id: 51,
    section: 'logic',
    type: 'svg',
    question: 'Bentuk manakah yang melanjutkan pola: Lingkaran -> Persegi -> Segitiga -> ?',
    svg: SVG.wrap(SVG.circle(45, 50, 20) + SVG.sep(85) + SVG.square(125, 50, 34, 'var(--svg-fill-2)') + SVG.sep(165) + SVG.triUp(205, 52, 34) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: 'Lingkaran', svg: SVG.opt(SVG.circle(40, 40, 22)) },
      { id: 'b', label: 'Persegi', svg: SVG.opt(SVG.square(40, 40, 34, 'var(--svg-fill-2)')) },
      { id: 'c', label: 'Segitiga', svg: SVG.opt(SVG.triUp(40, 42, 34)) },
      { id: 'd', label: 'Bintang', svg: SVG.opt(SVG.star(40, 40, 22, 5)) },
    ],
    answer: 'a',
    explanation: 'Pola berulang setiap 3 bentuk. Setelah segitiga, kembali ke lingkaran.',
  },
  {
    id: 52,
    section: 'logic',
    type: 'svg',
    question: 'Berapa titik pada langkah berikutnya? (1 -> 2 -> 3 -> ?)',
    svg: SVG.wrap(SVG.dots(1, 1, 45, 50) + SVG.sep(85) + SVG.dots(2, 2, 125, 50) + SVG.sep(165) + SVG.dots(3, 2, 205, 50) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '3 titik', svg: SVG.opt(SVG.dots(3, 3, 40, 40)) },
      { id: 'b', label: '4 titik', svg: SVG.opt(SVG.dots(4, 2, 40, 40)) },
      { id: 'c', label: '5 titik', svg: SVG.opt(SVG.dots(5, 3, 40, 40)) },
      { id: 'd', label: '6 titik', svg: SVG.opt(SVG.dots(6, 3, 40, 40)) },
    ],
    answer: 'b',
    explanation: 'Jumlah titik naik 1 setiap langkah: 1, 2, 3, 4.',
  },
  {
    id: 53,
    section: 'logic',
    type: 'svg',
    question: 'Panah manakah berikutnya? Pola rotasi 90 derajat searah jarum jam (lihat urutan panah di gambar).',
    svg: SVG.wrap(SVG.arrow(45, 50, 'up') + SVG.sep(85) + SVG.arrow(125, 50, 'right') + SVG.sep(165) + SVG.arrow(205, 50, 'down') + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: 'Atas', svg: SVG.opt(SVG.arrow(40, 40, 'up')) },
      { id: 'b', label: 'Kanan', svg: SVG.opt(SVG.arrow(40, 40, 'right')) },
      { id: 'c', label: 'Bawah', svg: SVG.opt(SVG.arrow(40, 40, 'down')) },
      { id: 'd', label: 'Kiri', svg: SVG.opt(SVG.arrow(40, 40, 'left')) },
    ],
    answer: 'd',
    explanation: 'Rotasi 90 derajat CW: atas -> kanan -> bawah -> kiri.',
  },
  {
    id: 54,
    section: 'logic',
    type: 'svg',
    question: 'Warna kotak berikutnya? Pola: Biru -> Hijau -> Biru -> Hijau -> ?',
    svg: SVG.wrap(
      SVG.square(35, 50, 30, '#2563eb') +
        SVG.square(75, 50, 30, '#059669') +
        SVG.square(115, 50, 30, '#2563eb') +
        SVG.square(155, 50, 30, '#059669') +
        '<rect x="185" y="35" width="30" height="30" fill="none" stroke="var(--svg-stroke)" stroke-width="2" stroke-dasharray="4"/>' +
        SVG.q(200, 50),
      240,
      100,
    ),
    options: [
      { id: 'a', label: 'Biru', svg: SVG.opt(SVG.square(40, 40, 32, '#2563eb')) },
      { id: 'b', label: 'Hijau', svg: SVG.opt(SVG.square(40, 40, 32, '#059669')) },
      { id: 'c', label: 'Oranye', svg: SVG.opt(SVG.square(40, 40, 32, '#d97706')) },
      { id: 'd', label: 'Ungu', svg: SVG.opt(SVG.square(40, 40, 32, '#7c3aed')) },
    ],
    answer: 'a',
    explanation: 'Pola bergantian biru-hijau. Setelah hijau, berikutnya biru.',
  },
  {
    id: 55,
    section: 'logic',
    type: 'svg',
    question: 'Ukuran persegi berikutnya? Pola: kecil -> sedang -> besar -> ?',
    svg: SVG.wrap(SVG.square(45, 50, 14) + SVG.sep(85) + SVG.square(125, 50, 24) + SVG.sep(165) + SVG.square(205, 50, 34) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '14px', svg: SVG.opt(SVG.square(40, 40, 14)) },
      { id: 'b', label: '24px', svg: SVG.opt(SVG.square(40, 40, 24)) },
      { id: 'c', label: '34px', svg: SVG.opt(SVG.square(40, 40, 34)) },
      { id: 'd', label: '44px', svg: SVG.opt(SVG.square(40, 40, 44)) },
    ],
    answer: 'd',
    explanation: 'Ukuran naik 10 setiap langkah: 14 -> 24 -> 34 -> 44.',
  },
  {
    id: 56,
    section: 'logic',
    type: 'svg',
    question: 'Analogi: lingkaran kecil : lingkaran besar = segitiga kecil : ?',
    svg: SVG.wrap(
      SVG.circle(35, 50, 10) +
        '<text x="58" y="50" text-anchor="middle" dominant-baseline="middle" font-size="14">:</text>' +
        SVG.circle(78, 50, 20) +
        '<text x="108" y="50" text-anchor="middle" dominant-baseline="middle" font-size="14">=</text>' +
        SVG.triUp(138, 52, 22) +
        '<text x="168" y="50" text-anchor="middle" dominant-baseline="middle" font-size="14">:</text>' +
        SVG.q(198, 50),
      240,
      100,
    ),
    options: [
      { id: 'a', label: 'Segitiga kecil', svg: SVG.opt(SVG.triUp(40, 42, 22)) },
      { id: 'b', label: 'Segitiga besar', svg: SVG.opt(SVG.triUp(40, 42, 40)) },
      { id: 'c', label: 'Persegi besar', svg: SVG.opt(SVG.square(40, 40, 38, 'var(--svg-fill-2)')) },
      { id: 'd', label: 'Lingkaran kecil', svg: SVG.opt(SVG.circle(40, 40, 12)) },
    ],
    answer: 'b',
    explanation: 'Relasi ukuran kecil:besar diterapkan pada segitiga -> segitiga besar.',
  },
  {
    id: 57,
    section: 'logic',
    type: 'svg',
    question: 'Warna yang melengkapi grid 2x2 (diagonal sama)?',
    svg: SVG.wrap(
      '<rect x="30" y="20" width="88" height="88" fill="none" stroke="var(--svg-stroke)" stroke-width="2"/>' +
        SVG.square(52, 42, 34, 'var(--svg-fill-1)') +
        SVG.square(96, 42, 34, 'var(--svg-fill-2)') +
        SVG.square(52, 86, 34, 'var(--svg-fill-2)') +
        '<rect x="79" y="69" width="34" height="34" fill="none" stroke="var(--svg-stroke)" stroke-width="2" stroke-dasharray="4"/>' +
        SVG.q(96, 86),
      200,
      120,
    ),
    options: [
      { id: 'a', label: 'Biru', svg: SVG.opt(SVG.square(40, 40, 36, 'var(--svg-fill-1)')) },
      { id: 'b', label: 'Hijau', svg: SVG.opt(SVG.square(40, 40, 36, 'var(--svg-fill-2)')) },
      { id: 'c', label: 'Oranye', svg: SVG.opt(SVG.square(40, 40, 36, 'var(--svg-fill-3)')) },
      { id: 'd', label: 'Kosong', svg: SVG.opt('<rect x="22" y="22" width="36" height="36" fill="none" stroke="var(--svg-stroke)" stroke-width="2"/>') },
    ],
    answer: 'a',
    explanation: 'Diagonal kiri-atas & kanan-bawah sama warna: biru-hijau-hijau-biru.',
  },
  {
    id: 58,
    section: 'logic',
    type: 'svg',
    question: 'Cermin vertikal (garis tengah): segitiga puncak kiri. Hasil cermin?',
    svg: SVG.wrap(SVG.triRight(55, 50, 36) + '<line x1="110" y1="15" x2="110" y2="85" stroke="var(--svg-stroke)" stroke-width="2" stroke-dasharray="5"/>' + SVG.q(155, 50), 200, 100),
    options: [
      { id: 'a', label: 'Puncak kanan', svg: SVG.opt(SVG.triLeft(40, 40, 36)) },
      { id: 'b', label: 'Sama (puncak kiri)', svg: SVG.opt(SVG.triRight(40, 40, 36)) },
      { id: 'c', label: 'Puncak atas', svg: SVG.opt(SVG.triUp(40, 42, 36)) },
      { id: 'd', label: 'Lingkaran', svg: SVG.opt(SVG.circle(40, 40, 22)) },
    ],
    answer: 'a',
    explanation: 'Cermin vertikal membalik horizontal: puncak kiri -> puncak kanan.',
  },
  {
    id: 59,
    section: 'logic',
    type: 'svg',
    question: 'Tumpukan: lapisan 1 + 2 + 3 kubus. Total kubus?',
    svg: SVG.wrap(
      SVG.square(70, 72, 22, 'var(--svg-fill-1)') +
        SVG.square(58, 54, 22, 'var(--svg-fill-2)') +
        SVG.square(82, 54, 22, 'var(--svg-fill-2)') +
        SVG.square(70, 36, 22, 'var(--svg-fill-3)') +
        '<text x="130" y="50" font-size="13" fill="var(--neutral-600)">1 + 2 + 3 = ?</text>',
      220,
      100,
    ),
    options: [
      { id: 'a', label: '3', svg: SVG.opt(SVG.dots(3, 3, 40, 40)) },
      { id: 'b', label: '5', svg: SVG.opt(SVG.dots(5, 3, 40, 40)) },
      { id: 'c', label: '6', svg: SVG.opt(SVG.dots(6, 3, 40, 40)) },
      { id: 'd', label: '7', svg: SVG.opt(SVG.dots(7, 4, 40, 40)) },
    ],
    answer: 'c',
    explanation: '1 + 2 + 3 = 6 kubus.',
  },
  {
    id: 60,
    section: 'logic',
    type: 'svg',
    question: 'Grid nxn: 2x2 -> 3x3 -> 4x4 -> ?',
    svg: SVG.wrap(SVG.dotGrid(2, 45, 50) + SVG.sep(85) + SVG.dotGrid(3, 125, 50) + SVG.sep(165) + SVG.dotGrid(4, 205, 50) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '4x4 (16)', svg: SVG.opt(SVG.dotGrid(4, 40, 40)) },
      { id: 'b', label: '5x5 (25)', svg: SVG.opt(SVG.dotGrid(5, 40, 40)) },
      { id: 'c', label: '6x6 (36)', svg: SVG.opt(SVG.dotGrid(6, 40, 40)) },
      { id: 'd', label: '5x4 (20)', svg: SVG.opt(SVG.dots(20, 5, 40, 40)) },
    ],
    answer: 'b',
    explanation: 'Side grid naik 1: 2^2=4, 3^2=9, 4^2=16, berikutnya 5^2=25.',
  },
  {
    id: 61,
    section: 'logic',
    type: 'svg',
    question: 'Panah manakah berikutnya? Pola rotasi 90 derajat searah jarum jam (lihat gambar).',
    svg: SVG.wrap(SVG.arrow(45, 50, 'right') + SVG.sep(85) + SVG.arrow(125, 50, 'down') + SVG.sep(165) + SVG.arrow(205, 50, 'left') + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: 'Atas', svg: SVG.opt(SVG.arrow(40, 40, 'up')) },
      { id: 'b', label: 'Kanan', svg: SVG.opt(SVG.arrow(40, 40, 'right')) },
      { id: 'c', label: 'Bawah', svg: SVG.opt(SVG.arrow(40, 40, 'down')) },
      { id: 'd', label: 'Kiri', svg: SVG.opt(SVG.arrow(40, 40, 'left')) },
    ],
    answer: 'a',
    explanation: 'Rotasi 90 derajat CW: kanan -> bawah -> kiri -> atas.',
  },
  {
    id: 62,
    section: 'logic',
    type: 'svg',
    question: 'Pola nested: lingkaran solid dalam lingkaran hollow -> persegi solid dalam persegi hollow -> ?',
    svg: SVG.wrap(
      '<circle cx="45" cy="50" r="22" fill="none" stroke="var(--svg-fill-1)" stroke-width="3"/>' +
        SVG.circle(45, 50, 12) +
        SVG.sep(85) +
        '<rect x="99" y="28" width="44" height="44" fill="none" stroke="var(--svg-fill-2)" stroke-width="3"/>' +
        SVG.square(121, 50, 24, 'var(--svg-fill-2)') +
        SVG.sep(165) +
        SVG.q(205, 50),
      260,
      100,
    ),
    options: [
      {
        id: 'a',
        label: 'segitiga dalam segitiga',
        svg: SVG.opt('<polygon points="40,16 16,64 64,64" fill="none" stroke="var(--svg-fill-3)" stroke-width="2"/><polygon points="40,30 26,54 54,54" fill="var(--svg-fill-3)" stroke="var(--svg-stroke)" stroke-width="1.5"/>'),
      },
      { id: 'b', label: 'lingkaran dalam persegi', svg: SVG.opt('<rect x="18" y="18" width="44" height="44" fill="none" stroke="var(--svg-fill-2)" stroke-width="2"/>' + SVG.circle(40, 40, 14)) },
      { id: 'c', label: 'persegi dalam lingkaran', svg: SVG.opt('<circle cx="40" cy="40" r="28" fill="none" stroke="var(--svg-fill-1)" stroke-width="2"/>' + SVG.square(40, 40, 22, 'var(--svg-fill-2)')) },
      { id: 'd', label: 'Dua lingkaran', svg: SVG.opt(SVG.circle(28, 40, 14) + SVG.circle(52, 40, 14)) },
    ],
    answer: 'a',
    explanation: 'Bentuk berganti: lingkaran -> persegi -> segitiga (masing-masing nested).',
  },
  {
    id: 63,
    section: 'logic',
    type: 'svg',
    question: 'Jumlah garis diagonal dalam persegi: 1 -> 2 -> ? (pola +1 setiap 2 langkah)',
    svg: SVG.wrap(
      SVG.square(45, 50, 34, 'none') +
        '<line x1="28" y1="33" x2="62" y2="67" stroke="var(--svg-stroke)" stroke-width="2"/>' +
        SVG.sep(85) +
        SVG.square(125, 50, 34, 'none') +
        '<line x1="108" y1="33" x2="142" y2="67" stroke="var(--svg-stroke)" stroke-width="2"/>' +
        '<line x1="142" y1="33" x2="108" y2="67" stroke="var(--svg-stroke)" stroke-width="2"/>' +
        SVG.sep(165) +
        SVG.q(205, 50),
      260,
      100,
    ),
    options: [
      { id: 'a', label: '1 garis', svg: SVG.opt(SVG.square(40, 40, 36, 'none') + '<line x1="22" y1="22" x2="58" y2="58" stroke="var(--svg-stroke)" stroke-width="2"/>') },
      {
        id: 'b',
        label: '2 garis',
        svg: SVG.opt(SVG.square(40, 40, 36, 'none') + '<line x1="22" y1="22" x2="58" y2="58" stroke="var(--svg-stroke)" stroke-width="2"/><line x1="58" y1="22" x2="22" y2="58" stroke="var(--svg-stroke)" stroke-width="2"/>'),
      },
      {
        id: 'c',
        label: '3 garis',
        svg: SVG.opt(
          '<line x1="15" y1="30" x2="65" y2="30" stroke="var(--svg-stroke)" stroke-width="2"/><line x1="15" y1="40" x2="65" y2="40" stroke="var(--svg-stroke)" stroke-width="2"/><line x1="15" y1="50" x2="65" y2="50" stroke="var(--svg-stroke)" stroke-width="2"/>',
        ),
      },
      { id: 'd', label: '0 garis', svg: SVG.opt(SVG.square(40, 40, 36)) },
    ],
    answer: 'b',
    explanation: 'Pola jumlah garis: 1, 2, 2, 2... Langkah berikutnya tetap 2 garis (diagonal X).',
  },
  {
    id: 64,
    section: 'logic',
    type: 'svg',
    question: 'Bintang dengan titik: 3 -> 4 -> 5 -> ?',
    svg: SVG.wrap(SVG.star(45, 50, 18, 3) + SVG.sep(85) + SVG.star(125, 50, 18, 4) + SVG.sep(165) + SVG.star(205, 50, 18, 5) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '4 titik', svg: SVG.opt(SVG.star(40, 40, 22, 4)) },
      { id: 'b', label: '5 titik', svg: SVG.opt(SVG.star(40, 40, 22, 5)) },
      { id: 'c', label: '6 titik', svg: SVG.opt(SVG.star(40, 40, 22, 6)) },
      { id: 'd', label: '7 titik', svg: SVG.opt(SVG.star(40, 40, 22, 7)) },
    ],
    answer: 'c',
    explanation: 'Jumlah titik bintang naik 1: 3, 4, 5, 6.',
  },
  {
    id: 65,
    section: 'logic',
    type: 'svg',
    question: 'Shading kotak: putih -> hitam -> putih -> hitam -> ?',
    svg: SVG.wrap(
      SVG.square(35, 50, 28, '#ffffff') +
        SVG.square(75, 50, 28, '#1e293b') +
        SVG.square(115, 50, 28, '#ffffff') +
        SVG.square(155, 50, 28, '#1e293b') +
        '<rect x="175" y="36" width="28" height="28" fill="none" stroke="var(--svg-stroke)" stroke-width="2" stroke-dasharray="4"/>' +
        SVG.q(189, 50),
      230,
      100,
    ),
    options: [
      { id: 'a', label: 'Putih', svg: SVG.opt(SVG.square(40, 40, 32, '#ffffff')) },
      { id: 'b', label: 'Hitam', svg: SVG.opt(SVG.square(40, 40, 32, '#1e293b')) },
      { id: 'c', label: 'Abu', svg: SVG.opt(SVG.square(40, 40, 32, '#94a3b8')) },
      { id: 'd', label: 'Biru', svg: SVG.opt(SVG.square(40, 40, 32, '#2563eb')) },
    ],
    answer: 'a',
    explanation: 'Bergantian putih-hitam. Setelah hitam, berikutnya putih.',
  },
  {
    id: 66,
    section: 'logic',
    type: 'svg',
    question: 'Persegi diputar +45 derajat tiap langkah. Sudut berikutnya? (0 derajat -> 45 derajat -> 90 derajat -> ?)',
    svg: SVG.wrap(SVG.square(45, 50, 30) + SVG.sep(85) + SVG.square(125, 50, 30, 'var(--svg-fill-1)', 45) + SVG.sep(165) + SVG.square(205, 50, 30, 'var(--svg-fill-1)', 90) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '0 derajat', svg: SVG.opt(SVG.square(40, 40, 32)) },
      { id: 'b', label: '45 derajat', svg: SVG.opt(SVG.square(40, 40, 32, 'var(--svg-fill-1)', 45)) },
      { id: 'c', label: '90 derajat', svg: SVG.opt(SVG.square(40, 40, 32, 'var(--svg-fill-1)', 90)) },
      { id: 'd', label: '135 derajat', svg: SVG.opt(SVG.square(40, 40, 32, 'var(--svg-fill-1)', 135)) },
    ],
    answer: 'd',
    explanation: 'Rotasi +45 derajat: 0 derajat -> 45 derajat -> 90 derajat -> 135 derajat.',
  },
  {
    id: 67,
    section: 'logic',
    type: 'svg',
    question: 'Analogi 2D->3D: Persegi : Kubus = Segitiga : ?',
    svg: SVG.wrap(
      SVG.square(35, 50, 28, 'var(--svg-fill-2)') +
        '<text x="58" y="50" text-anchor="middle" font-size="14">:</text>' +
        '<g transform="translate(72,28)"><rect x="0" y="18" width="22" height="22" fill="var(--svg-fill-2)" stroke="var(--svg-stroke)"/><polygon points="0,18 11,6 33,6 22,18" fill="var(--svg-fill-1)" stroke="var(--svg-stroke)"/><polygon points="22,18 33,6 33,28 22,40" fill="var(--svg-fill-3)" stroke="var(--svg-stroke)"/></g>' +
        '<text x="118" y="50" text-anchor="middle" font-size="14">=</text>' +
        SVG.triUp(148, 52, 28) +
        '<text x="178" y="50" text-anchor="middle" font-size="14">:</text>' +
        SVG.q(208, 50),
      250,
      100,
    ),
    options: [
      {
        id: 'a',
        label: 'Piramida',
        svg: SVG.opt('<polygon points="40,58 15,28 65,28" fill="var(--svg-fill-3)" stroke="var(--svg-stroke)"/><polygon points="40,58 15,28 40,12 65,28" fill="var(--svg-fill-1)" opacity="0.7" stroke="var(--svg-stroke)"/>'),
      },
      { id: 'b', label: 'Kubus datar', svg: SVG.opt(SVG.square(40, 40, 34, 'var(--svg-fill-2)')) },
      { id: 'c', label: 'Lingkaran', svg: SVG.opt(SVG.circle(40, 40, 22)) },
      { id: 'd', label: 'Garis', svg: SVG.opt('<line x1="15" y1="40" x2="65" y2="40" stroke="var(--svg-stroke)" stroke-width="3"/>') },
    ],
    answer: 'a',
    explanation: '2D naik dimensi: persegi->kubus, segitiga->piramida segitiga.',
  },
  {
    id: 68,
    section: 'logic',
    type: 'svg',
    question: 'Berapa area overlap antara lingkaran dan persegi di gambar?',
    svg: SVG.wrap(SVG.circle(95, 50, 24, 'var(--svg-fill-1)') + SVG.square(115, 50, 38, 'var(--svg-fill-2)') + '<text x="170" y="50" font-size="12" fill="var(--neutral-600)">Overlap?</text>', 240, 100),
    options: [
      { id: 'a', label: 'Tidak overlap', svg: SVG.opt(SVG.circle(28, 40, 16) + SVG.square(58, 40, 28, 'var(--svg-fill-2)')) },
      { id: 'b', label: '1 area overlap', svg: SVG.opt(SVG.circle(32, 40, 18) + SVG.square(48, 40, 28, 'var(--svg-fill-2)')) },
      { id: 'c', label: '2 area overlap', svg: SVG.opt(SVG.circle(28, 40, 14) + SVG.circle(52, 40, 14, 'var(--svg-fill-2)') + SVG.square(40, 40, 20, 'var(--svg-fill-3)')) },
      { id: 'd', label: '3 area overlap', svg: SVG.opt(SVG.circle(24, 40, 12) + SVG.circle(40, 40, 12) + SVG.circle(56, 40, 12)) },
    ],
    answer: 'b',
    explanation: 'Lingkaran dan persegi saling tumpang tindih di satu area.',
  },
  {
    id: 69,
    section: 'logic',
    type: 'svg',
    question: 'Persegi 20x20 di-scale 2x menjadi 40x40. Bentuk hasil?',
    svg: SVG.wrap(SVG.square(55, 50, 20) + SVG.sep(95) + SVG.q(135, 50), 180, 100),
    options: [
      { id: 'a', label: '40x40 persegi', svg: SVG.opt(SVG.square(40, 40, 40)) },
      { id: 'b', label: '20x40 persegi', svg: SVG.opt('<rect x="10" y="20" width="20" height="40" fill="var(--svg-fill-1)" stroke="var(--svg-stroke)" stroke-width="2"/>') },
      { id: 'c', label: '20x20 (sama)', svg: SVG.opt(SVG.square(40, 40, 20)) },
      { id: 'd', label: 'Lingkaran besar', svg: SVG.opt(SVG.circle(40, 40, 24)) },
    ],
    answer: 'a',
    explanation: 'Scale 2x pada persegi -> ukuran ganda: 40x40.',
  },
  {
    id: 70,
    section: 'logic',
    type: 'svg',
    question: 'Pola kuadrat sempurna: 1 -> 4 -> 9 -> ?',
    svg: SVG.wrap(SVG.dotGrid(1, 45, 50) + SVG.sep(85) + SVG.dotGrid(2, 125, 50) + SVG.sep(165) + SVG.dotGrid(3, 205, 50) + SVG.sep(245) + SVG.q(285), 320, 100),
    options: [
      { id: 'a', label: '12 dot', svg: SVG.opt(SVG.dots(12, 4, 40, 40)) },
      { id: 'b', label: '14 dot', svg: SVG.opt(SVG.dots(14, 4, 40, 40)) },
      { id: 'c', label: '16 dot (4x4)', svg: SVG.opt(SVG.dotGrid(4, 40, 40)) },
      { id: 'd', label: '20 dot', svg: SVG.opt(SVG.dots(20, 5, 40, 40)) },
    ],
    answer: 'c',
    explanation: '1^2=1, 2^2=4, 3^2=9, berikutnya 4^2=16.',
  },
];

// Build a larger programming pool (200) from the original programming templates,
// then randomly pick 50 to display while keeping logic questions unchanged.
(function buildQuestionPool() {
  const logicOriginal = ORIGINAL_QUESTIONS.filter((q) => q.section === 'logic');

  const topics = ['python', 'html', 'css', 'oop', 'pseudocode'];
  const POOL_SIZE = 200;
  const DISPLAY_PROGRAMMING = 100;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeOptionSet(correct, wrongs) {
    const opts = ['a', 'b', 'c', 'd'];
    const correctStr = String(correct);
    const uniqueWrongs = [...new Set(wrongs.map(String).filter((w) => w !== correctStr))];
    while (uniqueWrongs.length < 3) {
      uniqueWrongs.push(`Opsi lain ${uniqueWrongs.length + 1}`);
    }
    const items = shuffle([
      { label: correctStr, isCorrect: true },
      ...uniqueWrongs.slice(0, 3).map((label) => ({ label, isCorrect: false })),
    ]);
    const options = items.map((item, i) => ({ id: opts[i], label: item.label, svg: null }));
    const answerId = options[items.findIndex((item) => item.isCorrect)].id;
    return { options, answerId };
  }

  function numericWrongs(correct) {
    const num = Number(correct);
    return [String(num + 1), String(Math.max(0, num - 1)), 'Error'];
  }

  // Generators per topic produce simple parameterized questions
  function genPython(i) {
    const a = (i % 9) + 1;
    const b = ((i * 3) % 9) + 1;
    const repeat = (i % 4) + 2;
    const templates = [
      {
        code: `print(${a} + ${b})`,
        answer: String(a + b),
        explanation: `${a} + ${b} = ${a + b}`,
      },
      {
        code: `print(${a} * ${b})`,
        answer: String(a * b),
        explanation: `${a} × ${b} = ${a * b}`,
      },
      {
        code: `print(${a} % ${b})`,
        answer: String(a % b),
        explanation: `Sisa bagi ${a} ÷ ${b} = ${a % b}`,
      },
      {
        code: `s = "ha"; print(s * ${repeat})`,
        answer: 'ha'.repeat(repeat),
        explanation: `"ha" diulang ${repeat} kali → "${'ha'.repeat(repeat)}"`,
      },
    ];
    const pick = templates[i % templates.length];
    const wrongs = Number.isNaN(Number(pick.answer))
      ? [pick.answer.slice(0, -1) || 'ha', pick.answer + 'ha', 'None']
      : numericWrongs(pick.answer);
    const { options, answerId } = makeOptionSet(pick.answer, wrongs);
    return {
      id: `p-${i}`,
      section: 'programming',
      type: 'code',
      lang: 'python',
      question: 'Apa output yang dicetak oleh kode Python berikut?',
      codeSnippet: pick.code,
      options,
      answer: answerId,
      explanation: pick.explanation,
    };
  }

  function genHTML(i) {
    const tags = ['p', 'div', 'span', 'a', 'img', 'ul', 'li', 'h1', 'input'];
    const tag = tags[i % tags.length];
    let code = `<${tag}>Contoh</${tag}>`;
    let correct = `<${tag}>`;
    let question = 'Tag pembuka elemen HTML pada potongan kode berikut adalah?';
    let explanation = `Elemen menggunakan tag <${tag}>`;
    if (tag === 'img') {
      code = `<img src="foto.jpg" alt="foto">`;
      correct = 'alt';
      question = 'Atribut HTML manakah yang berisi teks alternatif untuk gambar?';
      explanation = 'Atribut alt memberikan deskripsi gambar untuk aksesibilitas dan jika gambar gagal dimuat.';
    } else if (tag === 'input') {
      code = `<input type="text" name="nama" placeholder="Masukkan nama">`;
      correct = '<input>';
      question = 'Tag HTML elemen formulir pada potongan kode berikut adalah?';
      explanation = 'Elemen <input> digunakan untuk menerima input dari pengguna.';
    } else if (tag === 'a') {
      code = `<a href="https://example.com">Kunjungi</a>`;
      explanation = 'Elemen <a> (anchor) digunakan untuk membuat hyperlink.';
    }
    const wrongs = ['<div>', '<span>', '<header>', '<p>', '<section>'].filter((w) => w !== correct);
    const { options, answerId } = makeOptionSet(correct, wrongs);
    return {
      id: `p-${i}`,
      section: 'programming',
      type: 'code',
      lang: 'html',
      question,
      codeSnippet: code,
      options,
      answer: answerId,
      explanation,
    };
  }

  function genCSS(i) {
    const props = [
      {
        prop: 'color',
        value: 'blue',
        effect: 'Warna teks menjadi biru',
        wrongs: ['Latar belakang biru', 'Border elemen biru', 'Teks dicetak tebal'],
      },
      {
        prop: 'margin',
        value: '20px',
        effect: 'Jarak luar elemen sebesar 20px',
        wrongs: ['Jarak dalam elemen 20px', 'Lebar elemen 20px', 'Tinggi elemen 20px'],
      },
      {
        prop: 'padding',
        value: '10px',
        effect: 'Jarak dalam elemen sebesar 10px',
        wrongs: ['Jarak luar elemen 10px', 'Lebar elemen 10px', 'Spasi antar baris 10px'],
      },
      {
        prop: 'font-size',
        value: '16px',
        effect: 'Ukuran huruf menjadi 16px',
        wrongs: ['Tinggi baris 16px', 'Lebar elemen 16px', 'Ketebalan huruf 16px'],
      },
    ];
    const p = props[i % props.length];
    const code = `.teks {\n  ${p.prop}: ${p.value};\n}`;
    const { options, answerId } = makeOptionSet(p.effect, p.wrongs);
    return {
      id: `p-${i}`,
      section: 'programming',
      type: 'code',
      lang: 'css',
      question: 'Apa efek visual dari deklarasi CSS berikut?',
      codeSnippet: code,
      options,
      answer: answerId,
      explanation: `Properti ${p.prop}: ${p.value} → ${p.effect}.`,
    };
  }

  function genOOP(i) {
    const names = ['Mobil', 'Hewan', 'User', 'BankAccount'];
    const cls = names[i % names.length];
    const code = `class ${cls}:\n    def __init__(self):\n        self.x = 0\n\nobj = ${cls}()\nprint(type(obj).__name__)`;
    const correct = cls;
    const wrongs = ['int', 'None', 'object'];
    const { options, answerId } = makeOptionSet(correct, wrongs);
    return {
      id: `p-${i}`,
      section: 'programming',
      type: 'code',
      lang: 'oop',
      question: 'Apa yang dicetak oleh type(obj).__name__ pada kode berikut?',
      codeSnippet: code,
      options,
      answer: answerId,
      explanation: `type(obj).__name__ mengembalikan nama class objek, yaitu "${correct}".`,
    };
  }

  function genPseudocode(i) {
    const a = (i % 5) + 1;
    const b = ((i * 2) % 5) + 1;
    const sumLoop = (b * (b + 1)) / 2;
    const correct = String(a + sumLoop);
    const code = `total <- ${a}\nFOR i <- 1 TO ${b}\n    total <- total + i\nEND FOR\nDISPLAY total`;
    const wrongs = [String(Number(correct) - 1), String(Number(correct) + 1), String(a)];
    const { options, answerId } = makeOptionSet(correct, wrongs);
    return {
      id: `p-${i}`,
      section: 'programming',
      type: 'code',
      lang: 'pseudocode',
      question: 'Berapa nilai total yang ditampilkan setelah loop selesai?',
      codeSnippet: code,
      options,
      answer: answerId,
      explanation: `total awal ${a}, loop menambah 1+2+...+${b}=${sumLoop}, jadi total = ${correct}.`,
    };
  }

  // build pool
  const pool = [];
  const perTopic = Math.floor(POOL_SIZE / topics.length);
  for (let t = 0; t < topics.length; t++) {
    const topic = topics[t];
    for (let i = 0; i < perTopic; i++) {
      const idx = t * perTopic + i + 1;
      let q;
      if (topic === 'python') q = genPython(idx);
      else if (topic === 'html') q = genHTML(idx);
      else if (topic === 'css') q = genCSS(idx);
      else if (topic === 'oop') q = genOOP(idx);
      else if (topic === 'pseudocode') q = genPseudocode(idx);
      pool.push(q);
    }
  }

  // If pool smaller than POOL_SIZE, fill with python variants
  while (pool.length < POOL_SIZE) {
    pool.push(genPython(pool.length + 1));
  }

  // Randomly select DISPLAY_PROGRAMMING items from the full pool
  const shuffledPool = shuffle(pool.slice());
  const selected = shuffledPool.slice(0, DISPLAY_PROGRAMMING);

  // Assign sequential numeric ids to the selected programming questions (1..DISPLAY_PROGRAMMING)
  selected.forEach((q, idx) => {
    q.id = idx + 1;
    q.section = 'programming';
  });

  // Assign ids to logic questions after programming (DISPLAY_PROGRAMMING+1 ..)
  const logicAssigned = logicOriginal.map((q, idx) => {
    const copy = JSON.parse(JSON.stringify(q));
    copy.id = DISPLAY_PROGRAMMING + idx + 1;
    copy.section = 'logic';
    return copy;
  });

  // Final question list: programming (1..DISPLAY_PROGRAMMING) then logic
  window.questions = selected.concat(logicAssigned);
})();

const questions = window.questions;

/* ============================================================
     STATE & DOM
     ============================================================ */
const state = {
  currentIndex: 0,
  answers: {},
  participantName: '',
  timeRemaining: CONFIG.totalTimeSeconds,
  testStartedAt: null,
  questionStartedAt: null,
  submitted: false,
  reviewFilter: 'all',
  totalTimeUsed: 0,
};

let totalTimerInterval = null;
let questionTimerInterval = null;
let confirmCallback = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  start: $('#start-screen'),
  test: $('#test-screen'),
  result: $('#result-screen'),
  review: $('#review-screen'),
};

function saveProgress() {
  const data = {
    currentIndex: state.currentIndex,
    answers: state.answers,
    participantName: state.participantName,
    timeRemaining: state.timeRemaining,
    testStartedAt: state.testStartedAt,
    questionStartedAt: state.questionStartedAt,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan progres:', e);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem(CONFIG.storageKey);
    return null;
  }
}

function clearProgress() {
  localStorage.removeItem(CONFIG.storageKey);
}

function restoreProgress(data) {
  state.currentIndex = data.currentIndex ?? 0;
  state.answers = data.answers ?? {};
  state.participantName = data.participantName ?? '';
  state.timeRemaining = data.timeRemaining ?? CONFIG.totalTimeSeconds;
  state.testStartedAt = data.testStartedAt ?? Date.now();
  state.questionStartedAt = Date.now();
}

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name].classList.add('active');
}

function showModal(id) {
  $(id).classList.add('active');
}

function hideModal(id) {
  $(id).classList.remove('active');
}

function showConfirm(title, message, onOk) {
  $('#modal-confirm-title').textContent = title;
  $('#modal-confirm-message').innerHTML = message;
  confirmCallback = onOk;
  showModal('#modal-confirm');
}

function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const el = $('#timer-display');
  const wrap = $('#total-timer');
  el.textContent = formatTime(state.timeRemaining);
  wrap.classList.remove('warning', 'danger');
  if (state.timeRemaining <= CONFIG.warningThreshold && state.timeRemaining > 60) {
    wrap.classList.add('warning');
  } else if (state.timeRemaining <= 60) {
    wrap.classList.add('danger');
  }
}

function startTotalTimer() {
  clearInterval(totalTimerInterval);
  updateTimerDisplay();
  totalTimerInterval = setInterval(() => {
    state.timeRemaining--;
    updateTimerDisplay();
    saveProgress();
    if (state.timeRemaining <= 0) {
      clearInterval(totalTimerInterval);
      submitTest(true);
    }
  }, 1000);
}

function startQuestionTimer() {
  clearInterval(questionTimerInterval);
  state.questionStartedAt = Date.now();
  questionTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.questionStartedAt) / 1000);
    const qt = document.querySelector('.question-timer');
    if (qt) qt.textContent = `${elapsed}s di soal ini`;
  }, 1000);
}

function stopTimers() {
  clearInterval(totalTimerInterval);
  clearInterval(questionTimerInterval);
}

function updateNavLabels() {
  const counts = getSectionCounts();
  const progIds = questions.filter((q) => q.section === 'programming').map((q) => q.id);
  const progMin = progIds.length ? Math.min(...progIds) : 1;
  const progMax = progIds.length ? Math.max(...progIds) : 0;
  document.querySelector('.nav-section-label.programming').textContent = `Programming (${progMin}-${progMax})`;

  const logicIds = questions.filter((q) => q.section === 'logic').map((q) => q.id);
  const logicMin = logicIds.length ? Math.min(...logicIds) : progMax + 1;
  const logicMax = logicIds.length ? Math.max(...logicIds) : counts.total;
  document.querySelector('.nav-section-label.logic').textContent = `Logic / IQ (${logicMin}-${logicMax})`;
}

function buildNavGrid() {
  const progGrid = $('#nav-grid-programming');
  const logicGrid = $('#nav-grid-logic');
  progGrid.innerHTML = '';
  logicGrid.innerHTML = '';
  updateNavLabels();

  // Collect buttons per section, then sort by question id so numbering appears sequential
  const progButtons = [];
  const logicButtons = [];
  questions.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn';
    btn.textContent = q.id;
    btn.dataset.index = i;
    btn.addEventListener('click', () => goToQuestion(i));
    if (q.section === 'programming') progButtons.push(btn);
    else logicButtons.push(btn);
  });

  progButtons.sort((a, b) => questions[Number(a.dataset.index)].id - questions[Number(b.dataset.index)].id);
  logicButtons.sort((a, b) => questions[Number(a.dataset.index)].id - questions[Number(b.dataset.index)].id);

  progButtons.forEach((b) => progGrid.appendChild(b));
  logicButtons.forEach((b) => logicGrid.appendChild(b));
}

function updateNavGrid() {
  $$('.nav-btn').forEach((btn) => {
    const i = parseInt(btn.dataset.index, 10);
    const q = questions[i];
    btn.classList.remove('active', 'answered', 'programming', 'logic');
    if (state.answers[q.id]) btn.classList.add('answered', q.section);
    if (i === state.currentIndex) btn.classList.add('active');
  });
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  const pct = (answered / questions.length) * 100;
  $('#progress-fill').style.width = `${pct}%`;
  $('#progress-text').textContent = `${answered} / ${questions.length} dijawab`;
}

function renderQuestion() {
  const q = questions[state.currentIndex];
  const container = $('#question-container');
  const selected = state.answers[q.id] || null;
  let bodyHtml = '';

  if (q.type === 'code' && q.codeSnippet) {
    bodyHtml += `<div class="code-block"><pre><code>${highlightCode(q.codeSnippet, q.lang || 'python')}</code></pre></div>`;
  } else if (q.type === 'svg' && q.svg) {
    bodyHtml += `<div class="svg-question">${q.svg}</div>`;
  }

  const isSvgOptions = q.options.some((o) => o.svg);
  const optionsClass = isSvgOptions ? 'options-list svg-options' : 'options-list';
  const badgeClass = q.section === 'logic' ? 'logic' : q.lang || 'programming';

  const optionsHtml = q.options
    .map((opt) => {
      const sel = selected === opt.id ? ' selected' : '';
      if (opt.svg) {
        return `<button type="button" class="option-btn svg-option${sel}" data-option="${opt.id}"><span class="option-label">${opt.id.toUpperCase()}</span><span class="option-svg">${opt.svg}</span></button>`;
      }
      return `<button type="button" class="option-btn${sel}" data-option="${opt.id}"><span class="option-label">${opt.id.toUpperCase()}</span><span class="option-text">${escapeHtml(opt.label)}</span></button>`;
    })
    .join('');

  container.innerHTML = `
      <div class="question-meta">
        <span class="question-number">Soal ${q.id} dari ${questions.length}</span>
        <span class="section-badge ${badgeClass}">${langLabel(q)}</span>
        <span class="question-timer">0s di soal ini</span>
      </div>
      <p class="question-text">${q.question}</p>
      ${bodyHtml}
      <div class="${optionsClass}">${optionsHtml}</div>
    `;

  container.querySelectorAll('.option-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectAnswer(q.id, btn.dataset.option));
  });

  $('#btn-prev').disabled = state.currentIndex === 0;
  $('#btn-next').disabled = state.currentIndex === questions.length - 1;
  updateNavGrid();
  updateProgress();
  startQuestionTimer();
}

function selectAnswer(questionId, optionId) {
  state.answers[questionId] = optionId;
  saveProgress();
  renderQuestion();
}

function goToQuestion(index) {
  if (index < 0 || index >= questions.length) return;
  state.currentIndex = index;
  saveProgress();
  renderQuestion();
}

function startTest(resume = false) {
  if (!resume) {
    state.currentIndex = 0;
    state.answers = {};
    state.participantName = $('#participant-name').value.trim();
    state.timeRemaining = CONFIG.totalTimeSeconds;
    state.testStartedAt = Date.now();
    state.submitted = false;
    saveProgress();
  }

  $('#participant-display').textContent = state.participantName ? `Peserta: ${state.participantName}` : '';
  $('#timer-display').textContent = formatTime(state.timeRemaining);
  buildNavGrid();
  showScreen('test');
  renderQuestion();
  startTotalTimer();
}

function resetTest() {
  showConfirm('Reset Tes', 'Semua progres dan jawaban akan dihapus. Anda yakin ingin memulai dari awal?', () => {
    stopTimers();
    clearProgress();
    Object.assign(state, { currentIndex: 0, answers: {}, participantName: '', timeRemaining: CONFIG.totalTimeSeconds, testStartedAt: null, submitted: false });
    $('#participant-name').value = '';
    showScreen('start');
  });
}

function getUnanswered() {
  return questions.filter((q) => !state.answers[q.id]).map((q) => q.id);
}

function submitTest(auto = false) {
  if (state.submitted) return;
  const unanswered = getUnanswered();
  const doSubmit = () => {
    state.submitted = true;
    stopTimers();
    state.totalTimeUsed = CONFIG.totalTimeSeconds - state.timeRemaining;
    clearProgress();
    showResults();
  };
  if (auto) {
    doSubmit();
    return;
  }
  if (unanswered.length > 0) {
    showConfirm('Submit Tes', `Masih ada <span class="unanswered-list">${unanswered.length} soal belum dijawab</span> (nomor: ${unanswered.join(', ')}). Yakin ingin submit?`, doSubmit);
  } else {
    showConfirm('Submit Tes', 'Semua soal sudah dijawab. Submit tes sekarang?', doSubmit);
  }
}

function calculateScores() {
  let total = 0,
    programming = 0,
    logic = 0;
  questions.forEach((q) => {
    if (state.answers[q.id] === q.answer) {
      total++;
      if (q.section === 'programming') programming++;
      else logic++;
    }
  });
  return { total, programming, logic };
}

function showResults() {
  const scores = calculateScores();
  const counts = getSectionCounts();
  const pct = Math.round((scores.total / counts.total) * 100);

  $('#result-participant').textContent = state.participantName ? `Peserta: ${state.participantName}` : '';
  $('#score-percent').textContent = `${pct}%`;
  $('#score-fraction').textContent = `${scores.total}/${counts.total}`;
  $('#score-programming').textContent = `${scores.programming}/${counts.programming}`;
  $('#score-logic').textContent = `${scores.logic}/${counts.logic}`;

  const ring = $('#ring-progress');
  const circumference = 2 * Math.PI * 52;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  $('#bar-programming').style.width = `${(scores.programming / counts.programming) * 100}%`;
  $('#bar-logic').style.width = `${(scores.logic / counts.logic) * 100}%`;
  $('#time-total').textContent = formatTime(state.totalTimeUsed);
  $('#time-avg').textContent = `${Math.round(state.totalTimeUsed / counts.total)}s`;
  showScreen('result');
}

function renderReview() {
  const list = $('#review-list');
  list.innerHTML = '';
  const filtered = questions.filter((q) => {
    const ok = state.answers[q.id] === q.answer;
    if (state.reviewFilter === 'wrong') return !ok;
    if (state.reviewFilter === 'correct') return ok;
    return true;
  });

  filtered.forEach((q) => {
    const userAns = state.answers[q.id];
    const isCorrect = userAns === q.answer;
    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
    let bodyHtml = '';
    if (q.type === 'code' && q.codeSnippet) {
      bodyHtml = `<div class="code-block"><pre><code>${highlightCode(q.codeSnippet, q.lang || 'python')}</code></pre></div>`;
    } else if (q.svg) {
      bodyHtml = `<div class="svg-question">${q.svg}</div>`;
    }
    const isSvgOptions = q.options.some((o) => o.svg);
    const optionsClass = isSvgOptions ? 'options-list svg-options review-options' : 'options-list review-options';
    const badgeClass = q.section === 'logic' ? 'logic' : q.lang || 'programming';
    const optionsHtml = q.options
      .map((opt) => {
        let cls = 'option-btn';
        if (opt.svg) cls += ' svg-option';
        if (opt.id === q.answer) cls += ' correct-answer';
        if (opt.id === userAns && userAns !== q.answer) cls += ' wrong-selected';
        if (opt.id === userAns && userAns === q.answer) cls += ' selected correct-answer';
        if (opt.svg) return `<div class="${cls}"><span class="option-label">${opt.id.toUpperCase()}</span><span class="option-svg">${opt.svg}</span></div>`;
        return `<div class="${cls}"><span class="option-label">${opt.id.toUpperCase()}</span><span class="option-text">${escapeHtml(opt.label)}</span></div>`;
      })
      .join('');

    item.innerHTML = `
        <div class="review-item-header">
          <span class="question-number">Soal ${q.id}</span>
          <span class="section-badge ${badgeClass}">${langLabel(q)}</span>
          <span class="review-status ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Benar' : 'Salah'}</span>
        </div>
        <p class="question-text">${q.question}</p>
        ${bodyHtml}
        <div class="${optionsClass}">${optionsHtml}</div>
        <p class="review-answer-summary">Jawaban Anda: <strong>${userAns ? userAns.toUpperCase() : '-'}</strong> | Jawaban benar: <strong>${q.answer.toUpperCase()}</strong></p>
        <div class="review-explanation"><strong>Pembahasan:</strong> ${q.explanation}</div>
      `;
    list.appendChild(item);
  });
}

function bindEvents() {
  $('#btn-start').addEventListener('click', () => startTest(false));
  $('#btn-prev').addEventListener('click', () => goToQuestion(state.currentIndex - 1));
  $('#btn-next').addEventListener('click', () => goToQuestion(state.currentIndex + 1));
  $('#btn-submit-test').addEventListener('click', () => submitTest(false));
  $('#btn-reset').addEventListener('click', resetTest);
  $('#btn-review').addEventListener('click', () => {
    state.reviewFilter = 'all';
    $$('.filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.filter === 'all'));
    renderReview();
    showScreen('review');
  });
  $('#btn-restart').addEventListener('click', () => {
    Object.assign(state, { currentIndex: 0, answers: {}, participantName: '', timeRemaining: CONFIG.totalTimeSeconds, submitted: false });
    $('#participant-name').value = '';
    showScreen('start');
  });
  $('#btn-back-result').addEventListener('click', () => showScreen('result'));
  $$('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.reviewFilter = btn.dataset.filter;
      $$('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderReview();
    });
  });
  $('#modal-confirm-cancel').addEventListener('click', () => {
    hideModal('#modal-confirm');
    confirmCallback = null;
  });
  $('#modal-confirm-ok').addEventListener('click', () => {
    hideModal('#modal-confirm');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
  $('#modal-resume-yes').addEventListener('click', () => {
    hideModal('#modal-resume');
    const data = loadProgress();
    if (data) {
      restoreProgress(data);
      $('#participant-name').value = state.participantName;
      startTest(true);
    }
  });
  $('#modal-resume-no').addEventListener('click', () => {
    hideModal('#modal-resume');
    clearProgress();
  });
  $('#sidebar-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('collapsed');
    $('#sidebar-toggle').setAttribute('aria-expanded', String(!$('#sidebar').classList.contains('collapsed')));
  });
  document.addEventListener('visibilitychange', () => {
    if (!state.submitted && screens.test.classList.contains('active')) saveProgress();
  });
  window.addEventListener('beforeunload', () => {
    if (!state.submitted && screens.test.classList.contains('active')) saveProgress();
  });
}

function init() {
  bindEvents();
  const counts = getSectionCounts();
  $('#progress-text').textContent = `0 / ${counts.total} dijawab`;
  $('#score-fraction').textContent = `0/${counts.total}`;
  $('#score-programming').textContent = `0/${counts.programming}`;
  $('#score-logic').textContent = `0/${counts.logic}`;
  $('#timer-display').textContent = formatTime(CONFIG.totalTimeSeconds);
  const saved = loadProgress();
  if (saved && saved.timeRemaining > 0) showModal('#modal-resume');
}

document.addEventListener('DOMContentLoaded', init);
