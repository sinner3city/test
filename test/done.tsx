/*
  ✅ Refactored solution for "Bad React/TS Exercise #2 – Todo Board"
  Cele:
  - Stabilne API hooka (spójny kształt zwracanych danych)
  - Poprawne zależności efektów i cleanupy (fetch, polling)
  - Brak side‑effectów w renderze/useMemo
  - Immutability, kontrolowane inputy, brak XSS
  - Łatwe do testowania, typowane, zrozumiałe
*/

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ===== Typy =====
export type Todo = { id: string; title: string; done: boolean };

// ===== Pomocnicze =====
function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ===== Custom hook (poprawiony) =====
// API: zawsze zwraca ten sam kształt obiektu
// - lazy fetch + opcjonalny polling z correct cleanup
// - AbortController na wyścigi zapytań
// - localStorage jako optymalny cache/durable state (opcjonalnie)

export function useTodos(params: {
  source?: string; // np. "/api/todos"
  pollMs?: number; // 0 => brak pollingu
  persistKey?: string; // np. "todos"
}) {
  const { source, pollMs = 0, persistKey } = params;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Wczytaj z localStorage (opcjonalnie) raz, przed siecią
  useEffect(() => {
    if (!persistKey) return;
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Todo[];
        if (Array.isArray(parsed)) setTodos(parsed);
      }
    } catch {}
  }, [persistKey]);

  const fetchTodos = useCallback(async () => {
    if (!source) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(source, { signal: ac.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Array<Partial<Todo>>;
      const normalized: Todo[] = (json || []).map((t) => ({
        id: String(t.id ?? uid()),
        title: String(t.title ?? "Untitled"),
        done: Boolean(t.done),
      }));
      setTodos(normalized);
    } catch (e) {
      if ((e as any)?.name !== "AbortError") setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [source]);

  // initial fetch + refetch on source change
  useEffect(() => {
    void fetchTodos();
    return () => abortRef.current?.abort();
  }, [fetchTodos]);

  // Polling (opcjonalny)
  useEffect(() => {
    if (!pollMs || pollMs <= 0 || !source) return;
    const id = setInterval(() => void fetchTodos(), pollMs);
    return () => clearInterval(id);
  }, [pollMs, source, fetchTodos]);

  // Persist (opcjonalnie) po zmianach
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify(todos));
    } catch {}
  }, [persistKey, todos]);

  // Operacje CRUD – stabilne referencje (przydają się, gdy przekażemy do dzieci)
  const add = useCallback((title: string) => {
    setTodos((prev) => [...prev, { id: uid(), title, done: false }]);
  }, []);

  const toggle = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const remove = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const replaceAll = useCallback((next: Todo[]) => {
    setTodos(next);
  }, []);

  return { todos, loading, error, add, toggle, remove, replaceAll, refresh: fetchTodos } as const;
}

// ===== Komponent =====
export default function TodoBoard(props: { api?: string; initial?: Todo[] | null }) {
  const { todos, loading, error, add, toggle, remove, replaceAll, refresh } = useTodos({
    source: props.api,
    pollMs: 0, // można włączyć np. 5000
    persistKey: "todos",
  });

  // Jednorazowe zasianie danymi początkowymi (bez mutacji w miejscu)
  useEffect(() => {
    if (props.initial && props.initial.length) {
      // unikaj duplikatów po id
      const byId = new Map<string, Todo>();
      [...props.initial, ...todos].forEach((t) => byId.set(String(t.id), { ...t, id: String(t.id) } as Todo));
      replaceAll(Array.from(byId.values()));
    }
    // celowo ignorujemy "todos" tutaj, żeby nie wpaść w pętlę – inicjalizacja jednokrotna na podstawie props.initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initial, replaceAll]);

  const [filter, setFilter] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Filtrowanie – czysto obliczeniowe, memo gdy lista duża
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? todos.filter((t) => t.title.toLowerCase().includes(q)) : todos;
  }, [todos, filter]);

  const onAdd = useCallback(() => {
    const title = newTitle.trim();
    i
