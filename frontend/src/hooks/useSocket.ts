import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Transaction } from '../types';

export function useSocket(onNewTransaction: (t: Transaction) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('new-transaction', onNewTransaction);

    return () => {
      socket.disconnect();
    };
  }, [onNewTransaction]);

  return socketRef;
}
