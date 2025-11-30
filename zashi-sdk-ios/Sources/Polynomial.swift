import Foundation

internal class Polynomial {
    let coeffs: [Int64]
    let modulus: Int64

    var degree: Int {
        return coeffs.count
    }

    init(coeffs: [Int64], modulus: Int64) {
        self.coeffs = coeffs
        self.modulus = modulus
    }

    static func +(lhs: Polynomial, rhs: Polynomial) -> Polynomial {
        precondition(lhs.degree == rhs.degree, "Polynomial degrees must match")
        precondition(lhs.modulus == rhs.modulus, "Moduli must match")

        let result = (0..<lhs.degree).map { i in
            floorMod(lhs.coeffs[i] + rhs.coeffs[i], lhs.modulus)
        }
        return Polynomial(coeffs: result, modulus: lhs.modulus)
    }

    static func *(lhs: Polynomial, rhs: Polynomial) -> Polynomial {
        precondition(lhs.modulus == rhs.modulus, "Moduli must match")

        let resultDegree = lhs.degree + rhs.degree - 1
        var temp = [Int64](repeating: 0, count: resultDegree)

        for i in 0..<lhs.degree {
            for j in 0..<rhs.degree {
                let product = multiplyMod(lhs.coeffs[i], rhs.coeffs[j], lhs.modulus)
                temp[i + j] = floorMod(temp[i + j] + product, lhs.modulus)
            }
        }

        return Polynomial(coeffs: temp, modulus: lhs.modulus).reduceByXnPlus1(n: lhs.degree)
    }

    private func reduceByXnPlus1(n: Int) -> Polynomial {
        var reduced = [Int64](repeating: 0, count: n)

        for i in 0..<coeffs.count {
            let quotient = i / n
            let remainder = i % n

            if quotient % 2 == 0 {
                reduced[remainder] = Polynomial.floorMod(reduced[remainder] + coeffs[i], modulus)
            } else {
                reduced[remainder] = Polynomial.floorMod(reduced[remainder] - coeffs[i], modulus)
            }
        }

        return Polynomial(coeffs: reduced, modulus: modulus)
    }

    private static func multiplyMod(_ a: Int64, _ b: Int64, _ mod: Int64) -> Int64 {
        let result = (Int(a) * Int(b)) % Int(mod)
        return Int64(result)
    }

    private static func floorMod(_ a: Int64, _ mod: Int64) -> Int64 {
        let result = a % mod
        return result < 0 ? result + mod : result
    }

    func toList() -> [Int64] {
        return coeffs
    }
}
