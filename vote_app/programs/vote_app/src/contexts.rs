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

    /// CHECK:This is going to be the mint authority of x_mint tokens
    #[account(mut, seeds=[b"mint_authority"],bump)]
    pub mint_authority:AccountInfo<'info>,

    pub token_program:Program<'info, Token>,

    pub associated_token_program:Program<'info, AssociatedToken>,

    pub system_program:Program<'info, System>
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        seeds = [b"treasury_config"],
        bump,
        constraint = treasury_config_account.x_mint == x_mint.key()     // to make sure that the specific x_mint token is been purchased & its buyer responsibility to transfer the correct x_mint
    )]
    pub treasury_config_account:Account<'info, TreasuryConfig>,     // used to get bump of sol_vault which was already computed and stored here

    /// CHECK:This is to receive SOL tokens
    #[account(mut, seeds=[b"sol_vault"],bump = treasury_config_account.bump)]
    pub sol_vault:AccountInfo<'info>,

    #[account(mut)]
    pub treasury_token_account:Account<'info, TokenAccount>,    // to transfer the token to buyer token acc

    #[account(mut)]
    pub x_mint:Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),   //buyer acc is only authorized to mutate buyer_token_account
        constraint = buyer_token_account.mint == x_mint.key()   //only able to hold x_mint token
    )]
    pub buyer_token_account:Account<'info, TokenAccount>,

    /// CHECK:This is going to be the mint authority of x_mint tokens
    #[account(mut, seeds=[b"mint_authority"],bump)]
    pub mint_authority:AccountInfo<'info>,

    #[account(mut)]
    pub buyer:Signer<'info>,

    pub token_program:Program<'info, Token>,

    pub system_program:Program<'info, System>
}

#[derive(Accounts)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub authority:Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Voter::INIT_SPACE,
        seeds = [b"voter", authority.key.as_ref()],
        bump
    )]
    pub voter_account:Account<'info, Voter>,

    pub system_program:Program<'info, System>
}