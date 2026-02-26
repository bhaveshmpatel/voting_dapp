import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";

import { expect } from "chai";
import {
  getOrCreateAssociatedTokenAccount,
  getAccount
} from "@solana/spl-token";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

const SEEDS = {
  SOL_VAULT: "sol_vault",
  TREASURY_CONFIG: "treasury_config",
  MINT_AUTHORITY: "mint_authority",
  X_MINT: "x_mint",
  VOTER: "voter",
  WINNER: "winner",
  PROPOSAL_COUNTER: "proposal_counter",
  PROPOSAL: "proposal"
} as const;

const PROPOSAL_ID = 1;

const findPda = (programId: anchor.web3.PublicKey, seeds:(Buffer | Uint8Array)[]): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

const airdropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, sol:number) => {
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
}

const getBlockTime = async (connection: anchor.web3.Connection): Promise<number> => {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);

  if (blockTime === null) {
    throw new Error("Failed to fetch the blocktime");
  }
  return blockTime;
}

const expectAnchorErrorCode = (err: unknown, expectedCode: string) => {
  const anyErr = err as any;
  const actualCode = 
    anyErr?.error?.errorCode?.code ??
    anyErr?.errorCode?.code ??
    anyErr?.code;
  expect(actualCode).to.equal(expectedCode);
}

describe("Testing the voting dapp", () => {
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.voteApp as Program<VoteApp>;

  const adminWallet = (provider.wallet as NodeWallet).payer;

  let proposalCreatorWallet = new anchor.web3.Keypair();
  let voterWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;
  let proposalCounterPda: anchor.web3.PublicKey;
  let proposalPda: anchor.web3.PublicKey;

  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;
  let voterPda: anchor.web3.PublicKey;
  let winnerPda: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let voterTokenAccount: anchor.web3.PublicKey;


  beforeEach(async () => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)]);
    
    winnerPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.WINNER)]);

    proposalPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL), Buffer.from([PROPOSAL_ID])]);
    
    proposalCounterPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL_COUNTER)]);
    
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)]);
    
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)]);
    
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)]);

    voterPda = findPda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.VOTER),
      voterWallet.publicKey.toBuffer()    // to create different pda for different users
    ]);

    console.log("Transfering SOL...");
    await Promise.all([
      airdropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      airdropSol(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    ]);
    
    console.log("Transfered SOL Successfully");

  })

  const createTokenAccounts = async () => {
    console.log("Initialization of token accounts")
    treasuryTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      xMintPda,
      adminWallet.publicKey
    )).address;

    proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      proposalCreatorWallet,
      xMintPda,
      proposalCreatorWallet.publicKey
    )).address;

    voterTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      voterWallet,
      xMintPda,
      voterWallet.publicKey
    )).address;
  }

  describe("1. Initialization", () => {
    it("1.1 Initializes Treasury!", async () => {
      const solPrice = new anchor.BN(1000_000_000);
      const tokenPerPurcase = new anchor.BN(1000_000_000);

      await program.methods.initializeTreasury(solPrice, tokenPerPurcase).accounts({
        authority: adminWallet.publicKey,
      }).rpc()

      const treasuryAccountData = await program.account.treasuryConfig.fetch(treasuryConfigPda);
      expect(treasuryAccountData.solPrice.toNumber()).to.equal(solPrice.toNumber());
      expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurcase.toNumber());
      expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());
      // Verify the mint PDA is stored correctly
      expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());

      await createTokenAccounts()
    });
  })
  

  describe("2. Buys Tokens!", () => {
    it("2.1 Buys tokens for proposal creator", async () => {
      const tokenBalanceBefore = (await getAccount(connection, proposalCreatorTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: proposalCreatorWallet.publicKey,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: proposalCreatorTokenAccount,
        xMint: xMintPda
      }).signers([proposalCreatorWallet]).rpc() 

      const tokenBalanceAfter = (await getAccount(connection, proposalCreatorTokenAccount)).amount;
      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000_000_000))
    });

    it("2.2 Buys tokens for voter", async () => {
      const tokenBalanceBefore = (await getAccount(connection, voterTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer: voterWallet.publicKey,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: voterTokenAccount,
        xMint: xMintPda
      }).signers([voterWallet]).rpc() 

      const tokenBalanceAfter = (await getAccount(connection, voterTokenAccount)).amount;
      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000_000_000))
    });
  })

  describe('3. Voter', () => { 
    it("3.1 Register Voters!", async () => {
      await program.methods.registerVoter().accounts({
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      const voterAccountData = await program.account.voter.fetch(voterPda);
      expect(voterAccountData.voterId.toBase58()).to.equal(voterWallet.publicKey.toBase58())
    });
  })

  describe('4. Proposal Registration', () => { 
    it("4.1 Register Proposal!", async () => {
      const currentBlockTime = await getBlockTime(connection);
      const deadlineTime = new anchor.BN(currentBlockTime + 10);
      const proposalInfo  = "Build a layer 2 solution";
      const stakeAmount = new anchor.BN(1000);


      await program.methods.registerProposal(proposalInfo, deadlineTime, stakeAmount).accounts({
        authority: proposalCreatorWallet.publicKey,
        proposalTokenAccount: proposalCreatorTokenAccount,
        proposalCounterAccount: proposalCounterPda,
        treasuryTokenAccount: treasuryTokenAccount,
        xMint: xMintPda
      }).signers([proposalCreatorWallet]).rpc();

      const proposalAccountData = await program.account.proposal.fetch(proposalPda);
      const proposalCounterAccountData = await program.account.proposalCounter.fetch(proposalCounterPda);
      expect(proposalCounterAccountData.proposalCount).to.equal(2);

      expect(proposalAccountData.authority.toBase58()).to.equal(proposalCreatorWallet.publicKey.toBase58());
      expect(proposalAccountData.deadline.toString()).to.equal(deadlineTime.toString());
      expect(proposalAccountData.numberOfVotes.toString()).to.equal("0");
      expect(proposalAccountData.proposalId.toString()).to.equal("1");
      expect(proposalAccountData.proposalInfo.toString()).to.equal("Build a layer 2 solution");
    });
  })

  describe('5. Casting Vote', () => { 
    it("5.1 Cast Vote!", async () => {
      const stakeAmount = new anchor.BN(1000);

      await program.methods.proposalToVote(PROPOSAL_ID, stakeAmount).accounts({
        authority: voterWallet.publicKey,
        voterTokenAccount: voterTokenAccount,
        treasuryTokenAccount: treasuryTokenAccount,
        xMint: xMintPda
      }).signers([voterWallet]).rpc();
    });
  })

  describe('6. Pick Winner', () => { 
    it("6.1 Should fail to pick winner before deadline passes", async () => {
      try {
        await program.methods.pickWinner(PROPOSAL_ID).accounts({
          authority: adminWallet.publicKey,
        }).signers([adminWallet]).rpc();
      } catch(error) {
        expectAnchorErrorCode(error, "VotingStillActive")
      }
    });

    it("6.2 Should pick winner after dealdline passes", async () => {
      // Wait for voting deadline passes
      console.log("      Waiting for voting deadline...");
      await new Promise((resolve) => setTimeout(resolve, 12000));

      await program.methods.pickWinner(PROPOSAL_ID).accounts({
        authority: adminWallet.publicKey,
      }).signers([adminWallet]).rpc();
      
      const winnerData = await program.account.winner.fetch(winnerPda);
      
      expect(winnerData.winningProposalId).to.equal(PROPOSAL_ID);
      expect(winnerData.winningVotes).to.equal(1);
    });
  })

  describe('7. Close Proposal', () => { 
    it("7.1 Should close proposal one after deadline and recover rent", async () => {
      const accountInfoBefore = await connection.getAccountInfo(proposalPda);
      expect(accountInfoBefore).to.not.be.null;

      await program.methods.closeProposal(PROPOSAL_ID).accounts({
        destination: proposalCreatorWallet.publicKey,
        authority: proposalCreatorWallet.publicKey,
      }).signers([proposalCreatorWallet]).rpc();

      const accountInfoAfter = await connection.getAccountInfo(proposalPda);
      expect(accountInfoAfter).to.be.null;
    });
    
  })
});

