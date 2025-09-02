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
      return alert(`${players[currentPlayer].name} ha terminado su juego.`);
    }
    if (players[currentPlayer].time === 0) {
      return alert(`${players[currentPlayer].name} ha terminado su tiempo.`);
    }
    let answeredQuestions = players[currentPlayer].correct + players[currentPlayer].wrong;
    if (answeredQuestions >= 26) {
      setPlayers((ps) =>
      ps.map((p, i) => ({ ...p, finished: i === currentPlayer && true }))
    );
      endTurn(currentPlayer);

      return alert(`${players[currentPlayer].name} ha respondido todas las preguntas. Fin del juego.`);
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
  }, [currentPlayer], [players]);

  useEffect(() => {
    const p = players[currentPlayer];
    if (p.time === 0 && !p.finished) {
      endTurn(currentPlayer);
      switchTurn();
    }
  }, [players, currentPlayer]);

    useEffect(() => {
    const handleKeyDown = (e) => {
             

      if (e.code === "Space") {
         
        e.preventDefault(); // evita que baje el scroll al apretar espacio
        togglePause();
      }
      if (e.code === "Enter") {
        e.preventDefault(); // evita que baje el scroll al apretar espacio
        if(answer.trim() === "") return alert("Por favor, ingresa una respuesta antes de enviar.");
        doAnswer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    // cleanup al desmontar el componente
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPlayer, answer, players]);

  function switchTurn() {
    setCurrentPlayer((prev) => (prev === 0 ? 1 : 0));
  }



  function togglePause() {
     if (players[currentPlayer].finished) {
      return alert(`${players[currentPlayer].name} ha terminado su juego.`);
    }
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
    let answeredQuestions = players[currentPlayer].correct + players[currentPlayer].wrong;
    if (answeredQuestions >= 26) {
      endTurn(currentPlayer);
      return alert(`${players[currentPlayer].name} ha respondido todas las preguntas. Fin del juego.`);
    }
    if (p.finished) return alert('Tu juego ha terminado. Por favor, reinicia para jugar de nuevo.');
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
    if (p.paused || p.finished) return alert('No puedes pasar si estás en pausa o tu juego ha terminado.');
    togglePause()
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
      <div className="left-side">
      <div className="header">
        <div className="timer"> {mm}:{ss} {p.paused ? "(PAUSADO⏸️)" : ""}</div>
        <div className="player-change-container">
        <button disabled={currentPlayer === 0} onClick={() => setCurrentPlayer(0)}>Jugador 1</button>
        <button disabled={currentPlayer === 1} onClick={() => setCurrentPlayer(1)}>Jugador 2</button>

                 <div className="stats">
            <div>Aciertos: {p.correct}</div>
            <div>Errores: {p.wrong}</div>
          </div>
      </div>
      </div>
      
      <div className="layout">
      {!players[currentPlayer].selectedRosco &&<h2>Seleccioná un rosco</h2>} 
      {!players[currentPlayer].selectedRosco &&
      <div className="rosco-selection">
        {[1, 2].map((n) => (
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
      </div>}
      {p.rosco &&
        <div className="rosco">
          <RoscoCircle rosco={p.rosco} />
        </div>}
       </div>
       </div>
      <div className="right-side">

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
        <button onClick={togglePause}>Pausar/Reanudar</button>
        <button onClick={doPass}>Pasapalabra</button>
        <button onClick={restart}>Reiniciar</button>
      </div>
      <ul className="fast-access-keys"><b>Teclas de acceso rápido:</b>
        <li><b>Enter:</b> enviar respuesta</li>
        <li><b>Espacio:</b> pausar/reanudar</li>
      </ul>
      
      { selectedRosco === 2 &&  <p className="advice">En este rosco todas las palabras comienzan con la letra actual</p>}
 
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
