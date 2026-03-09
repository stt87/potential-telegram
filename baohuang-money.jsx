import { useState, useEffect } from "react";

const KEY = "baohuang-money-v1";
async function load() { try { const r = await window.storage.get(KEY); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function persist(d) { try { await window.storage.set(KEY, JSON.stringify(d)); } catch {} }

const fmt = (n) => n === 0 ? "0" : n > 0 ? `+${n}` : `${n}`;
const fmtDate = (s) => { const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

export default function App() {
  const [players, setPlayers] = useState([]);   // 固定玩家列表
  const [sessions, setSessions] = useState([]);  // 每次记录
  const [loaded, setLoaded] = useState(false);

  // 新记录表单
  const [amounts, setAmounts] = useState({});    // {name: string}
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);    // 正在编辑的记录id

  useEffect(() => {
    load().then(d => {
      if (d) { setPlayers(d.players || []); setSessions(d.sessions || []); }
      setLoaded(true);
    });
  }, []);

  const save = (p, s) => { setPlayers(p); setSessions(s); persist({ players: p, sessions: s }); };

  const addPlayer = () => {
    const n = newName.trim();
    if (!n || players.includes(n)) return;
    const p = [...players, n];
    save(p, sessions);
    setNewName("");
    setAmounts(a => ({ ...a, [n]: "" }));
  };

  const removePlayer = (name) => {
    save(players.filter(x => x !== name), sessions);
    setAmounts(a => { const b = { ...a }; delete b[name]; return b; });
  };

  // 提交记录
  const submit = () => {
    const entries = players.map(p => ({ name: p, amount: Number(amounts[p]) || 0 }));
    if (entries.every(e => e.amount === 0)) return;
    if (editId !== null) {
      const updated = sessions.map(s => s.id === editId ? { ...s, date: new Date(date).toISOString(), entries, note } : s);
      save(players, updated);
      setEditId(null);
    } else {
      const newSession = { id: Date.now(), date: new Date(date).toISOString(), entries, note };
      save(players, [newSession, ...sessions]);
    }
    setAmounts({});
    setNote("");
    setDate(new Date().toISOString().slice(0, 16));
  };

  const startEdit = (s) => {
    setEditId(s.id);
    const a = {};
    s.entries.forEach(e => a[e.name] = String(e.amount));
    setAmounts(a);
    setNote(s.note || "");
    setDate(new Date(s.date).toISOString().slice(0, 16));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSession = (id) => save(players, sessions.filter(s => s.id !== id));
  const cancelEdit = () => { setEditId(null); setAmounts({}); setNote(""); setDate(new Date().toISOString().slice(0, 16)); };

  // 累计总额
  const totals = {};
  players.forEach(p => totals[p] = 0);
  sessions.forEach(s => s.entries.forEach(e => { if (totals[e.name] !== undefined) totals[e.name] += e.amount; }));
  const ranked = [...players].sort((a, b) => (totals[b] || 0) - (totals[a] || 0));

  // 表单是否有效
  const isValid = players.length >= 2 && players.some(p => Number(amounts[p]) !== 0);

  if (!loaded) return <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: "sans-serif" }}>加载中…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#e0e0e0", fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif", fontSize: 14 }}>
      <style>{`
        * { box-sizing: border-box; }
        input { font-family: inherit; }
        button { font-family: inherit; cursor: pointer; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        @keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .row { animation: slideIn .25s ease; }
      `}</style>

      {/* 顶栏 */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🃏</span>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1 }}>保皇记账</span>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 14px" }}>

        {/* ── 玩家设置 ── */}
        <Block title="玩家">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPlayer()}
              placeholder="玩家名字" style={inSt}
            />
            <Btn onClick={addPlayer}>添加</Btn>
          </div>
          {players.length === 0
            ? <div style={{ color: "#444", fontSize: 13 }}>先添加玩家</div>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {players.map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 4, background: "#1e1e1e", border: "1px solid #333", borderRadius: 16, padding: "3px 8px 3px 10px", fontSize: 13 }}>
                    <span>{p}</span>
                    <span style={{ color: totals[p] > 0 ? "#4caf50" : totals[p] < 0 ? "#f44336" : "#555", marginLeft: 4, fontSize: 12 }}>{fmt(totals[p])}</span>
                    <button onClick={() => removePlayer(p)} style={{ background: "none", border: "none", color: "#444", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
          }
        </Block>

        {/* ── 记录表单 ── */}
        {players.length >= 2 && (
          <Block title={editId ? "✏️ 修改记录" : "记录本次"}>
            {players.map(p => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 64, flexShrink: 0, color: "#aaa" }}>{p}</span>
                <input
                  type="number"
                  value={amounts[p] || ""}
                  onChange={e => setAmounts(a => ({ ...a, [p]: e.target.value }))}
                  placeholder="0"
                  style={{
                    ...inSt, flex: 1, textAlign: "right",
                    color: Number(amounts[p]) > 0 ? "#4caf50" : Number(amounts[p]) < 0 ? "#f44336" : "#e0e0e0",
                  }}
                />
              </div>
            ))}

            {/* 验证总和 */}
            {(() => {
              const sum = players.reduce((acc, p) => acc + (Number(amounts[p]) || 0), 0);
              return sum !== 0 ? <div style={{ fontSize: 12, color: "#f44336", marginBottom: 8 }}>⚠️ 金额合计 {fmt(sum)}，通常应该为 0（赢多少=输多少）</div> : null;
            })()}

            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={{ ...inSt, marginBottom: 8, colorScheme: 'dark' }} />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="备注（可选）" style={{ ...inSt, marginBottom: 10 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submit} disabled={!isValid} style={{
                flex: 1, padding: "10px", borderRadius: 7, border: "none",
                background: isValid ? "#2e7d32" : "#1a1a1a",
                color: isValid ? "#fff" : "#444", fontWeight: 700, fontSize: 14,
              }}>
                {editId ? "保存修改" : "✓ 记录"}
              </button>
              {editId && <Btn onClick={cancelEdit} ghost>取消</Btn>}
            </div>
          </Block>
        )}

        {/* ── 总览排行 ── */}
        {sessions.length > 0 && (
          <Block title={`总览（${sessions.length}次）`}>
            {ranked.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e1e1e" }}>
                <span style={{ width: 20, color: "#444", fontSize: 13 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`}</span>
                <span style={{ flex: 1 }}>{p}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: totals[p] > 0 ? "#4caf50" : totals[p] < 0 ? "#f44336" : "#888" }}>
                  {fmt(totals[p])}
                </span>
              </div>
            ))}
          </Block>
        )}

        {/* ── 历史记录 ── */}
        {sessions.length > 0 && (
          <Block title="历史">
            {sessions.map(s => (
              <div key={s.id} className="row" style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#888", fontSize: 12 }}>{fmtDate(s.date)}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEdit(s)} style={{ background: "none", border: "none", color: "#555", fontSize: 13 }}>✏️</button>
                    <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: "none", color: "#444", fontSize: 13 }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {s.entries.filter(e => e.amount !== 0).map(e => (
                    <span key={e.name} style={{
                      fontSize: 13, padding: "2px 8px", borderRadius: 10,
                      background: e.amount > 0 ? "rgba(76,175,80,.12)" : "rgba(244,67,54,.12)",
                      color: e.amount > 0 ? "#4caf50" : "#f44336",
                      border: `1px solid ${e.amount > 0 ? "#2e5a2e" : "#5a2e2e"}`,
                    }}>
                      {e.name} {fmt(e.amount)}
                    </span>
                  ))}
                </div>
                {s.note && <div style={{ marginTop: 5, fontSize: 12, color: "#555" }}>📝 {s.note}</div>}
              </div>
            ))}
          </Block>
        )}

      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 8, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ background: "#161616", border: "1px solid #242424", borderRadius: 10, padding: "14px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ onClick, children, ghost }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 7, border: ghost ? "1px solid #333" : "none",
      background: ghost ? "transparent" : "#2a2a2a", color: ghost ? "#888" : "#ccc",
      fontSize: 13,
    }}>{children}</button>
  );
}

const inSt = { width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#111", color: "#e0e0e0", fontSize: 14 };
