import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import roscosData from "./roscos.json";

// ====== Utilidades ======
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]/g, "")
    .trim();
}

// ====== Banco de preguntas ======
const QUESTION_BANK = {
  A: { q: "Empieza por A: País sudamericano cuya capital es Buenos Aires.", a: "Argentina" },
  B: { q: "Empieza por B: Bebida caliente que se hace con granos tostados.", a: "Cafe" },
  C: { q: "Empieza por C: Satélite natural de la Tierra.", a: "Luna" },
  D: { q: "Empieza por D: Día que sigue al lunes.", a: "Martes" },
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
};

const COLORS = {
  pending: "#334155",
  current: "#2563eb",
  pass: "#f59e0b",
  correct: "#10b981",
  wrong: "#ef4444",
};

// ====== Helpers ======
function inicializarRosco(index) {
  return ABC.map((L, i) => ({
    letter: L,
    status: i === 0 ? "current" : "pending",
    q: roscosData[index][L]?.q ?? `No hay pregunta para la letra ${L}.`,
    a: roscosData[index][L]?.a ?? "",
  }));
}

// ====== Componente principal ======
export default function Pasapalabra() {

  console.log(roscosData)
  const [players, setPlayers] = useState([
    { name: "Jugador 1", rosco: null , selectedRosco:null, correct: 0, wrong: 0, time: 120, paused: true, finished: false, idx: 0 },
    { name: "Jugador 2", rosco: null , selectedRosco:null, correct: 0, wrong: 0, time: 120, paused: true, finished: false, idx: 0 },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);
  const [selectedRosco, setSelectedRosco] = useState(null);

  // Temporizadores separados
  useEffect(() => {
    if (players[currentPlayer].finished) {
      return;
    }
    const id = setInterval(() => {
      setPlayers((ps) =>
        ps.map((p, i) => {
          if (i === currentPlayer && !p.paused && !p.finished && p.time > 0) {
            return { ...p, time: p.time - 1 };
          }
          return p;
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [currentPlayer]);

  useEffect(() => {
    const p = players[currentPlayer];
    if (p.time === 0 && !p.finished) {
      endTurn(currentPlayer);
      switchTurn();
    }
  }, [players, currentPlayer]);

  function switchTurn() {
    setCurrentPlayer((prev) => (prev === 0 ? 1 : 0));
  }

  function startGame() {
    setPlayers((ps) =>
      ps.map((p, i) => ({ ...p, paused: i !== currentPlayer, finished: false, time: 120 }))
    );
  }

  function togglePause() {
    setPlayers((ps) =>
      ps.map((p, i) => ({ ...p, paused: i === currentPlayer ? !p.paused : true }))
    );
  }

  function restart() {
    console.log(players[currentPlayer])
    if (!players[currentPlayer].rosco) return; // No reiniciar si no hay rosco seleccionado
    const nuevoRosco = inicializarRosco(players[currentPlayer].selectedRosco - 1)
    setPlayers((ps) =>
      ps.map((p, i) => {
          if (i === currentPlayer) {
            return { ...p, rosco: nuevoRosco, correct: 0, wrong: 0, time: 120, paused: true, finished: false, idx: 0 };
          }
          return p;
      }
        )
    );
    setAnswer("");
  
  }
  function commitStatus(playerIndex, status) {
    setPlayers((ps) => {
      const copy = [...ps];
      const p = { ...copy[playerIndex] };
      const r = [...p.rosco];
      r[p.idx] = { ...r[p.idx], status, user: answer };
      if (status === "correct") p.correct++;
      if (status === "wrong") p.wrong++;
      p.rosco = r;
      copy[playerIndex] = p;
      return copy;
    });
  }

  function moveNext(playerIndex) {
    setPlayers((ps) => {
      const copy = [...ps];
      const p = { ...copy[playerIndex] };
      const total = p.rosco.length;
      for (let step = 1; step <= total; step++) {
        const j = (p.idx + step) % total;
        if (["pending", "pass"].includes(p.rosco[j].status)) {
          p.idx = j;
          break;
        }
      }
      copy[playerIndex] = p;
      return copy;
    });
    setAnswer("");
  }

  function doAnswer() {
    const p = players[currentPlayer];
    if (p.finished) return;
    const expected = normalize(p.rosco[p.idx].a);
    const got = normalize(answer);
    if (expected === got) {
      commitStatus(currentPlayer, "correct");
    } else {
      commitStatus(currentPlayer, "wrong");
    }
    moveNext(currentPlayer);
  }

  function doPass() {
    const p = players[currentPlayer];
    if (p.paused || p.finished) return;
    commitStatus(currentPlayer, "pass");
    moveNext(currentPlayer);
    switchTurn();
  }

  function endTurn(i) {
    setPlayers((ps) => ps.map((p, idx) => (idx === i ? { ...p, finished: true, paused: true } : p)));
  }

   const handleSelectRosco = (num) => {
    console.log("Seleccionado rosco:", num);
    setSelectedRosco(num);
    setPlayers((ps) => {
      const copy = [...ps];
      const p = { ...copy[currentPlayer] };
      p.rosco = inicializarRosco(num-1);
      p.selectedRosco = num;
      copy[currentPlayer] = p;
      return copy;
    });
  };

  const p = players[currentPlayer];
  const mm = String(Math.floor(p.time / 60)).padStart(2, "0");
  const ss = String(p.time % 60).padStart(2, "0");

  return (
    <div className="app">
      <div className="header">
        <div className="timer"> {mm}:{ss} {p.paused ? "(pausado)" : ""}</div>
        <div className="player-change-container">
        <button onClick={() => setCurrentPlayer(0)} disabled={currentPlayer === 0}>Jugador 1</button>
        <button onClick={() => setCurrentPlayer(1)} disabled={currentPlayer === 1}>Jugador 2</button>
                 <div className="stats">
            <div>Aciertos: {p.correct}</div>
            <div>Errores: {p.wrong}</div>
          </div>
      </div>
      </div>

      
      

      <div className="layout">
      {!players[currentPlayer].selectedRosco &&<h2>Seleccioná un rosco</h2>} 
      <div className="rosco-selection">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            onClick={() => handleSelectRosco(n)}
            style={{
              padding: "10px 20px",
              background: players[currentPlayer].selectedRosco === n ? "orange" : "#ccc",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
            disabled={players[currentPlayer].selectedRosco}
          >
            Rosco {n}
          </button>
        ))}
      </div>
      {p.rosco &&
        <div className="rosco">
          <RoscoCircle rosco={p.rosco} />
        </div>}
       
        {p.rosco &&
        <div className="panel">
          <div className="clue">Letra actual: {p.rosco[p.idx].letter}</div>
           <div className="clue">{p.rosco[p.idx].q}</div>
          <div className="inputRow">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Respuesta"
            />
            <button onClick={doAnswer}>Responder</button>
          </div>
           <div className="controls">
        <button onClick={startGame}>Iniciar</button>
        <button onClick={togglePause}>Pausar/Reanudar</button>
        <button onClick={doPass}>Pasapalabra</button>
        <button onClick={restart}>Reiniciar</button>
      </div>
 
        </div>}
      </div>
    </div>
  );
}

function RoscoCircle({ rosco }) {
  const n = rosco.length;
  const radius = 180;
  const center = 200;
  return (
    <div className="circle">
      {rosco.map((node, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(angle) - 20;
        const y = center + radius * Math.sin(angle) - 20;
        return (
          <div
            key={node.letter}
            className="letter"
            style={{ left: x, top: y,background: COLORS[node.status] }}
          >
            {node.letter}
          </div>
        );
      })}
    </div>
  );
}
