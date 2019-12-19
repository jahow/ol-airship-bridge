import { debounce, throttle } from 'throttle-debounce'
import AggregationWorker from './aggregation.worker'
import GeoJSON from 'ol/format/GeoJSON'
import { transformExtent } from 'ol/proj'

const ANIM_SPEED = 0.1 // full cycle by second

const geojson = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
})

/**
 *
 * @param {Map} map
 * @param {VectorSource} source
 * @param {TimeSeriesWidget} widget
 * @param {string} attributeName
 * @param {function(min, max):void} updateSelection
 */
export function bindMapToTimeWidget(
  map,
  source,
  widget,
  attributeName,
  updateSelection
) {
  const worker = new AggregationWorker()

  // send source content to worker
  let start = performance.now()
  worker.postMessage({
    type: 'features',
    features: geojson.writeFeaturesObject(source.getFeatures()),
  })
  console.log(`Took ${performance.now() - start} ms to send features to worker`)

  worker.addEventListener('message', event => {
    const type = event.data.type
    const data = event.data
    switch (type) {
      case 'buckets':
        widget.data = data.buckets
        if (!widget.backgroundData.length) {
          widget.backgroundData = widget.data
        }
    }
  })

  function updateTimeWidget() {
    worker.postMessage({
      type: 'buckets',
      extent: transformExtent(
        map.getView().calculateExtent(),
        'EPSG:3857',
        'EPSG:4326'
      ),
      attributeName: 'date',
    })
  }
  updateTimeWidget()
  const throttledUpdate = throttle(500, updateTimeWidget)

  // bind view to time widget
  map.getView().on(['change:center', 'change:resolution'], throttledUpdate)

  let playing = false
  let playProgress = 0
  let currentSelection = null

  // bind time widget to layer style
  widget.addEventListener('selectionInput', event => {
    currentSelection = event.detail === null ? null : event.detail.selection
    if (!playing) {
      if (currentSelection !== null) {
        updateSelection(currentSelection[0], currentSelection[1])
      } else {
        updateSelection(null, null)
      }
    }
  })
  widget.addEventListener('seek', event => {
    playProgress = event.detail / 100
  })
  widget.addEventListener('play', event => {
    playing = true
  })
  widget.addEventListener('pause', event => {
    playing = false
  })

  let lastUpdate = null
  function updateAnimation() {
    widget.progress = playProgress * 100
    widget.playing = playing

    if (playing) {
      if (!lastUpdate) lastUpdate = Date.now()
      else {
        const now = Date.now()
        playProgress += (now - lastUpdate) * 0.001 * ANIM_SPEED
        playProgress = playProgress % 1
        lastUpdate = now

        const selection = currentSelection || [
          widget.backgroundData[0].start,
          widget.backgroundData[widget.backgroundData.length - 1].end,
        ]
        updateSelection(
          selection[0],
          selection[0] + playProgress * (selection[1] - selection[0])
        )
      }
    } else {
      lastUpdate = null
    }

    window.requestAnimationFrame(updateAnimation)
  }
  updateAnimation()

  return updateTimeWidget
}
