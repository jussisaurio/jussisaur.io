const chokidar = require("chokidar");
const liveServer = require("live-server");
const { exec } = require("child_process");
const { promisify } = require("util");

const execute = promisify(exec);

let _building = false;
let _newestChange = null;

const debounce = (fn, time = 1000) => {
  let queue = [];
  let debounceInterval = global.setInterval(() => {
    if (!queue.length) {
      return;
    }

    fn(...queue.pop());
    queue = [];
  }, time);

  return function(...args) {
    queue.push(args);
  };
};

async function rebuild(evt) {
  console.log(evt);
  _newestChange = Date.now();
  if (!_building) {
    _building = true;
    do {
      _currentChange = _newestChange;
      await execute("npm run build");
      console.log("rebuilt");
    } while (_newestChange !== _currentChange);
    _building = false;
  }
}

chokidar
  .watch("./src", { ignored: /(^|[\/\\])\../ })
  .on("all", debounce(rebuild));

liveServer.start({ root: "./dist", port: 8888 });
