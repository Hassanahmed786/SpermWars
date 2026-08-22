const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SpermWarsMonad staking", function () {
  it("stakes MON into a match pot and settles it to the winner", async function () {
    const [owner, player1, player2, winner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SpermWarsMonad");
    const contract = await factory.deploy(0, ethers.utils.parseEther("0.1"));
    await contract.deployed();

    const gameId = ethers.utils.id("match-42");
    await contract.connect(player1).stakeMatch(gameId, {
      value: ethers.utils.parseEther("1.5"),
    });
    await contract.connect(player2).stakeMatch(gameId, {
      value: ethers.utils.parseEther("0.5"),
    });

    const potBefore = await contract.getMatchPot(gameId);
    expect(potBefore).to.deep.equal(ethers.utils.parseEther("2"));

    const balanceBefore = await ethers.provider.getBalance(winner.address);
    await contract.connect(owner).settleMatchPot(gameId, [], winner.address);
    const balanceAfter = await ethers.provider.getBalance(winner.address);

    expect(balanceAfter.sub(balanceBefore)).to.deep.equal(ethers.utils.parseEther("2"));
  });
});
