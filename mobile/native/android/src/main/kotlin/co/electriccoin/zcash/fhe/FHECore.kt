package co.electriccoin.zcash.fhe

import android.util.Log

internal object FHECore {
    private const val TAG = "FHECore"

    @Volatile
    private var libraryLoaded = false

    @Volatile
    private var libraryLoadError: String? = null

    init {
        try {
            System.loadLibrary("zcash_fhe_core")
            libraryLoaded = true
        } catch (e: UnsatisfiedLinkError) {
            libraryLoadError = e.message
            Log.e(TAG, "Failed to load native library", e)
        }
    }

    fun isAvailable(): Boolean = libraryLoaded

    fun getLoadError(): String? = libraryLoadError

    fun safeLoadKeys(chainId: Long, publicKeyHex: String, crsHex: String): String {
        if (!libraryLoaded) {
            return """{"success":false,"data":null,"error":"${libraryLoadError ?: "Native library not loaded"}"}"""
        }
        return try {
            loadKeys(chainId, publicKeyHex, crsHex)
        } catch (e: Exception) {
            Log.e(TAG, "loadKeys failed", e)
            """{"success":false,"data":null,"error":"${e.message?.replace("\"", "\\\"")}"}"""
        }
    }

    fun safeEncryptValue(chainId: Long, account: String, value: Long, securityZone: Long): String {
        if (!libraryLoaded) {
            return """{"success":false,"data":null,"error":"${libraryLoadError ?: "Native library not loaded"}"}"""
        }
        return try {
            encryptValue(chainId, account, value, securityZone)
        } catch (e: Exception) {
            Log.e(TAG, "encryptValue failed", e)
            """{"success":false,"data":null,"error":"${e.message?.replace("\"", "\\\"")}"}"""
        }
    }

    fun safeEncryptSwap(
        chainId: Long,
        account: String,
        amountInZatoshi: Long,
        feeZatoshi: Long,
        destinationAsset: String,
        platform: String,
        securityZone: Long
    ): String {
        if (!libraryLoaded) {
            return """{"success":false,"data":null,"error":"${libraryLoadError ?: "Native library not loaded"}"}"""
        }
        return try {
            encryptSwap(chainId, account, amountInZatoshi, feeZatoshi, destinationAsset, platform, securityZone)
        } catch (e: Exception) {
            Log.e(TAG, "encryptSwap failed", e)
            """{"success":false,"data":null,"error":"${e.message?.replace("\"", "\\\"")}"}"""
        }
    }

    fun safeEncryptTransaction(
        chainId: Long,
        account: String,
        amountZatoshi: Long,
        feeZatoshi: Long,
        transactionType: String,
        poolType: String,
        platform: String,
        securityZone: Long
    ): String {
        if (!libraryLoaded) {
            return """{"success":false,"data":null,"error":"${libraryLoadError ?: "Native library not loaded"}"}"""
        }
        return try {
            encryptTransaction(chainId, account, amountZatoshi, feeZatoshi, transactionType, poolType, platform, securityZone)
        } catch (e: Exception) {
            Log.e(TAG, "encryptTransaction failed", e)
            """{"success":false,"data":null,"error":"${e.message?.replace("\"", "\\\"")}"}"""
        }
    }

    external fun loadKeys(chainId: Long, publicKeyHex: String, crsHex: String): String
    external fun encryptValue(chainId: Long, account: String, value: Long, securityZone: Long): String
    external fun encryptSwap(
        chainId: Long,
        account: String,
        amountInZatoshi: Long,
        feeZatoshi: Long,
        destinationAsset: String,
        platform: String,
        securityZone: Long
    ): String
    external fun encryptTransaction(
        chainId: Long,
        account: String,
        amountZatoshi: Long,
        feeZatoshi: Long,
        transactionType: String,
        poolType: String,
        platform: String,
        securityZone: Long
    ): String
}
