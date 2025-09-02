import React, { useEffect, useMemo, useRef, useState } from "react";
import './app.css'

/**
 * Pasapalabra (Rosco) — React + JavaScript
 * - Temporizador: 120s con pausar/reanudar.
 * - Estados por letra: pendiente, actual, acierto, error, pasado.
 * - Funciones del juego real: responder, "pasapalabra" (salta y vuelve), fin por tiempo o por completar rosco.
 * - Controles rápidos: Enter (responder), Space (pasapalabra), P (pausar/reanudar), R (reiniciar tras finalizar).
 * - Sin dependencias externas. Estilos en CSS-in-JS simple.
 */

// ====== Utilidades ======
const ABC = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

function normalize(str = "") {
  // minúsculas, sin tildes/diacríticos, recorta espacios, quita signos
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]/g, "")
    .trim();
}

// ====== Banco de preguntas (1 por letra). Puedes ampliar libremente. ======
// Regla: cada pista indica "Empieza por" o "Contiene" con la letra correspondiente.
const QUESTION_BANK = /** @type {Record<string, {q:string, a:string}>} */ ({
  A: { q: "Empieza por A: País sudamericano cuya capital es Buenos Aires.", a: "Argentina" },
  B: { q: "Empieza por B: Bebida caliente que se hace con granos tostados.", a: "Cafe" },
  C: { q: "Empieza por C: Aparato que enfría ambientes en verano.", a: "Calefon" }, // (truco: incorrecto a propósito para probar error)
  D: { q: "Empieza por D: Día que sigue al lunes.", a: "Martes" }, // (truco 2)
  E: { q: "Empieza por E: Parte de una carta donde se anota el destinatario.", a: "Encabezado" },
  F: { q: "Empieza por F: Animal conocido por su astucia en fábulas.", a: "Zorro" },
  G: { q: "Empieza por G: Ciencia que estudia la Tierra.", a: "Geologia" },
  H: { q: "Empieza por H: Utensilio para colgar ropa.", a: "Percha" },
  I: { q: "Empieza por I: Opus contrario a lo exterior.", a: "Interior" },
  J: { q: "Empieza por J: Persona que imparte justicia en un tribunal.", a: "Juez" },
  K: { q: "Empieza por K: Arte marcial originaria de Okinawa.", a: "Karate" },
  L: { q: "Empieza por L: Satélite natural de la Tierra.", a: "Luna" },
  M: { q: "Empieza por M: Río que atraviesa Buenos Aires.", a: "Matanza" },
  N: { q: "Empieza por N: Neumático en algunos países.", a: "Neumatico" },
  Ñ: { q: "Contiene la Ñ: Grupo musical o conjunto de personas que tocan juntas.", a: "Ensamble" },
  O: { q: "Empieza por O: Elemento químico esencial para la respiración.", a: "Oxigeno" },
  P: { q: "Empieza por P: Juego televisivo argentino conducido por Iván de Pineda.", a: "Pasapalabra" },
  Q: { q: "Empieza por Q: Pregunta breve.", a: "Que" },
  R: { q: "Empieza por R: Ciudad italiana famosa por el Coliseo.", a: "Roma" },
  S: { q: "Empieza por S: Arte de preparar y condimentar alimentos.", a: "Sabores" },
  T: { q: "Empieza por T: Aparato que permite hablar a distancia.", a: "Telefono" },
  U: { q: "Empieza por U: Lugares de estudio superiores.", a: "Universidades" },
  V: { q: "Empieza por V: Contrario de derrota.", a: "Victoria" },
  W: { q: "Empieza por W: Documento en internet (en inglés).", a: "Website" },
  X: { q: "Contiene la X: Aparato para obtener imágenes del interior del cuerpo.", a: "RayosX" },
  Y: { q: "Empieza por Y: Instrumento musical de teclas electrónicas (anglicismo).", a: "Yamaha" },
  Z: { q: "Empieza por Z: Animal rayado de África.", a: "Cebra" },
});

// ====== Estilos ======
const styles = {
  app: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif",
    padding: 16,
    background: "#0f172a",
    minHeight: "100vh",
    color: "#e2e8f0",
    boxSizing: "border-box",
  },
  container: { maxWidth: 980, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800 },
  timer: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#111827",
    border: "1px solid #1f2937",
    fontVariantNumeric: "tabular-nums",
  },
  controlsRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#1f2937",
    border: "1px solid #374151",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnDanger: { background: "#7f1d1d", borderColor: "#991b1b" },
  btnSuccess: { background: "#064e3b", borderColor: "#065f46" },
  btnWarn: { background: "#78350f", borderColor: "#92400e" },
  
  layout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 },
  roscoWrap: { position: "relative", aspectRatio: "1/1", background: "#0b1220", borderRadius: 24, border: "1px solid #1e293b" },
  circle: { position: "absolute", inset: 0, margin: 24 },
  letter: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    border: "2px solid #1f2937",
    background: "#0b1324",
  },
  panel: { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 14, display: "grid", gap: 12 },
  clue: { background: "#0b1020", padding: 12, borderRadius: 12, border: "1px solid #1e293b", minHeight: 88 },
  inputRow: { display: "flex", gap: 8 },
  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    background: "#0f172a",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    outline: "none",
  },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  stat: { background: "#0b1020", padding: 10, borderRadius: 12, border: "1px solid #1e293b", textAlign: "center" },
  footer: { opacity: 0.8, fontSize: 12 },
};

// Mapa de color por estado
const COLORS = {
  pending: "#334155",
  current: "#2563eb",
  pass: "#f59e0b",
  correct: "#10b981",
  wrong: "#ef4444",
};

// ====== Componente principal ======
export default function Pasapalabra() {
  // Estado del juego
  const [seconds, setSeconds] = useState(120);
  const [paused, setPaused] = useState(true);
  const [finished, setFinished] = useState(false);

  // Estructura del rosco: lista de letras con su estado y respuesta
  const initialRosco = useMemo(() => {
    return ABC.map((L) => ({
      letter: L,
      status: "pending", // pending | current | pass | correct | wrong
      q: QUESTION_BANK[L]?.q ?? `No hay pregunta para la letra ${L}.`,
      a: QUESTION_BANK[L]?.a ?? "",
      user: "",
    }));
  }, []);

  const [rosco, setRosco] = useState(initialRosco);
  const [idx, setIdx] = useState(0); // índice de la letra actual
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);

  // Colocar al primero pendiente como actual al iniciar
  useEffect(() => {
    setRosco((r) => r.map((n, i) => ({ ...n, status: i === 0 ? "current" : n.status })));
  }, []);

  // Temporizador
  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  // Fin por tiempo
  useEffect(() => {
    if (seconds === 0 && !finished) {
      setFinished(true);
      setPaused(true);
    }
  }, [seconds, finished]);

  // Focus automático
  useEffect(() => {
    if (!paused && !finished) inputRef.current?.focus();
  }, [paused, finished, idx]);

  // Atajos de teclado
  useEffect(() => {
    function onKey(e) {
      console.log(e.key)
          if (e.key.toLowerCase() === "1") restart();
      if (e.key.toLowerCase() === " ") togglePause();
      if (e.key.toLowerCase() === "3") {
        e.preventDefault();
        doPass();
      }
      if (e.key === "Enter") {doAnswer()
        return
      };
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, finished, idx, answer, rosco]);

  // Helpers de navegación
  const nextIndex = (from) => {
    // Buscar el siguiente índice que no esté correcto/incorrecto; si ninguno, devolver actual
    const total = rosco.length;
    for (let step = 1; step <= total; step++) {
      const j = (from + step) % total;
      if (["pending", "pass"].includes(rosco[j].status)) return j;
    }
    return from;
  };

  const remaining = rosco.filter((n) => ["pending", "pass", "current"].includes(n.status)).length;
  const correct = rosco.filter((n) => n.status === "correct").length;
  const wrong = rosco.filter((n) => n.status === "wrong").length;

  const current = rosco[idx];

  // Acciones principales
  function start() {
    if (finished) return;
    setPaused(false);
  }
  function togglePause() {
    if (finished) return;
    setPaused((p) => !p);
  }
  function restart() {
    console.log('restart')
    setSeconds(120);
    setPaused(true);
    setFinished(false);
    const fresh = ABC.map((L, i) => ({
      letter: L,
      status: i === 0 ? "current" : "pending",
      q: QUESTION_BANK[L]?.q ?? `No hay pregunta para la letra ${L}.`,
      a: QUESTION_BANK[L]?.a ?? "",
      user: "",
    }));
    setRosco(fresh);
    setIdx(0);
    setAnswer("");
  }

  function commitStatus(status) {
    setRosco((r) => {
      const copy = r.slice();
      copy[idx] = { ...copy[idx], status, user: answer };
      // Si queda todo resuelto, finalizar
      const anyLeft = copy.some((n) => ["pending", "pass", "current"].includes(n.status));
      if (!anyLeft) {
        setFinished(true);
        setPaused(true);
      }
      return copy;
    });
  }

  function moveNext() {
    const j = nextIndex(idx);
    setRosco((r) => r.map((n, i) => ({ ...n, status: i === j ? "current" : n.status })));
    setIdx(j);
    setAnswer("");
  }

  function doAnswer() {
    if (finished) return;
    if(!answer.trim()) return alert('ingrese una respuesta')
    const expected = normalize(current.a);
    const got = normalize(answer);
    if (!expected) return;
    if (expected === got) {
      commitStatus("correct");
    } else {
      commitStatus("wrong");
    }
    moveNext();
  }

  function doPass() {
    if (paused || finished) return;
    if (current.status === "current") commitStatus("pass");
    moveNext();
  }

  function answerHelper(e){
    if(e.target.value.toLowerCase() === "1"||e.target.value.toLowerCase() === " "||e.target.value.toLowerCase() === "3") return
    setAnswer(e.target.value)
  }

  // Render helpers
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.title}>Pasapalabra: El Rosco</div>
          <div style={styles.timer}>
            <ClockIcon />
            <b style={{ fontSize: 18 }}>{mm}:{ss}</b>
            <span style={{ opacity: 0.8, fontSize: 12 }}>{paused ? "(pausado)" : ""}</span>
          </div>
        </header>

        <div style={styles.controlsRow}>
          {!finished && (
            <>
              <button style={styles.btn} onClick={start} disabled={!paused} title="Iniciar (o reanudar)">▶️ Iniciar</button>
              <button style={styles.btn} onClick={togglePause} disabled={finished} title="P pausar/reanudar">⏯️ Pausar/Reanudar</button>
              <button style={{ ...styles.btn, ...styles.btnWarn }} onClick={doPass} disabled={paused || finished} title="Space para pasar">⏭️ Pasapalabra</button>
              <button style={{ ...styles.btn, ...styles.btnWarn }} onClick={restart}>🔁 Reiniciar</button>
            </>
          )}
          {finished &&               <button onClick={restart} style={{ ...styles.btn, ...styles.btnWarn }}>🔁 Reiniciar</button>
}
        </div>

        <div style={styles.layout}>
          <div style={styles.roscoWrap}>
            <RoscoCircle rosco={rosco} currentIndex={idx} />
          </div>

          <aside style={styles.panel}>
            <div style={styles.clue}>
              {!finished ? (
                <>
                  <div style={{ opacity: 0.8, fontSize: 20, marginBottom: 4 }}>
                    Letra <b>{current.letter}</b>
                  </div>
                  <div style={{ fontSize: 20 }}>{current.q}</div>
                </>
              ) : (
                <GameOverSummary secondsLeft={seconds} correct={correct} wrong={wrong} />
              )}
            </div>

            {!finished && (
              <div style={styles.inputRow}>
                <input
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Escribe tu respuesta"
                  value={answer}
                  onChange={(e) => answerHelper(e)}
                  disabled={finished}
                />
                <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={doAnswer} disabled={paused}>✅ Responder</button>
              </div>
            )}

            <div style={styles.stats}>
              <Stat label="Aciertos" value={correct} color={COLORS.correct} />
              <Stat label="Errores" value={wrong} color={COLORS.wrong} />
              <Stat label="Pendientes" value={remaining} color={COLORS.pending} />
            </div>

            <div style={styles.footer}>
              <ul className="atajos-lista"><b>Atajos:</b>
                <li>Enter = Responder</li>
                <li>NUM. 3 = Pasapalabra</li>
                <li>Space = Pausar/Reanudar</li>
                <li>NUM. 1 = Reiniciar (al finalizar)</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RoscoCircle({ rosco, currentIndex }) {
  const n = rosco.length;
  const radius = 180; // px (radio virtual)
  const center = 210; // px (centro virtual)
  return (
    <div style={styles.circle}>
      {rosco.map((node, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // inicia arriba
        const x = center + radius * Math.cos(angle) - 22;
        const y = center + radius * Math.sin(angle) - 22;
        let bg = COLORS.pending;
        if (node.status === "current") bg = COLORS.current;
        if (node.status === "pass") bg = COLORS.pass;
        if (node.status === "correct") bg = COLORS.correct;
        if (node.status === "wrong") bg = COLORS.wrong;
        return (
          <div key={node.letter} style={{ ...styles.letter, left: x, top: y, background: bg }} title={node.q}>
            {node.letter}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function GameOverSummary({ secondsLeft, correct, wrong }) {
  const result = correct === 27 ? "¡Rosco perfecto!" : secondsLeft === 0 ? "¡Tiempo agotado!" : "¡Rosco completado!";
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{result}</div>
      <ul style={{ lineHeight: 1.6 }}>
        <li>Tiempo restante: <b>{secondsLeft}s</b></li>
        <li>Aciertos: <b>{correct}</b></li>
        <li>Errores: <b>{wrong}</b></li>
        <li>Puntaje final: <b>{Math.max(0, correct * 10 - wrong * 5)}</b></li>
      </ul>
      <p style={{ marginTop: 8, opacity: 0.9 }}>Presiona <b>R</b> para jugar otra vez.</p>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#475569" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
