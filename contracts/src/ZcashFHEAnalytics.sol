// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZcashFHEAnalytics is Ownable, ReentrancyGuard {
    euint64 private _totalSwapVolume;
    euint64 private _totalSwapFees;
    euint64 private _totalTransactionVolume;
    euint64 private _totalTransactionFees;

    uint256 private _swapCount;
    uint256 private _transactionCount;
    uint256 private _lastSwapTimestamp;
    uint256 private _lastTransactionTimestamp;

    mapping(bytes32 => uint256) private _swapsByDestination;
    mapping(bytes32 => uint256) private _swapsByPlatform;
    mapping(bytes32 => uint256) private _transactionsByType;
    mapping(bytes32 => uint256) private _transactionsByPool;
    mapping(bytes32 => uint256) private _transactionsByPlatform;

    mapping(address => bool) private _authorizedIngestors;

    bytes32[] private _destinationAssets;
    bytes32[] private _platforms;
    bytes32[] private _transactionTypes;
    bytes32[] private _poolTypes;

    mapping(bytes32 => bool) private _destinationExists;
    mapping(bytes32 => bool) private _platformExists;
    mapping(bytes32 => bool) private _transactionTypeExists;
    mapping(bytes32 => bool) private _poolTypeExists;

    event SwapIngested(uint256 indexed swapId, bytes32 indexed destinationAsset, bytes32 indexed platform, uint256 timestamp);
    event TransactionIngested(uint256 indexed transactionId, bytes32 indexed transactionType, bytes32 indexed poolType, bytes32 platform, uint256 timestamp);
    event IngestorAuthorized(address indexed ingestor);
    event IngestorRevoked(address indexed ingestor);

    error UnauthorizedIngestor();
    error InvalidDestinationAsset();
    error InvalidPlatform();
    error InvalidTransactionType();

    modifier onlyAuthorizedIngestor() {
        if (!_authorizedIngestors[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedIngestor();
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        _authorizedIngestors[msg.sender] = true;
    }

    function ingestSwap(
        InEuint64 calldata encryptedAmountIn,
        InEuint64 calldata encryptedFee,
        bytes32 destinationAsset,
        bytes32 platform
    ) external onlyAuthorizedIngestor nonReentrant {
        if (destinationAsset == bytes32(0)) revert InvalidDestinationAsset();
        if (platform == bytes32(0)) revert InvalidPlatform();

        euint64 amountIn = FHE.asEuint64(encryptedAmountIn);
        euint64 fee = FHE.asEuint64(encryptedFee);

        _totalSwapVolume = FHE.add(_totalSwapVolume, amountIn);
        _totalSwapFees = FHE.add(_totalSwapFees, fee);

        unchecked {
            _swapCount++;
            _swapsByDestination[destinationAsset]++;
            _swapsByPlatform[platform]++;
        }

        if (!_destinationExists[destinationAsset]) {
            _destinationAssets.push(destinationAsset);
            _destinationExists[destinationAsset] = true;
        }

        if (!_platformExists[platform]) {
            _platforms.push(platform);
            _platformExists[platform] = true;
        }

        _lastSwapTimestamp = block.timestamp;
        emit SwapIngested(_swapCount, destinationAsset, platform, block.timestamp);
    }

    function ingestTransaction(
        InEuint64 calldata encryptedAmount,
        InEuint64 calldata encryptedFee,
        bytes32 transactionType,
        bytes32 poolType,
        bytes32 platform
    ) external onlyAuthorizedIngestor nonReentrant {
        if (transactionType == bytes32(0)) revert InvalidTransactionType();
        if (platform == bytes32(0)) revert InvalidPlatform();

        euint64 amount = FHE.asEuint64(encryptedAmount);
        euint64 fee = FHE.asEuint64(encryptedFee);

        _totalTransactionVolume = FHE.add(_totalTransactionVolume, amount);
        _totalTransactionFees = FHE.add(_totalTransactionFees, fee);

        unchecked {
            _transactionCount++;
            _transactionsByType[transactionType]++;
            _transactionsByPlatform[platform]++;
            if (poolType != bytes32(0)) {
                _transactionsByPool[poolType]++;
            }
        }

        if (!_transactionTypeExists[transactionType]) {
            _transactionTypes.push(transactionType);
            _transactionTypeExists[transactionType] = true;
        }

        if (poolType != bytes32(0) && !_poolTypeExists[poolType]) {
            _poolTypes.push(poolType);
            _poolTypeExists[poolType] = true;
        }

        if (!_platformExists[platform]) {
            _platforms.push(platform);
            _platformExists[platform] = true;
        }

        _lastTransactionTimestamp = block.timestamp;
        emit TransactionIngested(_transactionCount, transactionType, poolType, platform, block.timestamp);
    }

    function getSwapVolumeHandle() external view returns (uint256) {
        return euint64.unwrap(_totalSwapVolume);
    }

    function getSwapFeesHandle() external view returns (uint256) {
        return euint64.unwrap(_totalSwapFees);
    }

    function getTransactionVolumeHandle() external view returns (uint256) {
        return euint64.unwrap(_totalTransactionVolume);
    }

    function getTransactionFeesHandle() external view returns (uint256) {
        return euint64.unwrap(_totalTransactionFees);
    }

    function getSwapCount() external view returns (uint256) {
        return _swapCount;
    }

    function getTransactionCount() external view returns (uint256) {
        return _transactionCount;
    }

    function getSwapsByDestination(bytes32 destination) external view returns (uint256) {
        return _swapsByDestination[destination];
    }

    function getSwapsByPlatform(bytes32 platform) external view returns (uint256) {
        return _swapsByPlatform[platform];
    }

    function getTransactionsByType(bytes32 txType) external view returns (uint256) {
        return _transactionsByType[txType];
    }

    function getTransactionsByPool(bytes32 pool) external view returns (uint256) {
        return _transactionsByPool[pool];
    }

    function getTransactionsByPlatform(bytes32 platform) external view returns (uint256) {
        return _transactionsByPlatform[platform];
    }

    function getDestinationAssets() external view returns (bytes32[] memory) {
        return _destinationAssets;
    }

    function getPlatforms() external view returns (bytes32[] memory) {
        return _platforms;
    }

    function getTransactionTypes() external view returns (bytes32[] memory) {
        return _transactionTypes;
    }

    function getPoolTypes() external view returns (bytes32[] memory) {
        return _poolTypes;
    }

    function getLastSwapTimestamp() external view returns (uint256) {
        return _lastSwapTimestamp;
    }

    function getLastTransactionTimestamp() external view returns (uint256) {
        return _lastTransactionTimestamp;
    }

    function authorizeIngestor(address ingestor) external onlyOwner {
        _authorizedIngestors[ingestor] = true;
        emit IngestorAuthorized(ingestor);
    }

    function revokeIngestor(address ingestor) external onlyOwner {
        _authorizedIngestors[ingestor] = false;
        emit IngestorRevoked(ingestor);
    }

    function isAuthorizedIngestor(address ingestor) external view returns (bool) {
        return _authorizedIngestors[ingestor];
    }
}
