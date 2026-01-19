package co.electriccoin.zcash.fhe

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

class ZcashFHESDK private constructor() {
    private val chainConfigs = ConcurrentHashMap<Long, ChainConfiguration>()
    private val initializedChains = ConcurrentHashMap<Long, Boolean>()
    private val initializationMutex = Mutex()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    private val gson = Gson()

    private val requestCount = AtomicInteger(0)
    private val windowStartTime = AtomicLong(System.currentTimeMillis())
    private val rateLimitMutex = Mutex()

    companion object {
        private const val TAG = "ZcashFHESDK"
        private const val ZATOSHI_PER_ZEC = 100_000_000L
        private const val MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024
        private const val MAX_REQUESTS_PER_MINUTE = 60
        private const val RATE_LIMIT_WINDOW_MS = 60_000L
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val INITIAL_RETRY_DELAY_MS = 1000L

        @Volatile
        private var instance: ZcashFHESDK? = null

        fun getInstance(): ZcashFHESDK {
            return instance ?: synchronized(this) {
                instance ?: ZcashFHESDK().also { instance = it }
            }
        }

        fun zecToZatoshi(zec: BigDecimal): Long {
            return zec.multiply(BigDecimal(ZATOSHI_PER_ZEC))
                .setScale(0, RoundingMode.HALF_UP)
                .toLong()
        }

        fun zatoshiToZec(zatoshi: Long): BigDecimal {
            return BigDecimal(zatoshi)
                .divide(BigDecimal(ZATOSHI_PER_ZEC), 8, RoundingMode.HALF_UP)
        }

        @Deprecated("Use BigDecimal version for precision", ReplaceWith("zecToZatoshi(BigDecimal(zec))"))
        fun zecToZatoshiDouble(zec: Double): Long = (zec * ZATOSHI_PER_ZEC).toLong()

        @Deprecated("Use BigDecimal version for precision", ReplaceWith("zatoshiToZec(zatoshi).toDouble()"))
        fun zatoshiToZecDouble(zatoshi: Long): Double = zatoshi.toDouble() / ZATOSHI_PER_ZEC
    }

    enum class NetworkEnvironment(
        val chainId: Long,
        val cofheUrl: String,
        val verifierUrl: String,
        val thresholdNetworkUrl: String
    ) {
        TESTNET(
            chainId = 11155111L,
            cofheUrl = "https://testnet-cofhe.fhenix.zone",
            verifierUrl = "https://testnet-cofhe-vrf.fhenix.zone",
            thresholdNetworkUrl = "https://testnet-cofhe-tn.fhenix.zone"
        ),
        ARBITRUM_SEPOLIA(
            chainId = 421614L,
            cofheUrl = "https://testnet-cofhe.fhenix.zone",
            verifierUrl = "https://testnet-cofhe-vrf.fhenix.zone",
            thresholdNetworkUrl = "https://testnet-cofhe-tn.fhenix.zone"
        ),
        MAINNET(
            chainId = 1L,
            cofheUrl = "https://cofhe.fhenix.zone",
            verifierUrl = "https://cofhe-vrf.fhenix.zone",
            thresholdNetworkUrl = "https://cofhe-tn.fhenix.zone"
        );

        fun toConfiguration(): ChainConfiguration = ChainConfiguration(
            chainId = chainId,
            cofheUrl = cofheUrl,
            verifierUrl = verifierUrl,
            thresholdNetworkUrl = thresholdNetworkUrl
        )
    }

    enum class SecurityZone(val value: Int) {
        DEFAULT(0),
        SWAP_ANALYTICS(1),
        TRANSACTION_ANALYTICS(2),
        SENSITIVE(3)
    }

    data class ChainConfiguration(
        val chainId: Long,
        val cofheUrl: String,
        val verifierUrl: String,
        val thresholdNetworkUrl: String
    )

    data class SDKStatus(
        val nativeLibraryLoaded: Boolean,
        val nativeLibraryError: String?,
        val configuredChains: Set<Long>,
        val initializedChains: Set<Long>
    )

    fun getStatus(): SDKStatus = SDKStatus(
        nativeLibraryLoaded = FHECore.isAvailable(),
        nativeLibraryError = FHECore.getLoadError(),
        configuredChains = chainConfigs.keys.toSet(),
        initializedChains = initializedChains.keys.toSet()
    )

    fun configure(environment: NetworkEnvironment) {
        configure(environment.toConfiguration())
    }

    fun configure(config: ChainConfiguration) {
        chainConfigs[config.chainId] = config
    }

    fun isInitialized(chainId: Long): Boolean = initializedChains[chainId] == true

    suspend fun initialize(chainId: Long): FHEResult<Unit> = initializationMutex.withLock {
        if (initializedChains[chainId] == true) {
            return@withLock FHEResult.Success(Unit)
        }

        if (!FHECore.isAvailable()) {
            return@withLock FHEResult.Error(FHECore.getLoadError() ?: "Native library not available")
        }

        val config = chainConfigs[chainId]
            ?: return@withLock FHEResult.Error("Chain $chainId not configured")

        return@withLock try {
            val keys = fetchNetworkKeysWithRetry(config)
            val result = FHECore.safeLoadKeys(chainId, keys.publicKey, keys.crs)
            val parsed = parseResult<String>(result)

            when (parsed) {
                is FHEResult.Success -> {
                    initializedChains[chainId] = true
                    FHEResult.Success(Unit)
                }
                is FHEResult.Error -> parsed
            }
        } catch (e: Exception) {
            Log.e(TAG, "Initialization failed for chain $chainId", e)
            FHEResult.Error("Initialization failed: ${e.message}")
        }
    }

    suspend fun encryptValue(
        chainId: Long,
        account: String,
        value: Long,
        securityZone: SecurityZone = SecurityZone.DEFAULT
    ): FHEResult<EncryptedInput> {
        val checkResult = checkPreConditions<EncryptedInput>(chainId)
        if (checkResult != null) return checkResult

        if (!checkRateLimit()) {
            return FHEResult.Error("Rate limit exceeded. Please try again later.")
        }

        return withContext(Dispatchers.Default) {
            val result = FHECore.safeEncryptValue(chainId, account, value, securityZone.value.toLong())
            val parsed = parseResult<EncryptedInput>(result)
            validateEncryptedInput(parsed)
        }
    }

    suspend fun encryptSwap(
        chainId: Long,
        account: String,
        amountInZatoshi: Long,
        feeZatoshi: Long,
        destinationAsset: String,
        platform: String,
        securityZone: SecurityZone = SecurityZone.SWAP_ANALYTICS
    ): FHEResult<EncryptedSwapPayload> {
        val checkResult = checkPreConditions<EncryptedSwapPayload>(chainId)
        if (checkResult != null) return checkResult

        if (!checkRateLimit()) {
            return FHEResult.Error("Rate limit exceeded. Please try again later.")
        }

        if (destinationAsset.length > 32 || platform.length > 32) {
            return FHEResult.Error("Asset or platform name exceeds maximum length")
        }

        return withContext(Dispatchers.Default) {
            val result = FHECore.safeEncryptSwap(
                chainId, account, amountInZatoshi, feeZatoshi,
                destinationAsset, platform, securityZone.value.toLong()
            )
            val parsed = parseResult<EncryptedSwapPayload>(result)
            validateEncryptedSwapPayload(parsed)
        }
    }

    suspend fun encryptTransaction(
        chainId: Long,
        account: String,
        amountZatoshi: Long,
        feeZatoshi: Long,
        transactionType: TransactionType,
        poolType: PoolType,
        platform: String,
        securityZone: SecurityZone = SecurityZone.TRANSACTION_ANALYTICS
    ): FHEResult<EncryptedTransactionPayload> {
        val checkResult = checkPreConditions<EncryptedTransactionPayload>(chainId)
        if (checkResult != null) return checkResult

        if (!checkRateLimit()) {
            return FHEResult.Error("Rate limit exceeded. Please try again later.")
        }

        if (platform.length > 32) {
            return FHEResult.Error("Platform name exceeds maximum length")
        }

        return withContext(Dispatchers.Default) {
            val result = FHECore.safeEncryptTransaction(
                chainId, account, amountZatoshi, feeZatoshi,
                transactionType.value, poolType.value, platform, securityZone.value.toLong()
            )
            val parsed = parseResult<EncryptedTransactionPayload>(result)
            validateEncryptedTransactionPayload(parsed)
        }
    }

    private suspend fun checkRateLimit(): Boolean = rateLimitMutex.withLock {
        val currentTime = System.currentTimeMillis()
        val windowStart = windowStartTime.get()

        if (currentTime - windowStart > RATE_LIMIT_WINDOW_MS) {
            windowStartTime.set(currentTime)
            requestCount.set(1)
            return@withLock true
        }

        if (requestCount.get() >= MAX_REQUESTS_PER_MINUTE) {
            return@withLock false
        }

        requestCount.incrementAndGet()
        true
    }

    private fun <T> checkPreConditions(chainId: Long): FHEResult<T>? {
        if (!FHECore.isAvailable()) {
            return FHEResult.Error(FHECore.getLoadError() ?: "Native library not available")
        }
        if (initializedChains[chainId] != true) {
            return FHEResult.Error("Chain $chainId not initialized. Call initialize() first.")
        }
        return null
    }

    private fun validateEncryptedInput(result: FHEResult<EncryptedInput>): FHEResult<EncryptedInput> {
        return when (result) {
            is FHEResult.Success -> {
                val input = result.data
                when {
                    input.proofData.size > MAX_PROOF_SIZE_BYTES ->
                        FHEResult.Error("Proof data exceeds maximum size")
                    input.ctHash.isBlank() ->
                        FHEResult.Error("Invalid ciphertext hash")
                    !input.ctHash.startsWith("0x") || input.ctHash.length != 66 ->
                        FHEResult.Error("Malformed ciphertext hash")
                    else -> result
                }
            }
            is FHEResult.Error -> result
        }
    }

    private fun validateEncryptedSwapPayload(result: FHEResult<EncryptedSwapPayload>): FHEResult<EncryptedSwapPayload> {
        return when (result) {
            is FHEResult.Success -> {
                val payload = result.data
                val amountValidation = validateEncryptedInput(FHEResult.Success(payload.encryptedAmountIn))
                val feeValidation = validateEncryptedInput(FHEResult.Success(payload.encryptedFee))

                when {
                    amountValidation is FHEResult.Error -> FHEResult.Error("Amount: ${amountValidation.message}")
                    feeValidation is FHEResult.Error -> FHEResult.Error("Fee: ${feeValidation.message}")
                    else -> result
                }
            }
            is FHEResult.Error -> result
        }
    }

    private fun validateEncryptedTransactionPayload(result: FHEResult<EncryptedTransactionPayload>): FHEResult<EncryptedTransactionPayload> {
        return when (result) {
            is FHEResult.Success -> {
                val payload = result.data
                val amountValidation = validateEncryptedInput(FHEResult.Success(payload.encryptedAmount))
                val feeValidation = validateEncryptedInput(FHEResult.Success(payload.encryptedFee))

                when {
                    amountValidation is FHEResult.Error -> FHEResult.Error("Amount: ${amountValidation.message}")
                    feeValidation is FHEResult.Error -> FHEResult.Error("Fee: ${feeValidation.message}")
                    else -> result
                }
            }
            is FHEResult.Error -> result
        }
    }

    private data class NetworkKeys(val publicKey: String, val crs: String)

    private data class KeysResponse(val public_key: String, val crs: String)

    private suspend fun fetchNetworkKeysWithRetry(config: ChainConfiguration): NetworkKeys {
        var lastException: Exception? = null
        var delayMs = INITIAL_RETRY_DELAY_MS

        repeat(MAX_RETRY_ATTEMPTS) { attempt ->
            try {
                return fetchNetworkKeys(config)
            } catch (e: Exception) {
                lastException = e
                Log.w(TAG, "Key fetch attempt ${attempt + 1} failed: ${e.message}")
                if (attempt < MAX_RETRY_ATTEMPTS - 1) {
                    delay(delayMs)
                    delayMs *= 2
                }
            }
        }
        throw lastException ?: FHEException.NetworkError("Failed to fetch keys after $MAX_RETRY_ATTEMPTS attempts")
    }

    private suspend fun fetchNetworkKeys(config: ChainConfiguration): NetworkKeys = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("${config.cofheUrl}/v1/keys")
            .get()
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw FHEException.NetworkError("Failed to fetch keys: HTTP ${response.code}")
            }
            val body = response.body?.string()
                ?: throw FHEException.NetworkError("Empty response body")
            val keysResponse = gson.fromJson(body, KeysResponse::class.java)
            NetworkKeys(keysResponse.public_key, keysResponse.crs)
        }
    }

    private data class JniResponse<T>(
        val success: Boolean,
        val data: T?,
        val error: String?
    )

    private inline fun <reified T> parseResult(json: String): FHEResult<T> {
        return try {
            val type = object : TypeToken<JniResponse<T>>() {}.type
            val response: JniResponse<T> = gson.fromJson(json, type)

            if (response.success && response.data != null) {
                FHEResult.Success(response.data)
            } else {
                FHEResult.Error(response.error ?: "Unknown error")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse JNI response", e)
            FHEResult.Error("Failed to parse response: ${e.message}")
        }
    }
}

sealed class FHEException(message: String) : Exception(message) {
    class NotConfigured : FHEException("Chain not configured. Call configure() first.")
    class NotInitialized : FHEException("SDK not initialized. Call initialize() first.")
    class NativeLibraryNotLoaded(msg: String) : FHEException(msg)
    class EncryptionFailed(msg: String) : FHEException("Encryption failed: $msg")
    class NetworkError(msg: String) : FHEException("Network error: $msg")
    class ValidationError(msg: String) : FHEException("Validation error: $msg")
    class RateLimitExceeded : FHEException("Rate limit exceeded")
}
