const nodeCleanup = require('node-cleanup');
const fs = require('fs-extra');
const SSC = require('sscjs');
const config = require('./config');
const nodemailer = require("nodemailer");

let { lastSSCBlockParsed } = config; // eslint-disable-line prefer-const
let sscNodes = [];

function initNodes() {
  sscNodes = [];
  config.nodes.forEach(node => {
    sscNodes.push(new SSC(node));
    console.log(`using Engine node: ${node}`);
  });
}

function allBlocksReceived(blocks) {
  for (let k = 0; k < blocks.length; k += 1) {
    if (!blocks[k]) {
      return false;
    }
  }
  return true;
}

async function process(blockNumber) {
  const blocks = [];
  let newBlockNumber = blockNumber;

  // fetch blocks from API
  for (let i = 0; i < sscNodes.length; i += 1) {
    try {
      const block = await sscNodes[i].getBlockInfo(blockNumber);
      blocks.push(block);
    } catch (error) {
      console.log(`error fetching block ${blockNumber} from ${config.nodes[i]}`);
      console.log(error);
      initNodes();
      setTimeout(() => process(blockNumber), config.pollingTime);
      return;
    }
  }

  // do block comparions
  if (allBlocksReceived(blocks)) {
    let checksPassed = true;
    for (let i = 0; i < blocks.length; i += 1) {
      for (let j = 0; j < blocks.length; j += 1) {
        if (JSON.stringify(blocks[i]) !== JSON.stringify(blocks[j])) {
          console.log(`ERROR: block ${blockNumber} is different on ${config.nodes[i]} vs ${config.nodes[j]}`);
          // TODO: figure out how to send e-mail alert here
        }
      }
    }
    if (checksPassed) {
      console.log(`processed block ${blockNumber}`);
    }
    lastSSCBlockParsed = blockNumber;
    newBlockNumber += 1;
  }
  setTimeout(() => process(newBlockNumber), config.pollingTime);
}

initNodes();
process(lastSSCBlockParsed);

// graceful app closing
nodeCleanup((exitCode, signal) => { // eslint-disable-line no-unused-vars
  console.log('start saving conf'); // eslint-disable-line no-console
  const conf = fs.readJSONSync('./config.json');
  conf.lastSSCBlockParsed = lastSSCBlockParsed + 1;
  fs.writeJSONSync('./config.json', conf, { spaces: 4 });
  console.log('done saving conf'); // eslint-disable-line no-console
});
