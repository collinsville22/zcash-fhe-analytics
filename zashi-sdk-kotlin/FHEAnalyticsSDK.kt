import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.*
import java.security.SecureRandom

data class CKKSPublicKey(
    val polyDegree: Int,
    val scale: Double,
    val coeffModulus: Long,
    val a: DoubleArray,
    val b: DoubleArray
)

data class CKKSCiphertext(
    val c0: DoubleArray,
    val c1: DoubleArray,
    val scale: Double
)

class CKKSEncryption(private val publicKey: CKKSPublicKey) {
    private val n = publicKey.polyDegree
    
    fun encrypt(value: Double): CKKSCiphertext {
        val scaled = value * publicKey.scale
        
        val u = generateRandomPolynomial(n)
        val e0 = generateSmallErrorPolynomial(n)
        val e1 = generateSmallErrorPolynomial(n)
        
        val c0 = DoubleArray(n) { i ->
            ((publicKey.b[i] * u[i] + e0[i] + if (i == 0) scaled else 0.0) % publicKey.coeffModulus)
        }
        
        val c1 = DoubleArray(n) { i ->
            ((publicKey.a[i] * u[i] + e1[i]) % publicKey.coeffModulus)
        }
        
        return CKKSCiphertext(c0, c1, publicKey.scale)
    }
    
    private fun generateRandomPolynomial(degree: Int): DoubleArray {
        return DoubleArray(degree) { 
            SecureRandom().nextDouble(-1.0, 1.0)
        }
    }
    
    private fun generateSmallErrorPolynomial(degree: Int): DoubleArray {
        val sigma = 3.2
        return DoubleArray(degree) {
            randomGaussian(0.0, sigma)
        }
    }
    
    private fun randomGaussian(mean: Double, stdDev: Double): Double {
        val u1 = SecureRandom().nextDouble()
        val u2 = SecureRandom().nextDouble()
        val z0 = sqrt(-2.0 * ln(u1)) * cos(2.0 * PI * u2)
        return z0 * stdDev + mean
    }
}

class FHEAnalyticsSDK(private val serverURL: String) {
    private val client = OkHttpClient()
    private var ckksEncryption: CKKSEncryption? = null
    
    suspend fun fetchPublicKey() = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$serverURL/keys/fhe_public")
            .build()
        
        val response = client.newCall(request).execute()
        val json = JSONObject(response.body?.string() ?: "")
        
        val pkJson = json.getJSONObject("public_key")
        val publicKey = CKKSPublicKey(
            polyDegree = json.getInt("poly_degree"),
            scale = json.getDouble("scale"),
            coeffModulus = json.getLong("coeff_modulus"),
            a = pkJson.getJSONArray("a").toDoubleArray(),
            b = pkJson.getJSONArray("b").toDoubleArray()
        )
        
        ckksEncryption = CKKSEncryption(publicKey)
    }
    
    suspend fun submitSwapMetrics(metrics: SwapMetrics) = withContext(Dispatchers.IO) {
        val encryption = ckksEncryption 
            ?: throw IllegalStateException("Public key not loaded")
        
        val encryptedAmountIn = encryption.encrypt(metrics.amountZecIn)
        val encryptedAmountOut = encryption.encrypt(metrics.amountOut)
        val encryptedFee = encryption.encrypt(metrics.affiliateFee)
        
        val payload = JSONObject().apply {
            put("encrypted_amount_in", encodeCiphertext(encryptedAmountIn))
            put("encrypted_amount_out", encodeCiphertext(encryptedAmountOut))
            put("encrypted_fee", encodeCiphertext(encryptedFee))
            put("destination_asset", metrics.destinationAsset)
            put("origin_asset", metrics.originAsset)
            put("timestamp", metrics.timestamp)
            put("platform", metrics.platform)
            put("swap_type", metrics.swapType)
            put("deposit_address", metrics.depositAddress)
            put("provider", metrics.provider)
        }
        
        val request = Request.Builder()
            .url("$serverURL/ingest/swap")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()
        
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            throw Exception("Failed to submit swap: ${response.code}")
        }
    }
    
    private fun encodeCiphertext(ct: CKKSCiphertext): JSONObject {
        return JSONObject().apply {
            put("c0", JSONArray(ct.c0.toList()))
            put("c1", JSONArray(ct.c1.toList()))
            put("scale", ct.scale)
        }
    }
    
    private fun JSONArray.toDoubleArray(): DoubleArray {
        return DoubleArray(length()) { getDouble(it) }
    }
}

data class SwapMetrics(
    val amountZecIn: Double,
    val amountZecInFormatted: String,
    val amountZecInUsd: String,
    val amountOut: Double,
    val amountOutFormatted: String,
    val amountOutUsd: String,
    val destinationAsset: String,
    val originAsset: String,
    val affiliateFee: Double,
    val affiliateFeeUsd: String,
    val exchangeRate: Double,
    val slippageTolerance: Double,
    val timestamp: Long,
    val swapType: String,
    val depositAddress: String,
    val provider: String,
    val platform: String
)
