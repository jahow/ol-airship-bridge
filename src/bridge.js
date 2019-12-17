import { generateBuckets } from './aggregation'
import { debounce } from 'throttle-debounce'

/**
 *
 * @param {Map} map
 * @param {VectorSource} source
 * @param {HistogramWidget} widget
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
  function updateTimeWidget() {
    const features = source.getFeaturesInExtent(map.getView().calculateExtent())
    widget.data = generateBuckets(features, attributeName, 20)
    if (!widget.backgroundData.length) {
      widget.backgroundData = widget.data
    }
  }
  const throttledUpdate = debounce(200, updateTimeWidget)

  // bind view to time widget
  map.getView().on(['change:center', 'change:resolution'], throttledUpdate)

  // bind time widget to layer style
  widget.addEventListener('selectionInput', evt => {
    const selection = evt.detail === null ? null : evt.detail.selection
    if (selection !== null) {
      updateSelection(selection[0], selection[1])
    } else {
      updateSelection(null, null)
    }
  })

  return updateTimeWidget
}
