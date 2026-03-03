import { Server } from 'socket.io';

const getIO = (): Server | undefined => (global as any).io;

export const emitStockUpdate = (branchId: string, data: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`branch:${branchId}`).emit('stock:updated', data);
};

export const emitLowStockAlert = (branchId: string, data: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`branch:${branchId}`).emit('stock:low_alert', data);
};
