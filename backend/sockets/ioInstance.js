/**
 * NOTE ON MERGE / FIX: the original scoringController.js obtained the
 * Socket.IO instance via a lazy `require('../server')` call inside each
 * controller function. That works but creates a circular dependency
 * between server.js and the controller, and breaks the moment the file
 * layout changes. This tiny singleton module lets server.js set the io
 * instance once at boot, and any controller/service import it cleanly
 * with no circular require.
 */
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized yet. Call setIO(io) from server.js first.');
  }
  return ioInstance;
};

module.exports = { setIO, getIO };
