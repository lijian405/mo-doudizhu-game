const handleGetOnlineCount = require('./getOnlineCount');
const handleJoinRoom = require('./joinRoom');
const handleLeaveRoom = require('./leaveRoom');
const handleStartGame = require('./startGame');
const handleCallLandlord = require('./callLandlord');
const handlePlayCards = require('./playCards');
const handlePass = require('./pass');
const handleHintRequest = require('./hintRequest');
const handleGetRooms = require('./getRooms');
const handleTrust = require('./trust');
const handleAddAI = require('./addAI');
const handleKickPlayer = require('./kickPlayer');

module.exports = {
  getOnlineCount: handleGetOnlineCount,
  joinRoom: handleJoinRoom,
  leaveRoom: handleLeaveRoom,
  startGame: handleStartGame,
  callLandlord: handleCallLandlord,
  playCards: handlePlayCards,
  pass: handlePass,
  hintRequest: handleHintRequest,
  getRooms: handleGetRooms,
  trust: handleTrust,
  addAI: handleAddAI,
  kickPlayer: handleKickPlayer
};