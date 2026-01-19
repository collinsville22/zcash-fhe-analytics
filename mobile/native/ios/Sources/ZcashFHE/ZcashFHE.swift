import Foundation
import ZcashFHECore

public final class ZcashFHESDK {
    public static let shared = ZcashFHESDK()

    private var chainConfigs: [UInt64: ChainConfiguration] = [:]

    private init() {}

    public struct ChainConfiguration {
        public let chainId: UInt64
        public let cofheUrl: String
        public let verifierUrl: String
        public let thresholdNetworkUrl: String

        public init(
            chainId: UInt64,
            cofheUrl: String,
            verifierUrl: String,
            thresholdNetworkUrl: String
        ) {
            self.chainId = chainId
            self.cofheUrl = cofheUrl
            self.verifierUrl = verifierUrl
            self.thresholdNetworkUrl = thresholdNetworkUrl
        }
    }

    public func configure(chain: ChainConfiguration) {
        chainConfigs[chain.chainId] = chain
    }

    public func initialize(chainId: UInt64) async throws {
        guard let config = chainConfigs[chainId] else {
            throw ZcashFHEError.notConfigured
        }

        let keys = try await fetchNetworkKeys(config: config)
        try loadKeysFromHex(
            chainId: chainId,
            publicKeyHex: keys.publicKey,
            crsHex: keys.crs
        )
    }

    public func isInitialized(chainId: UInt64) -> Bool {
        return ZcashFHECore.isInitialized(chainId: chainId)
    }

    public func encryptValue(
        chainId: UInt64,
        account: String,
        value: UInt64,
        securityZone: UInt32 = 0
    ) throws -> EncryptedInput {
        let result = try ZcashFHECore.encryptValue(
            chainId: chainId,
            account: account,
            value: value,
            securityZone: securityZone
        )
        return EncryptedInput(from: result)
    }

    public func encryptSwap(
        chainId: UInt64,
        account: String,
        amountInZatoshi: UInt64,
        feeZatoshi: UInt64,
        destinationAsset: String,
        platform: String,
        securityZone: UInt32 = 0
    ) throws -> EncryptedSwapPayload {
        let result = try ZcashFHECore.encryptSwap(
            chainId: chainId,
            account: account,
            amountInZatoshi: amountInZatoshi,
            feeZatoshi: feeZatoshi,
            destinationAsset: destinationAsset,
            platform: platform,
            securityZone: securityZone
        )
        return EncryptedSwapPayload(from: result)
    }

    public func encryptTransaction(
        chainId: UInt64,
        account: String,
        amountZatoshi: UInt64,
        feeZatoshi: UInt64,
        transactionType: TransactionType,
        poolType: PoolType,
        platform: String,
        securityZone: UInt32 = 0
    ) throws -> EncryptedTransactionPayload {
        let result = try ZcashFHECore.encryptTransaction(
            chainId: chainId,
            account: account,
            amountZatoshi: amountZatoshi,
            feeZatoshi: feeZatoshi,
            transactionType: transactionType.rawValue,
            poolType: poolType.rawValue,
            platform: platform,
            securityZone: securityZone
        )
        return EncryptedTransactionPayload(from: result)
    }

    public static func zecToZatoshi(_ zec: Double) -> UInt64 {
        return ZcashFHECore.zecToZatoshi(zec: zec)
    }

    public static func zatoshiToZec(_ zatoshi: UInt64) -> Double {
        return ZcashFHECore.zatoshiToZec(zatoshi: zatoshi)
    }

    private struct NetworkKeys {
        let publicKey: String
        let crs: String
    }

    private func fetchNetworkKeys(config: ChainConfiguration) async throws -> NetworkKeys {
        let url = URL(string: "\(config.cofheUrl)/v1/keys")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw ZcashFHEError.networkError
        }

        let json = try JSONDecoder().decode(KeysResponse.self, from: data)
        return NetworkKeys(publicKey: json.publicKey, crs: json.crs)
    }
}

private struct KeysResponse: Decodable {
    let publicKey: String
    let crs: String

    enum CodingKeys: String, CodingKey {
        case publicKey = "public_key"
        case crs
    }
}
