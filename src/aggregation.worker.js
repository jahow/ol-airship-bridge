/**
 * @type {Feature[]}
 */
import GeoJSON from 'ol/format/GeoJSON'
import VectorSource from 'ol/source/Vector'
import { generateBuckets } from './aggregation'

let vectorSource = new VectorSource()

const geojson = new GeoJSON({
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:4326',
})

self.onmessage = event => {
  const type = event.data.type
  const data = event.data

  switch (type) {
    case 'features':
      vectorSource.addFeatures(geojson.readFeaturesFromObject(data.features))
      break
    case 'buckets':
      let start = performance.now()
      const features = vectorSource.getFeaturesInExtent(data.extent)
      self.postMessage({
        type: 'buckets',
        buckets: generateBuckets(features, data.attributeName, 20),
      })
      console.log(
        `Took ${performance.now() - start} ms to compute aggregations`
      )
      break
  }
}
