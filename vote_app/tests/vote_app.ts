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
  X_MINT: "x_mint"
} as const;

const findPda = (programId: anchor.web3.PublicKey, seeds:(Buffer | Uint8Array)[]): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

describe("vote_app", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.voteApp as Program<VoteApp>;

  const adminWallet = (provider.wallet as NodeWallet).payer;
  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;

  beforeEach(() => {
    treasuryConfigPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)]);
    xMintPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)]);
    solVaultPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)]);
    mintAuthorityPda = findPda(program.programId, [anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)]);
  })

  it("Initializes Treasury!", async () => {
    const solPrice = new anchor.BN(1000_000_000);
    const tokenPerPurcase = new anchor.BN(100_000_000);

    console.log("Treasury Config pda", treasuryConfigPda);

    const tx = await program.methods.initializeTreasury(solPrice, tokenPerPurcase).accounts({
      authority: adminWallet.publicKey,
    }).rpc()
    console.log("Your transaction signature", tx);

    const treasuryAccountData = await program.account.treasuryConfig.fetch(treasuryConfigPda);
    expect(treasuryAccountData.solPrice.toNumber()).to.equal(solPrice.toNumber());
    expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurcase.toNumber());
    expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());
    expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());
    
  });
});
