package co.electriccoin.zcash.ui.fheanalytics

import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.security.SecureRandom
import kotlin.math.*

@Serializable
internal data class CKKSPublicKey(
    val polyDegree: Int,
    val scale: Double,
    val coeffModulus: Long,
    val a: List<Long>,
    val b: List<Long>
)

@Serializable
data class CKKSCiphertext(
    val c0: List<Long>,
    val c1: List<Long>,
    val scale: Double
)

@Serializable
private data class PublicKeyResponse(
    val poly_degree: Int,
    val scale: Double,
    val coeff_modulus: Long,
    val public_key: PublicKeyData,
    val algorithm: String
)

@Serializable
private data class PublicKeyData(
    val a: List<Long>,
    val b: List<Long>
)

internal class CKKSEncryption(private val publicKey: CKKSPublicKey) {
    private val n = publicKey.polyDegree
    private val secureRandom = SecureRandom()

    fun encrypt(value: Double): CKKSCiphertext {
        val scaled = (value * publicKey.scale).toLong()

        val u = generateTernaryPolynomial(n)
        val e0 = generateGaussianPolynomial(n)
        val e1 = generateGaussianPolynomial(n)

        val message = Polynomial(LongArray(n) { i -> if (i == 0) scaled else 0L }, publicKey.coeffModulus)
        val aPoly = Polynomial(publicKey.a.toLongArray(), publicKey.coeffModulus)
        val bPoly = Polynomial(publicKey.b.toLongArray(), publicKey.coeffModulus)

        val c0Poly = (bPoly * u + e0 + message)
        val c1Poly = (aPoly * u + e1)

        return CKKSCiphertext(
            c0 = c0Poly.toList(),
            c1 = c1Poly.toList(),
            scale = publicKey.scale
        )
    }

    private fun generateTernaryPolynomial(degree: Int): Polynomial {
        val coeffs = LongArray(degree) {
            when (secureRandom.nextInt(3)) {
                0 -> -1L
                1 -> 0L
                else -> 1L
            }
        }
        return Polynomial(coeffs, publicKey.coeffModulus)
    }

    private fun generateGaussianPolynomial(degree: Int): Polynomial {
        val sigma = 3.2
        val coeffs = LongArray(degree) {
            randomGaussian(0.0, sigma).toLong()
        }
        return Polynomial(coeffs, publicKey.coeffModulus)
    }

    private fun randomGaussian(mean: Double, stdDev: Double): Double {
        var u1 = secureRandom.nextDouble()
        while (u1 == 0.0) u1 = secureRandom.nextDouble()

        val u2 = secureRandom.nextDouble()
        val z0 = sqrt(-2.0 * ln(u1)) * cos(2.0 * PI * u2)
        return z0 * stdDev + mean
    }
}

class FHEAnalyticsClient(
    private val httpClient: HttpClient,
    private val serverURL: String
) {
    private var ckksEncryption: CKKSEncryption? = null
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun initialize() = withContext(Dispatchers.IO) {
        val response = httpClient.get("$serverURL/keys/fhe_public")
        val responseText = response.bodyAsText()
        val pkResponse = json.decodeFromString<PublicKeyResponse>(responseText)

        val publicKey = CKKSPublicKey(
            polyDegree = pkResponse.poly_degree,
            scale = pkResponse.scale,
            coeffModulus = pkResponse.coeff_modulus,
            a = pkResponse.public_key.a,
            b = pkResponse.public_key.b
        )

        ckksEncryption = CKKSEncryption(publicKey)
    }

    suspend fun submitSwapMetrics(metrics: SwapMetrics) = withContext(Dispatchers.IO) {
        val encryption = ckksEncryption
            ?: throw IllegalStateException("Client not initialized. Call initialize() first.")

        val encryptedAmountIn = encryption.encrypt(metrics.amountZecIn.toDouble())
        val encryptedAmountOut = encryption.encrypt(metrics.amountOut.toDouble())
        val encryptedFee = encryption.encrypt(metrics.affiliateFee.toDouble())

        @Serializable
        data class SwapPayload(
            val encrypted_amount_in: CKKSCiphertext,
            val encrypted_amount_out: CKKSCiphertext,
            val encrypted_fee: CKKSCiphertext,
            val destination_asset: String,
            val origin_asset: String,
            val timestamp: Long,
            val platform: String,
            val swap_type: String,
            val deposit_address: String,
            val provider: String
        )

        val payload = SwapPayload(
            encrypted_amount_in = encryptedAmountIn,
            encrypted_amount_out = encryptedAmountOut,
            encrypted_fee = encryptedFee,
            destination_asset = metrics.destinationAsset,
            origin_asset = metrics.originAsset,
            timestamp = metrics.timestamp,
            platform = metrics.platform,
            swap_type = metrics.swapType,
            deposit_address = metrics.depositAddress,
            provider = metrics.provider
        )

        httpClient.post("$serverURL/ingest/swap") {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }
    }

    suspend fun submitTransactionMetrics(metrics: TransactionMetrics) = withContext(Dispatchers.IO) {
        val encryption = ckksEncryption
            ?: throw IllegalStateException("Client not initialized. Call initialize() first.")

        val encryptedAmount = encryption.encrypt(metrics.amount.toDouble())
        val encryptedFee = encryption.encrypt(metrics.fee.toDouble())

        @Serializable
        data class TransactionPayload(
            val encrypted_amount: CKKSCiphertext,
            val encrypted_fee: CKKSCiphertext,
            val tx_type: String,
            val pool_type: String?,
            val platform: String,
            val timestamp: Long
        )

        val payload = TransactionPayload(
            encrypted_amount = encryptedAmount,
            encrypted_fee = encryptedFee,
            tx_type = metrics.txType,
            pool_type = metrics.poolType,
            platform = metrics.platform,
            timestamp = metrics.timestamp
        )

        httpClient.post("$serverURL/ingest/transaction") {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }
    }
}

data class SwapMetrics(
    val amountZecIn: String,
    val amountZecInFormatted: String,
    val amountZecInUsd: String,
    val amountOut: String,
    val amountOutFormatted: String,
    val amountOutUsd: String,
    val destinationAsset: String,
    val originAsset: String,
    val affiliateFee: String,
    val affiliateFeeUsd: String,
    val exchangeRate: String,
    val slippageTolerance: String,
    val timestamp: Long,
    val swapType: String,
    val depositAddress: String,
    val provider: String,
    val platform: String
)

data class TransactionMetrics(
    val amount: String,
    val fee: String,
    val txType: String,
    val poolType: String?,
    val platform: String,
    val timestamp: Long
)
