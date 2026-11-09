// Test tự động cho trang chính (index.html), chạy bằng: npm test
// Mở trang thật trong Chromium (Playwright), giả lập giọng nói và Firebase, kiểm tra các luồng chính.
// Chạy một nhóm: npm test -- sync   (lọc theo tên)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const fakeFirebase = require('./fake-firebase');

const ROOT = path.resolve(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-speech.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

let BASE = '', browser = null, fails = 0, passes = 0;
const ok = (cond, name, extra = '') => {
  if (cond) passes++; else fails++;
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond || !extra ? '' : '   → ' + String(extra).slice(0, 300)));
};

async function newPage({ firebase = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(MOCK);
  if (firebase) await fakeFirebase.install(ctx);
  else await ctx.route('https://www.gstatic.com/**', r => r.abort());   // không cần mạng
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  return page;
}
// nói một câu ở chế độ từng câu
async function sayOnce(page, text) {
  await page.evaluate(t => { window.__say = t; window.__sayQueue = null; }, text);
  await page.click('#speak');
  await sleep(700);
}
const kidLessons = page => page.evaluate(() => JSON.parse(localStorage.getItem('speak.lessons.v1')).filter(l => l.group === 1));
const lessonById = (page, id) => page.evaluate(id => JSON.parse(localStorage.getItem('speak.lessons.v1')).find(l => l.id === id), id);

const TESTS = {
  async 'trang chủ và khóa bài theo thứ tự'() {
    const page = await newPage();
    await page.goto(BASE + '/'); await sleep(300);
    const all = await page.evaluate(() => JSON.parse(localStorage.getItem('speak.lessons.v1')).length);
    ok(all >= 21, 'gieo đủ bài mẫu', all);
    for (const g of ['0', '1']) {
      await page.click(`#groupTabs [data-v="${g}"]`); await sleep(150);
      const open = await page.locator('#lessonList a.lesson[href]').count();
      ok(open === 1, `nhóm ${g === '1' ? 'trẻ em' : 'người lớn'}: chỉ bài đầu mở`, open);
    }
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'chấm từng câu, tạm bỏ qua sau 3 lần'() {
    const page = await newPage();
    await page.goto(BASE + '/'); await sleep(300);
    await page.click('#groupTabs [data-v="1"]'); await sleep(150);
    const href = await page.locator('#lessonList a.lesson[href]').first().getAttribute('href');
    const id = decodeURIComponent(href.slice(href.indexOf('=') + 1));
    await page.goto(BASE + '/' + href); await sleep(300);
    const l = await lessonById(page, id);
    await sayOnce(page, l.items[0].en);
    ok(await page.locator('#dots .dot').first().evaluate(e => e.classList.contains('ok')), 'nói đúng: chấm câu 1 xanh');
    await page.click('#dots .dot >> nth=1'); await sleep(100);
    await sayOnce(page, 'banana'); await sayOnce(page, 'banana');
    ok(await page.isHidden('#skipSent'), 'sai 2 lần: chưa cho bỏ qua');
    await sayOnce(page, 'banana');
    ok(await page.isVisible('#skipSent'), 'sai 3 lần: có nút tạm bỏ qua');
    await page.click('#skipSent'); await sleep(200);
    ok(await page.locator('#dots .dot').nth(1).evaluate(e => e.classList.contains('later')), 'câu bỏ qua đánh dấu "luyện sau"');
    ok((await page.textContent('#gate')).includes('Để qua bài'), 'có ô "Để qua bài"', await page.textContent('#gate'));
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'nói cả bài đạt thì qua bài và mở bài tiếp'() {
    const page = await newPage();
    await page.goto(BASE + '/'); await sleep(300);
    const first = (await kidLessons(page)).find(l => l.id === 'mau-sunny-day');
    await page.evaluate(() => {   // giả như đã đạt hết từng câu
      const ls = JSON.parse(localStorage.getItem('speak.lessons.v1'));
      const l = ls.find(x => x.id === 'mau-sunny-day'); l.items.forEach((_, i) => { l.best[i] = 0.95; });
      localStorage.setItem('speak.lessons.v1', JSON.stringify(ls));
    });
    await page.goto(BASE + '/#bai=mau-sunny-day'); await sleep(300);
    await page.click('#mode [data-v="1"]'); await sleep(150);
    await page.evaluate(q => { window.__sayQueue = q; }, [first.items.map(i => i.en).join(' ')]);
    await page.click('#speak'); await sleep(500); await page.click('#speak'); await sleep(800);
    const gate = await page.textContent('#gate');
    ok(gate.includes('Đã qua bài'), 'báo đã qua bài', gate);
    await page.goto(BASE + '/'); await sleep(300);
    await page.click('#groupTabs [data-v="1"]'); await sleep(150);
    ok(await page.locator('#lessonList a.lesson[href]').count() >= 2, 'bài kế tiếp đã mở');
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'nghe – nói theo cả bài (bé chưa biết đọc)'() {
    const page = await newPage();
    await page.goto(BASE + '/'); await sleep(300);
    const l = (await kidLessons(page)).find(x => x.id === 'mau-sunny-day');
    await page.evaluate(() => {
      const ls = JSON.parse(localStorage.getItem('speak.lessons.v1'));
      const x = ls.find(y => y.id === 'mau-sunny-day'); x.items.forEach((_, i) => { x.best[i] = 0.95; });
      localStorage.setItem('speak.lessons.v1', JSON.stringify(ls));
      const p = JSON.parse(localStorage.getItem('speak.prefs.v2') || '{}'); p.echo = true; localStorage.setItem('speak.prefs.v2', JSON.stringify(p));
    });
    await page.goto(BASE + '/?reload=1#bai=mau-sunny-day'); await sleep(300);   // tải lại để đọc cài đặt mới
    await page.click('#mode [data-v="1"]'); await sleep(150);
    ok((await page.textContent('#speakText')) === 'Nói theo cả bài', 'nút đổi tên');
    // câu 2: lần đầu im lặng, lần sau nói đúng
    const q = [l.items[0].en, '', ...l.items.slice(1).map(i => i.en)];
    await page.evaluate(q => { window.__sayQueue = q; window.__spoken = []; }, q);
    await page.click('#speak');
    for (let i = 0; i < 60 && !(await page.isVisible('#wResult')); i++) await sleep(250);
    const spoken = await page.evaluate(() => window.__spoken.length);
    ok(spoken === l.items.length + 1, 'đọc mẫu từng câu, câu im lặng được đọc lại 1 lần', spoken + ' / ' + (l.items.length + 1));
    ok((await page.textContent('#gate')).includes('Đã qua bài'), 'qua bài');
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'hồ sơ chỉ học bài trẻ em'() {
    const page = await newPage();
    await page.goto(BASE + '/#hoso'); await sleep(300);
    await page.fill('#profileName', 'Bé Test'); await page.selectOption('#profileKind', '1');
    await page.click('#addProfile button'); await sleep(500);
    ok(await page.isHidden('#groupTabs'), 'ẩn tab nhóm');
    ok((await page.textContent('#who')).includes('(trẻ em)'), 'dòng "Đang học" ghi loại bài');
    const n = await page.locator('#lessonList .lesson-t').count();
    ok(n === 10, 'chỉ hiện 10 bài trẻ em', n);
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'tạo bài từ kết quả ChatGPT'() {
    const page = await newPage();
    await page.goto(BASE + '/#moi'); await sleep(300);
    await page.fill('#paste', 'My Cat\nMèo của tôi\nI have a small cat.\nTôi có một con mèo nhỏ.\nShe likes milk.\nNó thích sữa.');
    await sleep(200);
    await page.click('#saveLesson'); await sleep(400);
    const l = await page.evaluate(() => JSON.parse(localStorage.getItem('speak.lessons.v1')).find(x => x.title === 'My Cat'));
    ok(!!l && l.items.length === 2 && l.items[0].vi === 'Tôi có một con mèo nhỏ.', 'tách tiêu đề, câu và bản dịch', JSON.stringify(l && l.items));
    ok(page.errors.length === 0, 'không lỗi JS', page.errors.join(' | '));
    await page.context().close();
  },

  async 'đồng bộ hai máy qua Firebase giả'() {
    const A = await newPage({ firebase: true });
    await A.goto(BASE + '/'); await sleep(400);
    await A.evaluate(() => {
      const ls = JSON.parse(localStorage.getItem('speak.lessons.v1'));
      ls.find(x => x.id === 'mau-sunny-day').best = { 0: 0.9 };
      localStorage.setItem('speak.lessons.v1', JSON.stringify(ls));
    });
    await A.goto(BASE + '/#hoso'); await sleep(300);
    await A.click('#signIn'); await sleep(1200);
    ok((await A.textContent('#acctText')).includes('parent@example.com'), 'đăng nhập được');
    ok(fakeFirebase.remote.has('users/u1'), 'đẩy danh sách hồ sơ lên');
    const B = await newPage({ firebase: true });
    await B.goto(BASE + '/'); await sleep(200);
    await B.evaluate(() => localStorage.setItem('fakeUser', JSON.stringify({ uid: 'u1', email: 'parent@example.com' })));
    await B.reload(); await sleep(1500);
    const best = await B.evaluate(() => (JSON.parse(localStorage.getItem('speak.lessons.v1')).find(x => x.id === 'mau-sunny-day').best || {})[0]);
    ok(best === 0.9, 'máy B nhận tiến độ của máy A', best);
    ok(fakeFirebase.events.some(([n]) => n === 'login'), 'ghi sự kiện Analytics "login"');
    ok(A.errors.length === 0 && B.errors.length === 0, 'không lỗi JS', A.errors.concat(B.errors).join(' | '));
    await A.context().close(); await B.context().close();
  }
};

(async () => {
  const filter = process.argv.slice(2).join(' ').toLowerCase();
  const server = await serve();
  BASE = 'http://127.0.0.1:' + server.address().port;
  const launch = { headless: true };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch(launch);
  for (const [name, fn] of Object.entries(TESTS)) {
    if (filter && !name.toLowerCase().includes(filter)) continue;
    console.log('• ' + name);
    try { await fn(); } catch (e) { fails++; console.log('  ✗ lỗi khi chạy: ' + (e && e.message ? e.message.split('\n')[0] : e)); }
  }
  await browser.close(); server.close();
  console.log(`\n${passes} đạt, ${fails} lỗi`);
  process.exit(fails ? 1 : 0);
})();
