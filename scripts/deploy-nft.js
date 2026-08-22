require('dotenv').config();
const hre = require('hardhat');

async function main() {
  await hre.run('compile');
  const name = process.env.NFT_NAME || 'SpermWarsNFT';
  const symbol = process.env.NFT_SYMBOL || 'SPERM';
  const baseURI = process.env.NFT_BASE_URI || '';
  const price = process.env.NFT_MINT_PRICE || '0';

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying NFT with account:', deployer.address);

  const Factory = await hre.ethers.getContractFactory('SpermNFT');
  const nft = await Factory.deploy(name, symbol, baseURI, price);
  await nft.deployed();
  console.log('SpermNFT deployed to:', nft.address);
  console.log('Add this to your .env:');
  console.log(`NEXT_PUBLIC_NFT_ADDRESS=${nft.address}`);
  console.log(`NEXT_PUBLIC_NFT_MINT_PRICE=${price}`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
