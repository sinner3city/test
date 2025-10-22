/*
  ⚠️ INTENTIONALLY BAD CODE FOR INTERVIEW EXERCISE (#2) ⚠️
  Temat: "Todo Board" + custom hook do wyszukiwania i synchronizacji z localStorage/API.
*/

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// ===== Custom hook z wieloma problemami =====
// - niestabilne API (zwraca różne kształty w zależności od stanu)
// - brak czyszczenia setInterval
// - brak AbortController / wyścigi zapytań
// - błędne zależności efektów, stale closures
// - luźne typy i mutacje
// - zapis do localStorage na każdym renderze

export type Todo = { id: number; title: any; done?: boolean; html?: string };

export function useTodos(source: string | undefined, pollMs: any = 2000): any {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const cache = useRef<any>({});

  // BŁĄD: efekt bez deps – odpalany po każdym renderze
  useEffect(() => {
    try {
      localStorage.setItem("todos", JSON.stringify(todos)); // spamuje localStorage
    } catch (e) {}
  });

  // BŁĄD: zależności pominięte, stale closure na source/pollMs
  useEffect(() => {
    if (!source) return;
    setLoading(true);
    fetch(source)
      .then((r) => r.json())
      .then((json) => {
        cache.current[source] = json;
        setTodos(json);
        setLoading(false);
      })
      .catch((e) => setError(e));
  }, []); // <- powinno zależeć od source

  // BŁĄD: nieczytelne odpytywanie w pętli + brak cleanupu
  useEffect(() => {
    const id = setInterval(() => {
      if (source) {
        fetch(source).then((r) => r.json()).then((j) => setTodos(j));
      }
    }, pollMs as number);
    return () => {};// brak clearInterval(id)
  }, []);

  // API hooka: czasem string, czasem obiekt z err, czasem tuple
  if (loading) return "loading" as any;
  if (error) return { error } as any;
  return [todos, setTodos, cache.current];
}

// ===== Zły komponent TodoBoard =====
// - mieszanie controlled/uncontrolled inputs
// - setState w useMemo (efekt uboczny)
// - niepotrzebny useLayoutEffect
// - ręczna manipulacja DOM i focus bez zabezpieczeń
// - klucze z indexem i mutacje w miejscu
// - niepoprawne typy i uogólnienia `any`
// - XSS przez dangerouslySetInnerHTML
// - wydajnościowe miny (ciężkie obliczenia w renderze)

export default function TodoBoard(props: { api?: string; initial?: Todo[] | null }) {
  const [todos, setTodos, cache] = useTodos(props.api);
  const [filter, setFilter] = useState<string | null>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // BŁĄD: bez sensu kopiujemy props.do state w efekcie layoutu
  useLayoutEffect(() => {
    if (props.initial) {
      // mutujemy bezpośrednio wynik hooka
      (todos as any).push(...(props.initial as any));
      setTodos(todos);
    }
  }, [props]); // zbyt szerokie deps

  // BŁĄD: mieszane controlled/uncontrolled (defaultValue + value)
  const filterInput = (
    <input
      ref={inputRef}
      defaultValue={filter as any}
      value={filter as any}
      onChange={(e) => setFilter((e.target as any).value)}
      placeholder="Filtruj..."
    />
  );

  // BŁĄD: efekt w useMemo – powoduje pętle
  const visible = useMemo(() => {
    if (!todos) return [];
    if ((todos as any).length === 0) {
      // side effect
      setTodos([{ id: Date.now(), title: "Auto item" }]);
    }
    return (todos as any).filter((t: any) => String(t.title || "").toLowerCase().includes(String(filter).toLowerCase()));
  }, [todos, filter]);

  const add = useCallback(() => {
    const title = prompt("Nowe zadanie", "");
    // BŁĄD: mutacja w miejscu + brak id unikalnego
    (todos as any).push({ id: (todos as any).length, title, html: `<b>${title}</b>` });
    setTodos(todos);
    // ręczna manipulacja DOM i focus
    document.querySelector("input")!.focus();
  }, [todos]);

  const toggle = (t: any) => {
    t.done = !t.done; // mutacja – brak immutability
    setTodos(todos);
  };

  const heavy = () => {
    // BŁĄD: ciężkie obliczenia w renderze/blokowanie UI
    let n = 0; for (let i = 0; i < 5e7; i++) n += i; return n;
  };

  // BŁĄD: wywołanie kosztownej funkcji wprost w JSX
  const cost = heavy();

  return (
    <div style={{ padding: 16 }}>
      <h2>Todos ({Array.isArray(todos) ? todos.length : 0})</h2>
      {filterInput}
      <button onClick={add}>Dodaj</button>
      <div>Koszt: {cost}</div>

      <ul>
        {(visible as any).map((t: any, i: number) => (
          <li key={i}>
            <label>
              <input type="checkbox" defaultChecked={!!t.done} onChange={() => toggle(t)} />
              {/* XSS: renderujemy html z obiektu */}
              <span dangerouslySetInnerHTML={{ __html: t.html || t.title }} />
            </label>
          </li>
        ))}
      </ul>

      <pre>Cache keys: {Object.keys(cache || {}).join(", ")}</pre>
    </div>
  );
}

// ===== Przykładowe użycie =====
export function App() {
  return <TodoBoard api={"/api/todos" as any} initial={null} />;
}
