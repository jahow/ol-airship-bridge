import { generateBuckets } from './aggregation'
import { debounce } from 'throttle-debounce'

/**
 *
 * @param {Map} map
 * @param {VectorSource} source
 * @param {TimeSeriesWidget} widget
 */
export function bindMapToTimeWidget(map, source, widget) {
  function updateTimeWidget() {
    const features = source.getFeaturesInExtent(map.getView().calculateExtent())
    widget.data = generateBuckets(features, 'date', 20)
    if (!widget.backgroundData.length) {
      widget.backgroundData = widget.data
    }
  }
  const throttledUpdate = debounce(200, updateTimeWidget)

  // bind view to time widget
  map.getView().on(['change:center', 'change:resolution'], throttledUpdate)

  return updateTimeWidget
}
