'use strict';
require('./mainMenu');
['downloadsUi', 'gamesUi'].forEach(function (m) {
  try { require('./' + m); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') console.error('[interactive]', m, e.message); }
});
module.exports = require('./router');
