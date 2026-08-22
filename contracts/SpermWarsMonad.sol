// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SpermWarsMonad
 * @notice Minimal game contract for Sperm Wars on Monad testnet
 * @dev Records game results and distributes testnet MON rewards to winners
 *      Real-time gameplay stays off-chain. Only meaningful events touch the blockchain.
 */
contract SpermWarsMonad {
    // ============ Events ============
    event GameCompleted(
        bytes32 indexed gameId,
        address winner,
        uint256 playersCount,
        uint256 reward,
        uint256 timestamp
    );

    event PlayerRegistered(
        address indexed player,
        string username,
        uint256 timestamp
    );

    event RewardClaimed(
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );

    event MatchStaked(
        bytes32 indexed gameId,
        address indexed player,
        uint256 amount,
        uint256 totalPot,
        uint256 timestamp
    );

    event MatchSettled(
        bytes32 indexed gameId,
        address indexed winner,
        uint256 totalPot,
        bool tied,
        uint256 timestamp
    );

    event MatchPayout(
        bytes32 indexed gameId,
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );

    // ============ Structs ============
    struct GameResult {
        bytes32 gameId;
        address winner;
        uint8 playersCount;
        uint256 reward;
        uint256 timestamp;
    }

    struct PlayerStats {
        string username;
        uint256 totalWins;
        uint256 totalGames;
        uint256 totalMonEarned;
        uint256 bestStreak;
        uint256 currentStreak;
        bool registered;
    }

    // ============ State ============
    address public owner;
    uint256 public entryFee; // in wei (0 for free entry)
    uint256 public baseReward; // base reward for winning

    mapping(address => PlayerStats) public players;
    mapping(bytes32 => GameResult) public games;
    mapping(bytes32 => uint256) public matchPot;
    mapping(bytes32 => mapping(address => uint256)) public matchStake;
    mapping(bytes32 => address[]) public matchParticipants;
    mapping(bytes32 => bool) public matchSettled;

    bytes32[] public gameIds;
    address[] public registeredPlayers;

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ============ Constructor ============
    constructor(uint256 _entryFee, uint256 _baseReward) {
        owner = msg.sender;
        entryFee = _entryFee;
        baseReward = _baseReward;
    }

    // ============ Functions ============

    /**
     * @notice Register as a player
     * @param _username Display name
     */
    function registerPlayer(string calldata _username) external {
        require(!players[msg.sender].registered, "Already registered");
        require(bytes(_username).length > 0 && bytes(_username).length <= 32, "Invalid username");

        players[msg.sender] = PlayerStats({
            username: _username,
            totalWins: 0,
            totalGames: 0,
            totalMonEarned: 0,
            bestStreak: 0,
            currentStreak: 0,
            registered: true
        });

        registeredPlayers.push(msg.sender);

        emit PlayerRegistered(msg.sender, _username, block.timestamp);
    }

    /**
     * @notice Record a completed game (called by owner/server)
     * @param _gameId Unique game identifier
     * @param _winner Winner's address
     * @param _playersCount Number of players in the game
     */
    function recordGameResult(
        bytes32 _gameId,
        address _winner,
        uint8 _playersCount
    ) external onlyOwner {
        require(games[_gameId].timestamp == 0, "Game already recorded");
        require(_playersCount > 0 && _playersCount <= 8, "Invalid player count");

        uint256 reward = baseReward + (uint256(_playersCount) * baseReward / 4);

        games[_gameId] = GameResult({
            gameId: _gameId,
            winner: _winner,
            playersCount: _playersCount,
            reward: reward,
            timestamp: block.timestamp
        });

        gameIds.push(_gameId);

        // Update winner stats
        if (players[_winner].registered) {
            players[_winner].totalWins++;
            players[_winner].totalGames++;
            players[_winner].totalMonEarned += reward;
            players[_winner].currentStreak++;
            if (players[_winner].currentStreak > players[_winner].bestStreak) {
                players[_winner].bestStreak = players[_winner].currentStreak;
            }
        }

        emit GameCompleted(_gameId, _winner, _playersCount, reward, block.timestamp);
    }

    /**
     * @notice Claim reward for a game win
     * @param _gameId The game to claim reward from
     */
    function claimReward(bytes32 _gameId) external {
        GameResult storage game = games[_gameId];
        require(game.winner == msg.sender, "Not the winner");
        require(game.reward > 0, "No reward");
        require(address(this).balance >= game.reward, "Insufficient contract balance");

        uint256 reward = game.reward;
        game.reward = 0; // Prevent re-claim

        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, reward, block.timestamp);
    }

    /**
     * @notice Add MON to a multiplayer pot for a specific match.
     */
    function stakeMatch(bytes32 _gameId) external payable {
        require(msg.value > 0, "Stake must be > 0");
        require(!matchSettled[_gameId], "Match settled");

        if (matchStake[_gameId][msg.sender] == 0) {
            matchParticipants[_gameId].push(msg.sender);
        }

        matchStake[_gameId][msg.sender] += msg.value;
        matchPot[_gameId] += msg.value;

        emit MatchStaked(_gameId, msg.sender, msg.value, matchPot[_gameId], block.timestamp);
    }

    /**
     * @notice Settle the pot: winner claims the whole pot, or all participants split it equally in a draw.
     */
    function settleMatchPot(bytes32 _gameId, address[] calldata _participants, address _winner) external onlyOwner {
        require(!matchSettled[_gameId], "Already settled");
        uint256 pot = matchPot[_gameId];
        require(pot > 0, "No pot");

        matchSettled[_gameId] = true;

        if (_winner == address(0) || _participants.length > 0 && _participants.length == 1 && _participants[0] == address(0)) {
            uint256 totalParticipants = matchParticipants[_gameId].length;
            require(totalParticipants > 0, "No participants");

            uint256 share = pot / totalParticipants;
            uint256 remainder = pot % totalParticipants;

            for (uint256 i = 0; i < totalParticipants; i++) {
                address player = matchParticipants[_gameId][i];
                uint256 amount = share + (i == totalParticipants - 1 ? remainder : 0);
                if (amount > 0) {
                    (bool success, ) = player.call{value: amount}("");
                    require(success, "Tie payout failed");
                    emit MatchPayout(_gameId, player, amount, block.timestamp);
                }
            }

            emit MatchSettled(_gameId, address(0), pot, true, block.timestamp);
            return;
        }

        if (_winner != address(0)) {
            (bool success, ) = _winner.call{value: pot}("");
            require(success, "Winner payout failed");
            emit MatchSettled(_gameId, _winner, pot, false, block.timestamp);
            return;
        }

        revert("Invalid settlement");
    }

    /**
     * @notice Get total number of games played
     */
    function getTotalGames() external view returns (uint256) {
        return gameIds.length;
    }

    function getMatchPot(bytes32 _gameId) external view returns (uint256) {
        return matchPot[_gameId];
    }

    function getMatchStake(bytes32 _gameId, address _player) external view returns (uint256) {
        return matchStake[_gameId][_player];
    }

    function getMatchParticipants(bytes32 _gameId) external view returns (address[] memory) {
        return matchParticipants[_gameId];
    }

    /**
     * @notice Get player stats
     */
    function getPlayerStats(address _player) external view returns (
        string memory username,
        uint256 totalWins,
        uint256 totalGames,
        uint256 totalMonEarned,
        uint256 bestStreak,
        bool registered
    ) {
        PlayerStats storage p = players[_player];
        return (p.username, p.totalWins, p.totalGames, p.totalMonEarned, p.bestStreak, p.registered);
    }

    /**
     * @notice Owner can fund the contract for rewards
     */
    function fundRewards() external payable onlyOwner {}

    /**
     * @notice Update base reward
     */
    function setBaseReward(uint256 _baseReward) external onlyOwner {
        baseReward = _baseReward;
    }

    /**
     * @notice Update entry fee
     */
    function setEntryFee(uint256 _entryFee) external onlyOwner {
        entryFee = _entryFee;
    }

    // Allow contract to receive MON
    receive() external payable {}
}
