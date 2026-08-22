// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title SpermNFT
 * @notice ERC-721 tokens representing playable sperm with an associated "points" value.
 * Metadata and SVG image are generated on-chain (no external pinning required).
 */
contract SpermNFT is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _nextId;

    // tokenId => points multiplier/value
    mapping(uint256 => uint256) public powerPoints;

    struct Traits {
        uint8 color; // index into palette
        uint8 pattern; // visual variant
        uint8 rarity; // 0=common,1=uncommon,2=rare,3=epic
    }
    mapping(uint256 => Traits) public tokenTraits;

    // simple palette stored on-chain
    string[] private _palette;

    // mint price (in wei)
    uint256 public mintPrice;

    // base URI (unused for on-chain but kept for compatibility)
    string private _baseTokenURI;

    event Minted(address indexed to, uint256 indexed tokenId, uint256 points);
    event PointsUpdated(uint256 indexed tokenId, uint256 points);

    constructor(string memory name_, string memory symbol_, string memory baseURI_, uint256 price_) ERC721(name_, symbol_) {
        _baseTokenURI = baseURI_;
        mintPrice = price_;
        // start IDs at 1
        _nextId.increment();

        // palette
        _palette.push('#00d4ff'); // cyan
        _palette.push('#ff1493'); // pink
        _palette.push('#ffd700'); // gold
        _palette.push('#39ff14'); // lime
        _palette.push('#a78bfa'); // purple
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata u) external onlyOwner {
        _baseTokenURI = u;
    }

    function setMintPrice(uint256 p) external onlyOwner {
        mintPrice = p;
    }

    /**
     * @notice Public paid mint. Random traits and points assigned on-chain.
     */
    function mint(address to) external payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        uint256 id = _nextId.current();
        _nextId.increment();

        // pseudo-random seed (not secure for high-value mint but sufficient for fun traits)
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, id, blockhash(block.number - 1))));
        uint8 color = uint8(seed % _palette.length);
        uint8 pattern = uint8((seed / 100) % 4);

        // weighted rarity
        uint8 rarity;
        uint256 r = (seed / 1000) % 100;
        if (r < 50) rarity = 0; // common 50%
        else if (r < 80) rarity = 1; // uncommon 30%
        else if (r < 95) rarity = 2; // rare 15%
        else rarity = 3; // epic 5%

        uint256 pts;
        if (rarity == 0) pts = 10;
        else if (rarity == 1) pts = 25;
        else if (rarity == 2) pts = 75;
        else pts = 200;

        _safeMint(to, id);
        powerPoints[id] = pts;
        tokenTraits[id] = Traits({ color: color, pattern: pattern, rarity: rarity });
        emit Minted(to, id, pts);
        return id;
    }

    /**
     * @notice Owner airdrop mint without payment.
     */
    function ownerMint(address to, uint256 points) external onlyOwner returns (uint256) {
        uint256 id = _nextId.current();
        _nextId.increment();
        _safeMint(to, id);
        powerPoints[id] = points;
        tokenTraits[id] = Traits({ color: 0, pattern: 0, rarity: 0 });
        emit Minted(to, id, points);
        return id;
    }

    function updatePoints(uint256 tokenId, uint256 points) external onlyOwner {
        require(_exists(tokenId), "Nonexistent token");
        powerPoints[tokenId] = points;
        emit PointsUpdated(tokenId, points);
    }

    /**
     * @notice Withdraw funds collected from mints
     */
    function withdraw(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No balance");
        to.transfer(bal);
    }

    /**
     * @notice View helper
     */
    function pointsOf(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Nonexistent token");
        return powerPoints[tokenId];
    }

    // --- On-chain metadata & image generation (no external pinning) ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Nonexistent token");
        Traits memory t = tokenTraits[tokenId];
        string memory name = string(abi.encodePacked("Sperm #", tokenId.toString()));
        string memory description = "Sperm Wars - on-chain NFT sperm. Holders get gameplay power points.";

        string memory attrs = string(abi.encodePacked('[',
            '{"trait_type":"Rarity","value":"', rarityLabel(t.rarity), '"},',
            '{"trait_type":"Color","value":"', _palette[t.color], '"},',
            '{"trait_type":"Pattern","value":"', uint256(t.pattern).toString(), '"},',
            '{"trait_type":"PowerPoints","value":', uint256(powerPoints[tokenId]).toString(), '}',
        ']'));

        string memory svg = renderSVG(t, tokenId);
        string memory image = string(abi.encodePacked('data:image/svg+xml;base64,', Base64.encode(bytes(svg))));

        string memory json = Base64.encode(bytes(string(abi.encodePacked('{"name":"', name,
            '","description":"', description, '","image":"', image, '","attributes":', attrs, '}'))));

        return string(abi.encodePacked('data:application/json;base64,', json));
    }

    function rarityLabel(uint8 r) internal pure returns (string memory) {
        if (r == 0) return "Common";
        if (r == 1) return "Uncommon";
        if (r == 2) return "Rare";
        return "Epic";
    }

    function renderSVG(Traits memory t, uint256 tokenId) internal view returns (string memory) {
        string memory color = _palette[t.color];
        string memory body = string(abi.encodePacked('<circle cx="80" cy="60" r="28" fill="', color, '" />'));
        string memory tail = '<path d="M110 70 C 140 55, 160 40, 200 60" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>';
        string memory eye = '<circle cx="90" cy="55" r="4" fill="#000" />';
        string memory text = string(abi.encodePacked('<text x="10" y="150" font-size="12" fill="#ddd">ID #', tokenId.toString(), '</text>'));

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">',
            '<rect width="100%" height="100%" fill="#0b0210"/>',
            body, tail, eye, text,
            '</svg>'
        ));
        return svg;
    }
}
