'use strict';
require('./mainMenu');
['downloadsUi', 'gamesUi', 'animeUi', 'rpgUi', 'suggest', 'idioma', 'filmeUi'].forEach(function (m) {
  try { require('./' + m); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') console.error('[interactive]', m, e.message); }
});
try { require('./universal').wrapAll(); } catch (e) { console.error('[interactive] universal', e.message); }
module.exports = require('./router');
