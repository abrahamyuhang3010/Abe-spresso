const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
(async () => {
 for (const name of fs.readdirSync(__dirname).filter(x=>x.endsWith('.svg'))) {
  const density = name==='logo-design-board.svg' ? 72 : 144;
  await sharp(path.join(__dirname,name),{density}).png().toFile(path.join(__dirname,name.replace('.svg','.png')));
 }
 for (const size of [16,32,48,64]) await sharp(path.join(__dirname,'favicon-proposal.svg')).resize(size,size).png().toFile(path.join(__dirname,`favicon-${size}.png`));
 console.log('Rendered all vectors to PNG.');
})().catch(e=>{console.error(e);process.exit(1)});
