import Foundation

extension ZcashFHESDK {
    public func encryptValueAsync(
        chainId: UInt64,
        account: String,
        value: UInt64,
        securityZone: UInt32 = 0
    ) async throws -> EncryptedInput {
        return try await Task.detached(priority: .userInitiated) {
            try self.encryptValue(
                chainId: chainId,
                account: account,
                value: value,
                securityZone: securityZone
            )
        }.value
    }

    public func encryptSwapAsync(
        chainId: UInt64,
        account: String,
        amountInZatoshi: UInt64,
        feeZatoshi: UInt64,
        destinationAsset: String,
        platform: String,
        securityZone: UInt32 = 0
    ) async throws -> EncryptedSwapPayload {
        return try await Task.detached(priority: .userInitiated) {
            try self.encryptSwap(
                chainId: chainId,
                account: account,
                amountInZatoshi: amountInZatoshi,
                feeZatoshi: feeZatoshi,
                destinationAsset: destinationAsset,
                platform: platform,
                securityZone: securityZone
            )
        }.value
    }

    public func encryptTransactionAsync(
        chainId: UInt64,
        account: String,
        amountZatoshi: UInt64,
        feeZatoshi: UInt64,
        transactionType: TransactionType,
        poolType: PoolType,
        platform: String,
        securityZone: UInt32 = 0
    ) async throws -> EncryptedTransactionPayload {
        return try await Task.detached(priority: .userInitiated) {
            try self.encryptTransaction(
                chainId: chainId,
                account: account,
                amountZatoshi: amountZatoshi,
                feeZatoshi: feeZatoshi,
                transactionType: transactionType,
                poolType: poolType,
                platform: platform,
                securityZone: securityZone
            )
        }.value
    }
}
