import Foundation
import ZcashFHECore

public enum ZcashFHEError: Error, LocalizedError {
    case notConfigured
    case notInitialized
    case encryptionFailed(String)
    case proofGenerationFailed(String)
    case keyDeserializationFailed(String)
    case networkError
    case serializationFailed(String)
    case invalidInput(String)

    public var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Chain not configured. Call configure() first."
        case .notInitialized:
            return "SDK not initialized for this chain. Call initialize() first."
        case .encryptionFailed(let msg):
            return "Encryption failed: \(msg)"
        case .proofGenerationFailed(let msg):
            return "Proof generation failed: \(msg)"
        case .keyDeserializationFailed(let msg):
            return "Key deserialization failed: \(msg)"
        case .networkError:
            return "Network request failed"
        case .serializationFailed(let msg):
            return "Serialization failed: \(msg)"
        case .invalidInput(let msg):
            return "Invalid input: \(msg)"
        }
    }
}

public enum TransactionType: String {
    case send = "send"
    case receive = "receive"
    case shield = "shield"
    case deshield = "deshield"
}

public enum PoolType: String {
    case transparent = "transparent"
    case sapling = "sapling"
    case orchard = "orchard"
}

public struct EncryptedInput: Codable, Sendable {
    public let ctHash: String
    public let securityZone: UInt32
    public let utype: UInt8
    public let signature: String
    public let proofData: Data

    init(from core: ZcashFHECore.EncryptedInput) {
        self.ctHash = core.ctHash
        self.securityZone = core.securityZone
        self.utype = core.utype
        self.signature = core.signature
        self.proofData = Data(core.proofData)
    }

    public func toContractInput() -> [String: Any] {
        return [
            "ct_hash": ctHash,
            "security_zone": securityZone,
            "utype": utype,
            "signature": signature,
            "proof": proofData.hexEncodedString()
        ]
    }
}

public struct EncryptedSwapPayload: Codable, Sendable {
    public let encryptedAmountIn: EncryptedInput
    public let encryptedFee: EncryptedInput
    public let destinationAsset: String
    public let platform: String

    init(from core: ZcashFHECore.EncryptedSwapPayload) {
        self.encryptedAmountIn = EncryptedInput(from: core.encryptedAmountIn)
        self.encryptedFee = EncryptedInput(from: core.encryptedFee)
        self.destinationAsset = core.destinationAsset
        self.platform = core.platform
    }

    public func toContractInput() -> [String: Any] {
        return [
            "encrypted_amount_in": encryptedAmountIn.toContractInput(),
            "encrypted_fee": encryptedFee.toContractInput(),
            "destination_asset": destinationAsset,
            "platform": platform
        ]
    }
}

public struct EncryptedTransactionPayload: Codable, Sendable {
    public let encryptedAmount: EncryptedInput
    public let encryptedFee: EncryptedInput
    public let transactionType: String
    public let poolType: String
    public let platform: String

    init(from core: ZcashFHECore.EncryptedTransactionPayload) {
        self.encryptedAmount = EncryptedInput(from: core.encryptedAmount)
        self.encryptedFee = EncryptedInput(from: core.encryptedFee)
        self.transactionType = core.transactionType
        self.poolType = core.poolType
        self.platform = core.platform
    }

    public func toContractInput() -> [String: Any] {
        return [
            "encrypted_amount": encryptedAmount.toContractInput(),
            "encrypted_fee": encryptedFee.toContractInput(),
            "transaction_type": transactionType,
            "pool_type": poolType,
            "platform": platform
        ]
    }
}

extension Data {
    func hexEncodedString() -> String {
        return map { String(format: "%02hhx", $0) }.joined()
    }
}
