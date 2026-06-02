/**
 * Promise wrapper for joinSocketToRoom callbacks.
 */
function promisifyJoin(joinSocketToRoom, socket, roomCode) {
  return new Promise((resolve, reject) => {
    joinSocketToRoom(socket, roomCode, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { promisifyJoin };
