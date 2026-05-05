// src/contexts/DrawerContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const DrawerContext = createContext();

export function useDrawer() {
  return useContext(DrawerContext);
}

export function DrawerProvider({ children }) {
  const [pendingExpense, setPendingExpense] = useState(null);

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('pendingExpense');
    if (saved) {
      try {
        setPendingExpense(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (pendingExpense) {
      localStorage.setItem('pendingExpense', JSON.stringify(pendingExpense));
    } else {
      localStorage.removeItem('pendingExpense');
    }
  }, [pendingExpense]);

  const startExpense = (expenseData) => {
    setPendingExpense(expenseData);
  };

  const clearExpense = () => {
    setPendingExpense(null);
  };

  return (
    <DrawerContext.Provider value={{ pendingExpense, startExpense, clearExpense }}>
      {children}
    </DrawerContext.Provider>
  );
}