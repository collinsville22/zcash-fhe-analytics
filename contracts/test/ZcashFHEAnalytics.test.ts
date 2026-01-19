import { expect } from "chai";
import { ethers } from "hardhat";
import { ZcashFHEAnalytics } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZcashFHEAnalytics", function () {
  let contract: ZcashFHEAnalytics;
  let owner: SignerWithAddress;
  let ingestor: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  function toBytes32(str: string): string {
    return ethers.encodeBytes32String(str);
  }

  beforeEach(async function () {
    [owner, ingestor, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ZcashFHEAnalytics");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets deployer as owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("authorizes owner as ingestor", async function () {
      expect(await contract.isAuthorizedIngestor(owner.address)).to.be.true;
    });

    it("initializes swap count to zero", async function () {
      expect(await contract.getSwapCount()).to.equal(0);
    });

    it("initializes transaction count to zero", async function () {
      expect(await contract.getTransactionCount()).to.equal(0);
    });

    it("initializes destination assets as empty", async function () {
      const assets = await contract.getDestinationAssets();
      expect(assets.length).to.equal(0);
    });

    it("initializes platforms as empty", async function () {
      const platforms = await contract.getPlatforms();
      expect(platforms.length).to.equal(0);
    });

    it("initializes transaction types as empty", async function () {
      const types = await contract.getTransactionTypes();
      expect(types.length).to.equal(0);
    });

    it("initializes pool types as empty", async function () {
      const pools = await contract.getPoolTypes();
      expect(pools.length).to.equal(0);
    });

    it("initializes last swap timestamp to zero", async function () {
      expect(await contract.getLastSwapTimestamp()).to.equal(0);
    });

    it("initializes last transaction timestamp to zero", async function () {
      expect(await contract.getLastTransactionTimestamp()).to.equal(0);
    });
  });

  describe("Authorization", function () {
    it("allows owner to authorize ingestor", async function () {
      await contract.authorizeIngestor(ingestor.address);
      expect(await contract.isAuthorizedIngestor(ingestor.address)).to.be.true;
    });

    it("emits IngestorAuthorized event", async function () {
      await expect(contract.authorizeIngestor(ingestor.address))
        .to.emit(contract, "IngestorAuthorized")
        .withArgs(ingestor.address);
    });

    it("allows owner to revoke ingestor", async function () {
      await contract.authorizeIngestor(ingestor.address);
      await contract.revokeIngestor(ingestor.address);
      expect(await contract.isAuthorizedIngestor(ingestor.address)).to.be.false;
    });

    it("emits IngestorRevoked event", async function () {
      await contract.authorizeIngestor(ingestor.address);
      await expect(contract.revokeIngestor(ingestor.address))
        .to.emit(contract, "IngestorRevoked")
        .withArgs(ingestor.address);
    });

    it("reverts when non-owner authorizes", async function () {
      await expect(
        contract.connect(unauthorized).authorizeIngestor(ingestor.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("reverts when non-owner revokes", async function () {
      await contract.authorizeIngestor(ingestor.address);
      await expect(
        contract.connect(unauthorized).revokeIngestor(ingestor.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("returns false for unauthorized address", async function () {
      expect(await contract.isAuthorizedIngestor(unauthorized.address)).to.be.false;
    });

    it("allows multiple ingestors", async function () {
      await contract.authorizeIngestor(ingestor.address);
      await contract.authorizeIngestor(unauthorized.address);
      expect(await contract.isAuthorizedIngestor(ingestor.address)).to.be.true;
      expect(await contract.isAuthorizedIngestor(unauthorized.address)).to.be.true;
    });
  });

  describe("Metadata Queries", function () {
    it("returns zero for unknown destination", async function () {
      expect(await contract.getSwapsByDestination(toBytes32("BTC"))).to.equal(0);
    });

    it("returns zero for unknown platform swaps", async function () {
      expect(await contract.getSwapsByPlatform(toBytes32("zashi"))).to.equal(0);
    });

    it("returns zero for unknown transaction type", async function () {
      expect(await contract.getTransactionsByType(toBytes32("send"))).to.equal(0);
    });

    it("returns zero for unknown pool", async function () {
      expect(await contract.getTransactionsByPool(toBytes32("orchard"))).to.equal(0);
    });

    it("returns zero for unknown platform transactions", async function () {
      expect(await contract.getTransactionsByPlatform(toBytes32("zashi"))).to.equal(0);
    });
  });

  describe("Ownership", function () {
    it("allows owner to transfer ownership", async function () {
      await contract.transferOwnership(ingestor.address);
      expect(await contract.owner()).to.equal(ingestor.address);
    });

    it("allows owner to renounce ownership", async function () {
      await contract.renounceOwnership();
      expect(await contract.owner()).to.equal(ethers.ZeroAddress);
    });

    it("reverts transfer from non-owner", async function () {
      await expect(
        contract.connect(unauthorized).transferOwnership(ingestor.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("new owner can authorize ingestors", async function () {
      await contract.transferOwnership(ingestor.address);
      await contract.connect(ingestor).authorizeIngestor(unauthorized.address);
      expect(await contract.isAuthorizedIngestor(unauthorized.address)).to.be.true;
    });

    it("previous owner cannot authorize after transfer", async function () {
      await contract.transferOwnership(ingestor.address);
      await expect(
        contract.authorizeIngestor(unauthorized.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });
});
