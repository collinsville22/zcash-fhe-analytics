package co.electriccoin.zcash.ui.fheanalytics

internal class Polynomial(
    val coeffs: LongArray,
    val modulus: Long
) {
    val degree: Int = coeffs.size

    operator fun plus(other: Polynomial): Polynomial {
        require(degree == other.degree) { "Polynomial degrees must match" }
        require(modulus == other.modulus) { "Moduli must match" }

        val result = LongArray(degree) { i ->
            floorMod(coeffs[i] + other.coeffs[i], modulus)
        }
        return Polynomial(result, modulus)
    }

    operator fun times(other: Polynomial): Polynomial {
        require(modulus == other.modulus) { "Moduli must match" }

        val resultDegree = degree + other.degree - 1
        val temp = LongArray(resultDegree)

        for (i in coeffs.indices) {
            for (j in other.coeffs.indices) {
                val product = multiplyMod(coeffs[i], other.coeffs[j], modulus)
                temp[i + j] = floorMod(temp[i + j] + product, modulus)
            }
        }

        return Polynomial(temp, modulus).reduceByXnPlus1(degree)
    }

    private fun reduceByXnPlus1(n: Int): Polynomial {
        val reduced = LongArray(n)

        for (i in coeffs.indices) {
            val quotient = i / n
            val remainder = i % n

            if (quotient % 2 == 0) {
                reduced[remainder] = floorMod(reduced[remainder] + coeffs[i], modulus)
            } else {
                reduced[remainder] = floorMod(reduced[remainder] - coeffs[i], modulus)
            }
        }

        return Polynomial(reduced, modulus)
    }

    private fun multiplyMod(a: Long, b: Long, mod: Long): Long {
        val aBig = a.toBigInteger()
        val bBig = b.toBigInteger()
        val modBig = mod.toBigInteger()
        return ((aBig * bBig) % modBig).toLong()
    }

    private fun floorMod(a: Long, mod: Long): Long {
        val result = a % mod
        return if (result < 0) result + mod else result
    }

    fun toList(): List<Long> = coeffs.toList()

    companion object {
        fun fromDoubleList(values: List<Double>, modulus: Long): Polynomial {
            val coeffs = LongArray(values.size) { i ->
                val rounded = values[i].toLong()
                floorMod(rounded, modulus)
            }
            return Polynomial(coeffs, modulus)
        }

        private fun floorMod(a: Long, mod: Long): Long {
            val result = a % mod
            return if (result < 0) result + mod else result
        }
    }
}
