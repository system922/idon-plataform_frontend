import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import API_BASE from '../config/apiBase';

/**
 * Connects to the business Socket.IO room and calls onRefresh()
 * whenever any of the watched entities change in the DB.
 *
 * @param {string|string[]} entities  - entity name(s) to watch, e.g. 'products' or ['products','categories']
 * @param {() => void}      onRefresh - callback to re-fetch data
 */
export function useRealtimeSync(entities, onRefresh) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const watchKey = Array.isArray(entities) ? entities.join(',') : entities;

  useEffect(() => {
    const token    = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const business = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
    const businessId = business?.id;

    if (!token || !businessId) return;

    const watched = watchKey.split(',');

    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socket.on('data_changed', ({ entity }) => {
      if (watched.includes(entity)) {
        onRefreshRef.current();
      }
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchKey]);
}
