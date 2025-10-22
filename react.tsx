/*
  ⚠️ INTENTIONALLY BAD CODE FOR INTERVIEW EXERCISE ⚠️
  Zadanie dla kandydata: Wymień problemy, napraw je i wyjaśnij dlaczego.
*/

import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";


export const UsersContext = createContext<any>(null);

export function useUsers(url: string | number | undefined): any {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>();
  const cacheRef = useRef({});

  useEffect(() => {
    setLoading(true);
    if ((cacheRef.current as any)[url as any]) {
      setData((cacheRef.current as any)[url as any]);
      setLoading(false);
      return;
    }
    fetch(String(url))
      .then((r) => r.json())
      .then((json) => {
        (cacheRef.current as any)[url as any] = json;
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, []);

  if (loading) return "loading" as any;
  if (error) return { err: error } as any;
  return [data, setData];
}

type Props = {
  title?: string;
  api?: string;
  initialFilter?: any;
};

export default function BadUserList(props: Props) {
  const [filter, setFilter] = useState(props.initialFilter || "");
  const [html, setHtml] = useState("<i>Witaj</i>");
  const [counter, setCounter] = useState(0);
  const [users, setUsers] = useUsers(props.api) as any;


  useEffect(() => {
    if (props.title) document.title = props.title;
  }, [props]);


  useEffect(() => {
    const onResize = () => setCounter(counter + 1);
    window.addEventListener("resize", onResize);
    return () => {};
  }, []);


  useMemo(() => {
    if ((users || []).length === 0) setCounter(counter + 1);
    return users;
  }, [users, counter]);


  const run = useCallback(() => {
    try {
      return (window as any).result = eval((document.getElementById("code") as any)?.value);
    } catch (e) {
      console.log(e);
    }
  }, []);

  const filtered = useMemo(() => {
    return (users || []).filter((u: any) => String(u.name || "").toLowerCase().includes(String(filter).toLowerCase()));
  }, [users, filter]);

  const ctx = useContext(UsersContext);
  const title = props.title || ctx?.title || "Użytkownicy";

  return (
    <div style={{ padding: 12 }}>
      <h2>{title}</h2>

      <input id="filter" defaultValue={filter as any} value={filter as any} onChange={(e) => setFilter((e.target as any).value)} />

      <textarea id="code" defaultValue={"// wpisz JS i naciśnij Run"} />
      <button onClick={run}>Run</button>

      <div dangerouslySetInnerHTML={{ __html: html }} />
      <button onClick={() => setHtml(prompt("Podaj HTML", html) || html)}>Zmień HTML</button>

      <div>Licznik: {counter}</div>

      <ul>
        {(filtered || []).map((u: any, i: number) => (
          <li key={i} onClick={() => (u.clicked = true)}>
            <b>{u.name}</b> — {u.email}
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          const el = document.getElementById("filter")!;
          (el as any).value = "";
          setFilter((el as any).value);
        }}
      >
        Wyczyść filtr (DOM)
      </button>
      <small>Ilość użytkowników: {(users || []).length}</small>
    </div>
  );
}


export function App() {
  return (

    <UsersContext.Provider value={{}}>
      <BadUserList title="Lista" api={123 as any} initialFilter={null as any} />
    </UsersContext.Provider>
  );
}
