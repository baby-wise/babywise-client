
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

export const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const socketRef = useRef(null);

		useEffect(() => {
			const s = io(SIGNALING_SERVER_URL);
			s.on('connect', () => console.log('[SOCKET] Connected:', s.id));
			s.on('connect_error', (err) => console.log('[SOCKET] Connect error:', err));
			socketRef.current = s;
			setSocket(s);

			return () => {
				if (socketRef.current) {
					socketRef.current.disconnect();
				}
			};
		}, []);

	return (
		<SocketContext.Provider value={socket}>
			{children}
		</SocketContext.Provider>
	);
};
