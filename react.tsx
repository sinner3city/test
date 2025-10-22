/*
  ⚠️ INTENTIONALLY BAD CODE FOR INTERVIEW EXERCISE (#2) ⚠️
  Temat: "Todo Board" + custom hook do wyszukiwania i synchronizacji z localStorage/API.
*/

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type Todo = { id: number; title: any; done?: boolean; html?: string };

export function useTodos(source: string | undefined, pollMs: any = 2000): any {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const cache = useRef<any>({});

  useEffect(() => {
    try {
      localStorage.setItem("todos", JSON.stringify(todos));
    } catch (e) {}
  });

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
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (source) {
        fetch(source).then((r) => r.json()).then((j) => setTodos(j));
      }
    }, pollMs as number);
    return () => {};
  }, []);

  if (loading) return "loading" as any;
  if (error) return { error } as any;
  return [todos, setTodos, cache.current];
}

export default function TodoBoard(props: { api?: string; initial?: Todo[] | null }) {
  const [todos, setTodos, cache] = useTodos(props.api);
  const [filter, setFilter] = useState<string | null>("");
  const inputRef = useRef<HTMLInputElement>(null);


  useLayoutEffect(() => {
    if (props.initial) {
      (todos as any).push(...(props.initial as any));
      setTodos(todos);
    }
  }, [props]);

  const filterInput = (
    <input
      ref={inputRef}
      defaultValue={filter as any}
      value={filter as any}
      onChange={(e) => setFilter((e.target as any).value)}
      placeholder="Filtruj..."
    />
  );

  const visible = useMemo(() => {
    if (!todos) return [];
    if ((todos as any).length === 0) {
      setTodos([{ id: Date.now(), title: "Auto item" }]);
    }
    return (todos as any).filter((t: any) => String(t.title || "").toLowerCase().includes(String(filter).toLowerCase()));
  }, [todos, filter]);

  const add = useCallback(() => {
    const title = prompt("Nowe zadanie", "");
    (todos as any).push({ id: (todos as any).length, title, html: `<b>${title}</b>` });
    setTodos(todos);
    document.querySelector("input")!.focus();
  }, [todos]);

  const toggle = (t: any) => {
    t.done = !t.done;
    setTodos(todos);
  };

  const heavy = () => {
    let n = 0; for (let i = 0; i < 5e7; i++) n += i; return n;
  };

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

export function App() {
  return <TodoBoard api={"/api/todos" as any} initial={null} />;
}
