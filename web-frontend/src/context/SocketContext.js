'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '@/utils/auth';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const initSocket = () => {
      const token = getToken();
      if (!token) {
        setSocket((prevSocket) => {
          if (prevSocket) prevSocket.disconnect();
          return null;
        });
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      
      const newSocket = io(socketUrl, {
        auth: { token },
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server:', newSocket.id);
      });

      setSocket((prevSocket) => {
        if (prevSocket) prevSocket.disconnect();
        return newSocket;
      });
    };

    initSocket();

    const handleAuthChange = () => {
      initSocket();
    };

    window.addEventListener('qc-auth', handleAuthChange);

    return () => {
      window.removeEventListener('qc-auth', handleAuthChange);
      setSocket((prevSocket) => {
        if (prevSocket) prevSocket.disconnect();
        return null;
      });
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);