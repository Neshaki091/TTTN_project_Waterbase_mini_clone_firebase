module.exports = (io) => {
  io.on('connection', (socket) => {
    const { appId } = socket.handshake.query || {};

    if (!appId) {
      socket.emit('error', { message: 'Missing appId in connection query' });
      return socket.disconnect(true);
    }

    const appRoom = `app:${appId}`;
    socket.join(appRoom);

    socket.on('subscribe', ({ collection }) => {
      if (!collection) return;
      const room = `${appRoom}:collection:${collection.toLowerCase()}`;
      socket.join(room);
    });

    socket.on('unsubscribe', ({ collection }) => {
      if (!collection) return;
      const room = `${appRoom}:collection:${collection.toLowerCase()}`;
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      // nothing yet
    });
  });
};

