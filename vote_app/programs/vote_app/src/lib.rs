use anchor_lang::prelude::*;
mod state;
mod contexts;   // declaring
use contexts::*;    // importing

declare_id!("35rA3njkouavTGNNSNrS16Pyppz4AYQaueseqwmsoqJv");

#[program]
pub mod vote_app {
    use super::*;

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        Ok(())
    }
}


