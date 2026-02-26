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

    #[msg("Voting is still active - cannot declare winner yet")]
    VotingStillActive,

    #[msg("No vote cast for this proposal")]
    NoVoteCast,

    #[msg("Unauthorized access")]
    UnauthorizedAccess,

    #[msg("Token Mint Mismatch")]
    TokenMintMismatch,
}
