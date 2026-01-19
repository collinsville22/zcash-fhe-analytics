package co.electriccoin.zcash.fhe

import com.google.gson.annotations.SerializedName

sealed class FHEResult<out T> {
    data class Success<T>(val data: T) : FHEResult<T>()
    data class Error(val message: String) : FHEResult<Nothing>()

    inline fun <R> map(transform: (T) -> R): FHEResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Error -> this
    }

    inline fun <R> flatMap(transform: (T) -> FHEResult<R>): FHEResult<R> = when (this) {
        is Success -> transform(data)
        is Error -> this
    }

    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Error -> null
    }

    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Error -> throw FHEException.EncryptionFailed(message)
    }

    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error
}

data class EncryptedInput(
    @SerializedName("ct_hash") val ctHash: String,
    @SerializedName("security_zone") val securityZone: Int,
    val utype: Int,
    val signature: String,
    @SerializedName("proof_data") val proofData: ByteArray
) {
    fun toContractInput(): Map<String, Any> = mapOf(
        "ct_hash" to ctHash,
        "security_zone" to securityZone,
        "utype" to utype,
        "signature" to signature,
        "proof" to proofData.toHexString()
    )

    fun isValid(): Boolean {
        return ctHash.isNotBlank() &&
                ctHash.startsWith("0x") &&
                ctHash.length == 66 &&
                proofData.isNotEmpty() &&
                utype in 2..6
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as EncryptedInput
        return ctHash == other.ctHash &&
                securityZone == other.securityZone &&
                utype == other.utype &&
                signature == other.signature &&
                proofData.contentEquals(other.proofData)
    }

    override fun hashCode(): Int {
        var result = ctHash.hashCode()
        result = 31 * result + securityZone
        result = 31 * result + utype
        result = 31 * result + signature.hashCode()
        result = 31 * result + proofData.contentHashCode()
        return result
    }

    companion object {
        const val UTYPE_U8 = 2
        const val UTYPE_U16 = 3
        const val UTYPE_U32 = 4
        const val UTYPE_U64 = 5
        const val UTYPE_U128 = 6
    }
}

data class EncryptedSwapPayload(
    @SerializedName("encrypted_amount_in") val encryptedAmountIn: EncryptedInput,
    @SerializedName("encrypted_fee") val encryptedFee: EncryptedInput,
    @SerializedName("destination_asset") val destinationAsset: String,
    val platform: String,
    val timestamp: Long = System.currentTimeMillis()
) {
    fun toContractInput(): Map<String, Any> = mapOf(
        "encrypted_amount_in" to encryptedAmountIn.toContractInput(),
        "encrypted_fee" to encryptedFee.toContractInput(),
        "destination_asset" to destinationAsset,
        "platform" to platform,
        "timestamp" to timestamp
    )

    fun isValid(): Boolean {
        return encryptedAmountIn.isValid() &&
                encryptedFee.isValid() &&
                destinationAsset.isNotBlank() &&
                destinationAsset.length <= 32 &&
                platform.isNotBlank() &&
                platform.length <= 32
    }
}

data class EncryptedTransactionPayload(
    @SerializedName("encrypted_amount") val encryptedAmount: EncryptedInput,
    @SerializedName("encrypted_fee") val encryptedFee: EncryptedInput,
    @SerializedName("transaction_type") val transactionType: String,
    @SerializedName("pool_type") val poolType: String,
    val platform: String,
    val timestamp: Long = System.currentTimeMillis()
) {
    fun toContractInput(): Map<String, Any> = mapOf(
        "encrypted_amount" to encryptedAmount.toContractInput(),
        "encrypted_fee" to encryptedFee.toContractInput(),
        "transaction_type" to transactionType,
        "pool_type" to poolType,
        "platform" to platform,
        "timestamp" to timestamp
    )

    fun isValid(): Boolean {
        return encryptedAmount.isValid() &&
                encryptedFee.isValid() &&
                transactionType in TransactionType.values().map { it.value } &&
                poolType in PoolType.values().map { it.value } &&
                platform.isNotBlank() &&
                platform.length <= 32
    }
}

enum class TransactionType(val value: String) {
    SEND("send"),
    RECEIVE("receive"),
    SHIELD("shield"),
    DESHIELD("deshield");

    companion object {
        fun fromValue(value: String): TransactionType? =
            values().find { it.value == value }
    }
}

enum class PoolType(val value: String) {
    TRANSPARENT("transparent"),
    SAPLING("sapling"),
    ORCHARD("orchard");

    companion object {
        fun fromValue(value: String): PoolType? =
            values().find { it.value == value }
    }
}

internal fun ByteArray.toHexString(): String = joinToString("") { "%02x".format(it) }

internal fun String.hexToByteArray(): ByteArray {
    val hex = if (startsWith("0x")) substring(2) else this
    check(hex.length % 2 == 0) { "Invalid hex string length" }
    return ByteArray(hex.length / 2) { i ->
        hex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
}
