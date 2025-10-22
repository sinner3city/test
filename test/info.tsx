/*
  ⚠️ INTENTIONALLY BAD CODE FOR INTERVIEW EXERCISE ⚠️
  Zadanie dla kandydata: Wymień problemy, napraw je i wyjaśnij dlaczego.
*/

import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";

// ==== Niepotrzebny i źle użyty context ====
export const UsersContext = createContext<any>(null); // any + brak domyślnych wartości

// ==== Custom hook z licznymi problemami ====
// - nadmiar any
// - zależności w useEffect są błędne (pusta tablica, ale używamy url)
// - mutujemy stan bezpiecznie? nie
// - nieobsłużone wyjątki, brak abort controllera
// - zwracamy różne kształty w zależności od stanu (nieprzewidywalny typ)
export function useUsers(url: string | number | undefined): any {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>();
  const cacheRef = useRef({});

  // BŁĄD: używanie url z pustą tablicą deps powoduje stale closure
  useEffect(() => {
    setLoading(true);
    // BŁĄD: brak walidacji URL i brak AbortController
    if ((cacheRef.current as any)[url as any]) {
      // BŁĄD: bez klonowania i bez resetu erroru
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
  }, []); // <- brak url w deps

  // BŁĄD: niestabilne API hooka
  if (loading) return "loading" as any;
  if (error) return { err: error } as any;
  return [data, setData]; // czasem string, czasem object, czasem tuple
}

// ==== Komponent z anty‑wzorcami ====
// - wiele stanów pochodnych, które można obliczyć w locie
// - niepotrzebne useMemo/useCallback
// - niebezpieczne dangerouslySetInnerHTML
// - mieszanie controlled/uncontrolled inputs
// - brak key lub index jako key
// - event listeners bez cleanupu
// - niepoprawne typy i rzutowania
// - bezsensowny re-render przez mutację stanu
// - fetch wywoływany w renderze (przez eval) – potencjalna pętla

type Props = {
  title?: string;
  api?: string; // np. "https://jsonplaceholder.typicode.com/users"
  initialFilter?: any; // any
};

export default function BadUserList(props: Props) {
  const [filter, setFilter] = useState(props.initialFilter || "");
  const [html, setHtml] = useState("<i>Witaj</i>");
  const [counter, setCounter] = useState(0);
  const [users, setUsers] = useUsers(props.api) as any; // BŁĄD: zakładamy tuple

  // BŁĄD: kopiowanie props do state bez powodu
  useEffect(() => {
    if (props.title) document.title = props.title; // efekt globalny bez cleanupu
  }, [props]); // zbyt szeroka zależność

  // BŁĄD: globalny event listener bez cleanupu
  useEffect(() => {
    const onResize = () => setCounter(counter + 1); // stale closure
    window.addEventListener("resize", onResize);
    return () => {
      // BŁĄD: zapomniany removeEventListener – memory leak
      // window.removeEventListener("resize", onResize);
    };
  }, []);

  // BŁĄD: bezużyteczny useMemo, do tego mutuje stan w środku (antywzorzec)
  useMemo(() => {
    if ((users || []).length === 0) setCounter(counter + 1); // side‑effect w useMemo
    return users;
  }, [users, counter]);

  // BŁĄD: niepotrzebny i niebezpieczny eval bazujący na wejściu użytkownika
  const run = useCallback(() => {
    try {
      // np. wpisanie "fetch(props.api)" wywoła fetch w renderze/kliknięciu i może zapętlić UI
      // @ts-ignore
      return (window as any).result = eval((document.getElementById("code") as any)?.value);
    } catch (e) {
      console.log(e);
    }
  }, []);

  const filtered = useMemo(() => {
    // BŁĄD: operacje defensywne bez typów
    return (users || []).filter((u: any) => String(u.name || "").toLowerCase().includes(String(filter).toLowerCase()));
  }, [users, filter]);

  const ctx = useContext(UsersContext); // BŁĄD: nigdy nie podajemy providera, więc null
  const title = props.title || ctx?.title || "Użytkownicy";

  return (
    <div style={{ padding: 12 }}>
      <h2>{title}</h2>

      {/* Mieszanie controlled i uncontrolled */}
      <input id="filter" defaultValue={filter as any} value={filter as any} onChange={(e) => setFilter((e.target as any).value)} />

      {/* Pole do eval – XSS/arb. code execution */}
      <textarea id="code" defaultValue={"// wpisz JS i naciśnij Run"} />
      <button onClick={run}>Run</button>

      {/* Niebezpieczne HTML z wejścia */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <button onClick={() => setHtml(prompt("Podaj HTML", html) || html)}>Zmień HTML</button>

      <div>Licznik: {counter}</div>

      {/* Brak key albo index jako key */}
      <ul>
        {(filtered || []).map((u: any, i: number) => (
          <li key={i} onClick={() => (u.clicked = true)}> {/* mutacja obiektu */}
            <b>{u.name}</b> — {u.email}
          </li>
        ))}
      </ul>

      {/* Antywzorzec: bezpośrednia manipulacja DOM */}
      <button
        onClick={() => {
          const el = document.getElementById("filter")!; // non‑null assertion
          (el as any).value = "";
          setFilter((el as any).value); // stan i DOM rozjeżdżają się
        }}
      >
        Wyczyść filtr (DOM)
      </button>

      {/* BŁĄD: brak obsługi stanu ładowania/błędu z hooka */}
      <small>Ilość użytkowników: {(users || []).length}</small>
    </div>
  );
}

// ==== Przykładowe użycie (też niedoskonałe) ====
export function App() {
  return (
    // BŁĄD: Provider bez wartości sensownej
    <UsersContext.Provider value={{}}>
      {/* BŁĄD: przekazujemy liczbę jako URL, hook zrobi String(url) */}
      <BadUserList title="Lista" api={123 as any} initialFilter={null as any} />
    </UsersContext.Provider>
  );
}
