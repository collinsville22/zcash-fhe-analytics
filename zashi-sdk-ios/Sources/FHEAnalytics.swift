import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

struct FHEPublicKeyResponse: Codable {
    let algorithm: String
    let coeffModulus: Int64
    let polyDegree: Int
    let publicKey: PublicKeyData
    let scale: Double

    enum CodingKeys: String, CodingKey {
        case algorithm
        case coeffModulus = "coeff_modulus"
        case polyDegree = "poly_degree"
        case publicKey = "public_key"
        case scale
    }
}

struct PublicKeyData: Codable {
    let a: [Int64]
    let b: [Int64]
}

public struct CKKSPublicKey {
    let polyDegree: Int
    let scale: Double
    let coeffModulus: Int64
    let a: [Int64]
    let b: [Int64]
}

public struct CKKSCiphertext: Codable {
    let c0: [Int64]
    let c1: [Int64]
    let scale: Double
}

class CKKSEncryption {
    private let publicKey: CKKSPublicKey
    private let n: Int
    private let secureRandom: SecureRandomGenerator

    init(publicKey: CKKSPublicKey) {
        self.publicKey = publicKey
        self.n = publicKey.polyDegree
        self.secureRandom = SecureRandomGenerator()
    }

    func encrypt(_ value: Double) -> CKKSCiphertext {
        let scaled = Int64(round(value * publicKey.scale))

        let u = generateTernaryPolynomial(degree: n)
        let e0 = generateSmallErrorPolynomial(degree: n)
        let e1 = generateSmallErrorPolynomial(degree: n)

        let message = Polynomial(coeffs: (0..<n).map { i in i == 0 ? scaled : 0 }, modulus: publicKey.coeffModulus)
        let aPoly = Polynomial(coeffs: publicKey.a, modulus: publicKey.coeffModulus)
        let bPoly = Polynomial(coeffs: publicKey.b, modulus: publicKey.coeffModulus)

        let c0Poly = bPoly * u + e0 + message
        let c1Poly = aPoly * u + e1

        return CKKSCiphertext(c0: c0Poly.toList(), c1: c1Poly.toList(), scale: publicKey.scale)
    }

    private func generateTernaryPolynomial(degree: Int) -> Polynomial {
        let coeffs = (0..<degree).map { _ -> Int64 in
            let r = secureRandom.nextDouble()
            if r < 0.333 {
                return -1
            } else if r < 0.666 {
                return 0
            } else {
                return 1
            }
        }
        return Polynomial(coeffs: coeffs, modulus: publicKey.coeffModulus)
    }

    private func generateSmallErrorPolynomial(degree: Int) -> Polynomial {
        let sigma = 3.2
        let coeffs = (0..<degree).map { _ in
            Int64(round(randomGaussian(mean: 0, stdDev: sigma)))
        }
        return Polynomial(coeffs: coeffs, modulus: publicKey.coeffModulus)
    }

    private func randomGaussian(mean: Double, stdDev: Double) -> Double {
        var u1 = secureRandom.nextDouble()
        while u1 == 0.0 {
            u1 = secureRandom.nextDouble()
        }

        let u2 = secureRandom.nextDouble()
        let z0 = sqrt(-2.0 * log(u1)) * cos(2.0 * .pi * u2)
        return z0 * stdDev + mean
    }
}

private class SecureRandomGenerator {
    init() {}

    func nextDouble() -> Double {
        return Double.random(in: 0..<1)
    }
}

public class FHEAnalyticsSDK {
    private let serverURL: String
    private var ckksEncryption: CKKSEncryption?

    public init(serverURL: String) {
        self.serverURL = serverURL
    }

    public func fetchPublicKey() async throws {
        guard let url = URL(string: "\(serverURL)/keys/fhe_public") else {
            throw URLError(.badURL)
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(FHEPublicKeyResponse.self, from: data)

        let publicKey = CKKSPublicKey(
            polyDegree: response.polyDegree,
            scale: response.scale,
            coeffModulus: response.coeffModulus,
            a: response.publicKey.a,
            b: response.publicKey.b
        )

        self.ckksEncryption = CKKSEncryption(publicKey: publicKey)
    }

    public func submitSwapMetrics(_ metrics: SwapMetrics) async throws {
        guard let encryption = ckksEncryption else {
            throw NSError(domain: "FHE", code: -2, userInfo: [NSLocalizedDescriptionKey: "Public key not loaded"])
        }

        guard let amountIn = Double(metrics.amountZecIn),
              let amountOut = Double(metrics.amountOut),
              let fee = Double(metrics.affiliateFee) else {
            throw NSError(domain: "FHE", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid numeric format"])
        }

        let encryptedAmountIn = encryption.encrypt(amountIn)
        let encryptedAmountOut = encryption.encrypt(amountOut)
        let encryptedFee = encryption.encrypt(fee)

        let payload: [String: Any] = [
            "encrypted_amount_in": encodeCiphertext(encryptedAmountIn),
            "encrypted_amount_out": encodeCiphertext(encryptedAmountOut),
            "encrypted_fee": encodeCiphertext(encryptedFee),
            "destination_asset": metrics.destinationAsset,
            "origin_asset": metrics.originAsset,
            "timestamp": metrics.timestamp,
            "platform": metrics.platform,
            "swap_type": metrics.swapType,
            "deposit_address": metrics.depositAddress,
            "provider": metrics.provider
        ]

        guard let url = URL(string: "\(serverURL)/ingest/swap") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    private func encodeCiphertext(_ ct: CKKSCiphertext) -> [String: Any] {
        return [
            "c0": ct.c0,
            "c1": ct.c1,
            "scale": ct.scale
        ]
    }
}

public struct SwapMetrics {
    public let amountZecIn: String
    public let amountZecInFormatted: String
    public let amountZecInUsd: String
    public let amountOut: String
    public let amountOutFormatted: String
    public let amountOutUsd: String
    public let destinationAsset: String
    public let originAsset: String
    public let affiliateFee: String
    public let affiliateFeeUsd: String
    public let exchangeRate: String
    public let slippageTolerance: String
    public let timestamp: Int64
    public let swapType: String
    public let depositAddress: String
    public let provider: String
    public let platform: String

    public init(
        amountZecIn: String,
        amountZecInFormatted: String,
        amountZecInUsd: String,
        amountOut: String,
        amountOutFormatted: String,
        amountOutUsd: String,
        destinationAsset: String,
        originAsset: String,
        affiliateFee: String,
        affiliateFeeUsd: String,
        exchangeRate: String,
        slippageTolerance: String,
        timestamp: Int64,
        swapType: String,
        depositAddress: String,
        provider: String,
        platform: String
    ) {
        self.amountZecIn = amountZecIn
        self.amountZecInFormatted = amountZecInFormatted
        self.amountZecInUsd = amountZecInUsd
        self.amountOut = amountOut
        self.amountOutFormatted = amountOutFormatted
        self.amountOutUsd = amountOutUsd
        self.destinationAsset = destinationAsset
        self.originAsset = originAsset
        self.affiliateFee = affiliateFee
        self.affiliateFeeUsd = affiliateFeeUsd
        self.exchangeRate = exchangeRate
        self.slippageTolerance = slippageTolerance
        self.timestamp = timestamp
        self.swapType = swapType
        self.depositAddress = depositAddress
        self.provider = provider
        self.platform = platform
    }
}

public struct TransactionMetrics {
    public let amount: String
    public let fee: String
    public let txType: String
    public let poolType: String?
    public let platform: String
    public let timestamp: Int64

    public init(
        amount: String,
        fee: String,
        txType: String,
        poolType: String?,
        platform: String,
        timestamp: Int64
    ) {
        self.amount = amount
        self.fee = fee
        self.txType = txType
        self.poolType = poolType
        self.platform = platform
        self.timestamp = timestamp
    }
}

extension FHEAnalyticsSDK {
    public func submitTransactionMetrics(_ metrics: TransactionMetrics) async throws {
        guard let encryption = ckksEncryption else {
            throw URLError(.unknown)
        }

        guard let amount = Double(metrics.amount),
              let fee = Double(metrics.fee) else {
            throw NSError(domain: "FHE", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid numeric format"])
        }

        let encryptedAmount = encryption.encrypt(amount)
        let encryptedFee = encryption.encrypt(fee)

        var payload: [String: Any] = [
            "encrypted_amount": encodeCiphertext(encryptedAmount),
            "encrypted_fee": encodeCiphertext(encryptedFee),
            "tx_type": metrics.txType,
            "platform": metrics.platform,
            "timestamp": metrics.timestamp
        ]

        if let poolType = metrics.poolType {
            payload["pool_type"] = poolType
        }

        guard let url = URL(string: "\(serverURL)/ingest/transaction") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}
