// Firebase giả cho test: thay các module tải từ gstatic bằng bản chạy trong bộ nhớ.
// Dữ liệu Firestore giữ ở phía Node (biến `remote`) nên hai "máy" (hai browser context) dùng chung được.
const remote = new Map();
const events = [];

const MODULES = {
  'firebase-app.js': `export function initializeApp(c) { window.__fbConfig = c; return { c }; }`,
  'firebase-auth.js': `
    const ls = []; let user = JSON.parse(localStorage.getItem('fakeUser') || 'null');
    export function getAuth() { return {}; }
    export function onAuthStateChanged(a, f) { ls.push(f); setTimeout(() => f(user), 0); }
    export class GoogleAuthProvider { setCustomParameters() {} }
    export async function signInWithPopup() { user = { uid: 'u1', email: 'parent@example.com', displayName: 'Parent' }; localStorage.setItem('fakeUser', JSON.stringify(user)); ls.forEach(f => f(user)); }
    export async function signInWithRedirect() {}
    export async function signOut() { user = null; localStorage.removeItem('fakeUser'); ls.forEach(f => f(null)); }`,
  'firebase-firestore.js': `
    const call = (op, path, data) => fetch('https://fake.store/' + op, { method: 'POST', body: JSON.stringify({ path, data }) }).then(r => r.json());
    export function getFirestore() { return {}; }
    export function doc(db, ...p) { return p.join('/'); }
    export function collection(db, name) { return name; }
    export function serverTimestamp() { return 'TS'; }
    export async function getDoc(path) { const d = await call('get', path); return { exists: () => d !== null, data: () => d }; }
    export async function setDoc(path, data) { await call('set', path, data); }
    export async function addDoc(col, data) { await call('add', col, data); return {}; }`,
  'firebase-analytics.js': `
    export async function isSupported() { return true; }
    export function initializeAnalytics() { return {}; }
    export function logEvent(a, name, params) { fetch('https://fake.store/event', { method: 'POST', body: JSON.stringify({ path: name, data: params || {} }) }); }`
};

async function install(context) {
  await context.route('https://www.gstatic.com/firebasejs/**', route => {
    const name = Object.keys(MODULES).find(k => route.request().url().endsWith(k));
    if (!name) return route.abort();
    route.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: MODULES[name] });
  });
  await context.route('https://fake.store/**', route => {
    const op = route.request().url().split('/').pop();
    const { path, data } = JSON.parse(route.request().postData() || '{}');
    let out = {};
    if (op === 'get') out = remote.has(path) ? remote.get(path) : null;
    else if (op === 'set') remote.set(path, data);
    else if (op === 'add') remote.set(path + '/' + (remote.size + 1), data);
    else if (op === 'event') events.push([path, data]);
    route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
}

module.exports = { install, remote, events };
