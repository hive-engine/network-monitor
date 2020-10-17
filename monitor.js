const nodeCleanup = require('node-cleanup');
const fs = require('fs-extra');
const SSC = require('sscjs');
const config = require('./config');

let { lastSSCBlockParsed } = config; // eslint-disable-line prefer-const
let sscNodes = [];

config.nodes.forEach(node => {
  sscNodes.push(new SSC(node));
  console.log(`connected to Engine node: ${node}`);
});

async function fetchBlocks(blockNumber) {
  const blocks = [];

  try {
    for (let i = 0; i < sscNodes.length; i += 1) {
      const block = await sscNodes[i].getBlockInfo(blockNumber);
      blocks.push(block);
      console.log(`block[${blockNumber}] from ${config.nodes[i]}:`);
      console.log(`hash: ${block.hash}`);
      console.log('\n');
    }
  } catch (error) {
    console.log(error);
  }

  return blocks;
}

const nodeBlocks = fetchBlocks(lastSSCBlockParsed);

// graceful app closing
nodeCleanup((exitCode, signal) => { // eslint-disable-line no-unused-vars
  console.log('start saving conf'); // eslint-disable-line no-console
  const conf = fs.readJSONSync('./config.json');
  conf.lastSSCBlockParsed = lastSSCBlockParsed;
  fs.writeJSONSync('./config.json', conf, { spaces: 4 });
  console.log('done saving conf'); // eslint-disable-line no-console
});
