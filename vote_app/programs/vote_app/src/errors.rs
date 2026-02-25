use anchor_lang::prelude::*;

#[error_code]
pub enum VoteError {
    #[msg("Invalid deadline passed")]
    InvalidDeadline,

    #[msg("Proposal counter is already initilaized")]
    ProposalCounterAlreadyInitilaized,

    #[msg("Proposal Counter Overflow")]
    ProposalCounterOverflow,

    #[msg("Proposal Ended")]
    ProposalEnded,

    #[msg("Proposal Votes Overflow")]
    ProposalVotesOverflow,
}
