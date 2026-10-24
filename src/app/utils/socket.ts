import { type Server as HttpServer } from 'node:http';

import { Server, type Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allows Next.js client connections
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join_room', (room: string) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

export const getIO = (): Server | null => {
  return io;
};

export const emitEvent = (event: string, data: unknown) => {
  if (io) {
    io.emit(event, data);
  }
};
