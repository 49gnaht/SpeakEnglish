/* Đăng nhập Google + đồng bộ dữ liệu lên Firestore.
   Máy vẫn là nơi lưu chính (localStorage); đồng bộ chỉ gộp dữ liệu giữa các máy cùng tài khoản.
   Firestore: users/{uid} = { profiles, gone }; users/{uid}/profiles/{pid} = { lessons, prefs, prefsAt, samples, deleted } */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyCUDSvAoF8lf0qfb1tCO-5SQT95VOQU78U',
  authDomain: 'noitheo.firebaseapp.com',
  projectId: 'noitheo',
  storageBucket: 'noitheo.firebasestorage.app',
  messagingSenderId: '107995428809',
  appId: '1:107995428809:web:e77da976d2f61f5dcd1a18'
});
const auth = getAuth(app);
const db = getFirestore(app);
const S = window.NTStore;

const state = { user: null, busy: false, error: '', lastSync: 0 };
const emit = () => window.dispatchEvent(new CustomEvent('nt-auth'));

/* ---------- gộp dữ liệu ---------- */
const parse = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch { return d; } };
const union = (a, b) => [...new Set([...(a || []), ...(b || [])])];

function mergeLesson(x, y) {
  const [base, other] = (x.mod || 0) >= (y.mod || 0) ? [x, y] : [y, x];
  const r = { ...base };
  const best = { ...(other.best || {}) };
  for (const [k, v] of Object.entries(base.best || {})) best[k] = Math.max(v || 0, best[k] || 0);
  r.best = best;
  const seen = new Set(), whole = [];
  for (const h of [...(x.whole || []), ...(y.whole || [])]) {
    const key = h.ts + ':' + h.score;
    if (!seen.has(key)) { seen.add(key); whole.push(h); }
  }
  whole.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (whole.length) r.whole = whole.slice(-20);
  const st = [x.started, y.started].filter(Boolean).sort();
  if (st.length) r.started = st[0];
  r.created = Math.min(x.created || Infinity, y.created || Infinity);
  if (!isFinite(r.created)) delete r.created;
  delete r.justDone;
  return r;
}
export function mergeLessons(local, remote, deleted) {
  const gone = new Set(deleted || []);
  const out = [], byId = new Map((remote || []).map(l => [l.id, l]));
  for (const l of local || []) {
    if (gone.has(l.id)) continue;
    const r = byId.get(l.id);
    out.push(r ? mergeLesson(l, r) : l);
    byId.delete(l.id);
  }
  for (const r of byId.values()) if (!gone.has(r.id)) out.push(r);
  return out;
}

function readLocal(pid) {
  const k = S.keys(pid);
  return {
    lessons: S.json(k.lessons, null),
    prefs: S.json(k.prefs, null),
    prefsAt: +S.get(k.prefsAt) || 0,
    samples: S.json(k.samples, null),
    deleted: S.json(k.del, []),
    days: S.json(k.days, null),
    words: S.json(k.words, null)
  };
}
function writeLocal(pid, d) {
  const k = S.keys(pid);
  if (d.lessons) S.set(k.lessons, JSON.stringify(d.lessons));
  if (d.prefs) S.set(k.prefs, JSON.stringify(d.prefs));
  S.set(k.prefsAt, String(d.prefsAt || 0));
  if (d.samples) S.set(k.samples, JSON.stringify(d.samples));
  S.set(k.del, JSON.stringify(d.deleted || []));
  if (d.days) S.set(k.days, JSON.stringify(d.days));
  if (d.words) S.set(k.words, JSON.stringify(d.words));
}
// nhật ký theo ngày: gộp từng ngày, lấy giá trị lớn hơn (học trên 2 máy cùng ngày thì cộng dồn số câu)
function mergeDay(a, b) {
  const r = { ...a, ...b };
  r.sec = Math.max(a.sec || 0, b.sec || 0);
  r.w = Math.max(a.w || 0, b.w || 0);
  r.wb = Math.max(a.wb || 0, b.wb || 0);
  r.ok = a.ok || b.ok ? 1 : 0;
  r.s = { ...(a.s || {}) };
  for (const [k, e] of Object.entries(b.s || {})) {
    const x = r.s[k];
    if (!x) { r.s[k] = e; continue; }
    const at = [x[1], e[1]].filter(Boolean);
    r.s[k] = [Math.max(x[0], e[0]), at.length ? Math.min(...at) : 0];
  }
  r.wl = { ...(a.wl || {}), ...(b.wl || {}) };
  r.red = { ...(a.red || {}) };
  for (const [w, n] of Object.entries(b.red || {})) r.red[w] = Math.max(r.red[w] || 0, n);
  return r;
}
// từ: [số lần đỏ, số lần đúng sau đó, ngày chinh phục] — lấy giá trị lớn hơn
function mergeWords(a, b) {
  if (!a || !b) return a || b || null;
  const r = { ...a };
  for (const [w, e] of Object.entries(b)) {
    const x = r[w];
    r[w] = x ? [Math.max(x[0], e[0]), Math.max(x[1], e[1]), (x[2] || '') > (e[2] || '') ? x[2] : e[2]] : e;
  }
  return r;
}
function mergeDays(a, b) {
  if (!a || !b) return a || b || null;
  const r = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = r[k] ? mergeDay(r[k], v) : v;
  return r;
}
function mergeProfile(loc, rem) {
  const deleted = union(loc.deleted, rem.deleted);
  const prefsLocal = loc.prefs && (loc.prefsAt >= rem.prefsAt || !rem.prefs);
  return {
    lessons: loc.lessons || rem.lessons ? mergeLessons(loc.lessons, rem.lessons, deleted) : null,
    prefs: prefsLocal ? loc.prefs : rem.prefs,
    prefsAt: Math.max(loc.prefsAt, rem.prefsAt),
    samples: loc.samples || rem.samples ? union(loc.samples, rem.samples) : null,
    deleted,
    days: mergeDays(loc.days, rem.days),
    words: mergeWords(loc.words, rem.words)
  };
}
const pack = d => ({
  lessons: JSON.stringify(d.lessons || null), prefs: JSON.stringify(d.prefs || null),
  prefsAt: d.prefsAt || 0, samples: JSON.stringify(d.samples || null), deleted: JSON.stringify(d.deleted || []),
  days: JSON.stringify(d.days || null),
  words: JSON.stringify(d.words || null)
});

/* ---------- đồng bộ ---------- */
let applying = false;   // đang ghi dữ liệu gộp vào máy: không coi là thay đổi mới
async function syncProfile(uid, pid) {
  const ref = doc(db, 'users', uid, 'profiles', pid);
  const snap = await getDoc(ref);
  const raw = snap.exists() ? snap.data() : {};
  const rem = {
    lessons: parse(raw.lessons, null), prefs: parse(raw.prefs, null), prefsAt: raw.prefsAt || 0,
    samples: parse(raw.samples, null), deleted: parse(raw.deleted, []), days: parse(raw.days, null), words: parse(raw.words, null)
  };
  const loc = readLocal(pid);
  const merged = mergeProfile(loc, rem);
  const p = pack(merged), before = pack(loc);
  const localChanged = ['lessons', 'prefs', 'samples', 'deleted', 'days', 'words'].some(k => p[k] !== before[k]);
  if (localChanged) { applying = true; writeLocal(pid, merged); applying = false; }
  const remoteSame = snap.exists() && ['lessons', 'prefs', 'samples', 'deleted', 'days', 'words'].every(k => p[k] === raw[k]) && p.prefsAt === raw.prefsAt;
  if (!remoteSame) await setDoc(ref, { ...p, updated: Date.now() });
  return localChanged;
}
async function syncProfiles(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const raw = snap.exists() ? snap.data() : {};
  const gone = union(S.json('speak.profilesGone.v1', []), raw.gone);
  const list = S.profiles().slice();
  for (const p of raw.profiles || []) if (!list.some(x => x.id === p.id)) list.push(p);
  const merged = list.filter(p => !gone.includes(p.id));
  if (!merged.length) merged.push({ id: 'main', name: 'Hồ sơ chính' });
  const before = JSON.stringify(S.profiles());
  applying = true;
  S.set('speak.profilesGone.v1', JSON.stringify(gone));
  if (JSON.stringify(merged) !== before) S.set('speak.profiles.v1', JSON.stringify(merged));
  applying = false;
  const changed = JSON.stringify(merged) !== before;
  if (JSON.stringify(merged) !== JSON.stringify(raw.profiles) || JSON.stringify(gone) !== JSON.stringify(raw.gone)) {
    await setDoc(ref, { profiles: merged, gone, updated: Date.now() });
  }
  return { list: merged, changed };
}

let running = null, again = false;
async function syncAll() {
  if (!state.user) return;
  if (running) { again = true; return running; }
  running = (async () => {
    state.busy = true; state.error = ''; emit();
    try {
      do {
        again = false;
        const uid = state.user.uid;
        const { list, changed } = await syncProfiles(uid);
        let curChanged = changed;
        for (const p of list) if (await syncProfile(uid, p.id) && p.id === S.cur()) curChanged = true;
        state.lastSync = Date.now();
        if (curChanged && window.NTApp) window.NTApp.refresh();
      } while (again && state.user);
    } catch (e) {
      console.warn('sync', e);
      state.error = 'Chưa đồng bộ được, dữ liệu vẫn lưu trên máy. Sẽ thử lại sau.';
    } finally {
      state.busy = false; running = null; emit();
    }
  })();
  return running;
}

let timer = null;
S.onChange(() => {
  if (applying || !state.user) return;
  clearTimeout(timer);
  timer = setTimeout(syncAll, 2500);
});
document.addEventListener('visibilitychange', () => {
  if (!state.user) return;
  if (document.hidden && timer) { clearTimeout(timer); timer = null; syncAll(); }
  else if (!document.hidden && Date.now() - state.lastSync > 60000) syncAll();
});

onAuthStateChanged(auth, u => {
  state.user = u ? { uid: u.uid, email: u.email, name: u.displayName } : null;
  emit();
  if (u) syncAll();
});

window.NTSync = {
  state,
  async signIn() {
    state.error = ''; emit();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return signInWithRedirect(auth, provider);
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
      state.error = 'Đăng nhập chưa được (' + ((e && e.code) || 'lỗi') + ').'; emit();
    }
  },
  signOut: () => signOut(auth),
  syncNow: syncAll
};
emit();
