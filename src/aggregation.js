/**
 * Dict of initial buckets by attr
 * @type {Object<string, {start: number, end: number, value: number}[]>}
 */
const initialBuckets = {}

/**
 * Generates a list of buckets describing the repartition of features.
 * @param {Feature[]} features
 * @param {string} attributeName
 * @param {number} bucketCount
 * @returns {{start: number, end: number, value: number}[]}
 */
export function generateBuckets(features, attributeName, bucketCount) {
  let buckets
  if (initialBuckets[attributeName]) {
    buckets = initialBuckets[attributeName].map(b => ({ ...b, value: 0 }))
  } else {
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < features.length; i++) {
      const attr = features[i].get(attributeName)
      if (attr > max) max = attr.valueOf()
      if (attr < min) min = attr.valueOf()
    }

    buckets = new Array(bucketCount).fill(0).map((value, index, arr) => {
      const ratioStart = index / arr.length
      const ratioEnd = (index + 1) / arr.length
      return {
        start: ratioStart * (max - min) + min,
        end: ratioEnd * (max - min) + min,
        value: 0,
      }
    })
    initialBuckets[attributeName] = buckets.slice()
  }

  // count features
  for (let i = 0; i < features.length; i++) {
    const attr = features[i].get(attributeName)
    for (let j = 0; j < buckets.length; j++) {
      if (attr >= buckets[j].start && attr <= buckets[j].end) {
        buckets[j].value++
        break
      }
    }
  }

  return buckets
}
