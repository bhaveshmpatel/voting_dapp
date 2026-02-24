use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub authority:Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TreasuryConfig::INIT_SPACE,
        seeds = [b"treasury_config"],   // here static variable are seeded in seeds because we want to generate only one pda of treasury_config, we don't want to generate multiple pda for multiple users
        bump
    )]
    pub treasury_config_account:Account<'info, TreasuryConfig>,     //store tresury info

    #[account(
        init,
        payer=authority,
        mint::authority = mint_authority,
        mint::decimals = 6,
        seeds = [b"x_mint"],    // same as treasury_config
        bump
    )]
    pub x_mint:Account<'info, Mint>,    // store xMint token info

    #[account(
        init,
        payer=authority,
        associated_token::mint = x_mint,    // this account will hold this specific token only
        associated_token::authority = authority
    )]
    pub treasury_token_account:Account<'info, TokenAccount>,    //hold xMint token

    /// CHECK:This is to receive SOL tokens
    #[account(mut, seeds=[b"sol_vault"],bump)]
    pub sol_vault:AccountInfo<'info>,

    /// CHECK:This is going to be the minit authority of x_mint tokens
    #[account(mut, seeds=[b"mint_authority"],bump)]
    pub mint_authority:AccountInfo<'info>,

    pub token_program:Program<'info, Token>,

    pub associated_token_program:Program<'info, AssociatedToken>,

    pub system_program:Program<'info, System>
}
