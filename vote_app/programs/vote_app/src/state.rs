use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]    // used to calculate space of struct
pub struct TreasuryConfig{
    pub authority: Pubkey,
    pub x_mint: Pubkey,     // mint of particular token, tressury is dealing with
    pub treasury_token_account: Pubkey,     // hold tresury token
    pub sol_price: u64,     // treasury token price
    pub token_per_purchase: u64,        // no of token given on a particular price
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub voter_id: Pubkey,
    pub proposal_voted: u8
}