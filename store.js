/* Hồ sơ người học + tên khóa lưu trên máy. Dùng chung cho trang chính và phần đồng bộ (sync.js). */
(function () {
  const PROFILES = 'speak.profiles.v1', CUR = 'speak.profile.cur';
  const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const json = (k, d) => { try { const v = JSON.parse(get(k)); return v == null ? d : v; } catch { return d; } };

  // Hồ sơ 'main' dùng đúng các khóa cũ, nên dữ liệu đang có trên máy giữ nguyên.
  const sfx = id => (id === 'main' ? '' : ':' + id);
  const keys = id => ({
    lessons: 'speak.lessons.v1' + sfx(id),
    prefs: 'speak.prefs.v2' + sfx(id),
    samples: 'speak.samples.v1' + sfx(id),
    del: 'speak.deleted.v1' + sfx(id),     // id bài đã xóa, để máy khác không thêm lại
    prefsAt: 'speak.prefsAt' + sfx(id),
    days: 'speak.days.v1' + sfx(id)        // nhật ký học theo ngày
  });

  function profiles() {
    const v = json(PROFILES, null);
    return Array.isArray(v) && v.length ? v : [{ id: 'main', name: 'Hồ sơ chính' }];
  }
  function saveProfiles(list) { set(PROFILES, JSON.stringify(list)); changed(null); }
  function cur() { const c = get(CUR), list = profiles(); return list.some(p => p.id === c) ? c : list[0].id; }
  function setCur(id) { set(CUR, id); }
  function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function addProfile(name) { const p = { id: newId(), name }; saveProfiles(profiles().concat(p)); return p; }
  function renameProfile(id, name) { saveProfiles(profiles().map(p => (p.id === id ? { ...p, name } : p))); }
  function removeProfile(id) {
    const list = profiles().filter(p => p.id !== id);
    if (!list.length) return;
    const k = keys(id);
    for (const key of Object.values(k)) set(key, null);
    const gone = json('speak.profilesGone.v1', []);
    if (!gone.includes(id)) gone.push(id);
    set('speak.profilesGone.v1', JSON.stringify(gone));
    if (cur() === id) setCur(list[0].id);
    saveProfiles(list);
  }
  function markDeleted(id, lessonId) {
    const k = keys(id).del, list = json(k, []);
    if (!list.includes(lessonId)) { list.push(lessonId); set(k, JSON.stringify(list)); }
  }

  // Báo cho phần đồng bộ biết hồ sơ nào vừa đổi (null = danh sách hồ sơ)
  const listeners = [];
  function changed(id) { for (const f of listeners) try { f(id); } catch {} }
  function onChange(f) { listeners.push(f); }

  window.NTStore = { get, set, json, keys, profiles, saveProfiles, cur, setCur, addProfile, renameProfile, removeProfile, markDeleted, changed, onChange };
})();
