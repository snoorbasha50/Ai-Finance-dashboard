import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function setSocketServer(server: SocketServer): void {
  io = server;
}

export function emitToAll(event: string, data: unknown): void {
  if (io) io.emit(event, data);
}
