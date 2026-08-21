import { useEffect, useState } from "react";
import { fetchWithAuth } from '../config/api';

export default function usePrinterTicket() {
  const [printerTicket, setPrinterTicket] = useState(null);

  useEffect(() => {
    fetchWithAuth('/settings')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!json) return;
        const raw = json.data?.printer_ticket;
        if (raw) {
          try { setPrinterTicket(JSON.parse(raw)); }
          catch { setPrinterTicket(null); }
        } else {
          setPrinterTicket(null);
        }
      })
      .catch(() => setPrinterTicket(null));
  }, []);

  return printerTicket;
}
