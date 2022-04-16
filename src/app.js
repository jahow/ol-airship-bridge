import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import WebGLPointsLayer from 'ol/layer/WebGLPoints'
import VectorSource from 'ol/source/Vector'
import Point from 'ol/geom/Point'
import Feature from 'ol/Feature'
import { bindMapToTimeWidget } from './bridge'

export function init() {
  const layerStyle = {
    variables: {
      min: -Infinity,
      max: Infinity,
    },
    filter: ['between', ['get', 'date'], ['var', 'min'], ['var', 'max']],
    symbol: {
      symbolType: 'circle',
      size: ['interpolate', ['linear'], ['get', 'magnitude'], 2.5, 4, 5, 20],
      color: [
        'case',
        ['<', ['get', 'depth'], 0],
        'rgb(223,22,172)',
        'rgb(223,113,7)',
      ],
      opacity: 0.5,
    },
  }
  const vectorLayer = new WebGLPointsLayer({
    source: new VectorSource({
      attributions: 'USGS',
    }),
    style: layerStyle,
  })

  const view = new View({
    // https://www.google.com/search?q=seoul+latitude+and+longitude&sxsrf=APq-WBtdNavfwS3YFChajC-2QP0CRh2jYA%3A1650110457671&ei=-a9aYtS2KKCv2roPprqA8Aw&oq=seoul+latitude+&gs_lcp=Cgdnd3Mtd2l6EAMYADIFCAAQkQIyBQgAEIAEMgUIABDLATIGCAAQFhAeOgcIIxCwAxAnOgcIABBHELADOgQIIxAnOgcILhDUAhBDOgsILhCABBDHARDRAzoICC4Q1AIQkQI6CwguEMcBENEDEJECOgsILhCABBDHARCjAjoFCC4QgAQ6BAgAEEM6CwguEIAEEMcBEK8BSgQIQRgASgQIRhgAUJIKWI4mYPwuaAFwAXgAgAGWAYgBtAmSAQMwLjmYAQCgAQHIAQrAAQE&sclient=gws-wiz
    center: fromLonLat([126.9780, 37.5665]), // Seoul latitude and longitude 
    zoom: 12.15,
  })
  const olMap = new Map({
    view,
    target: 'map',
    layers: [
      new TileLayer({
        source: new XYZ({
          urls: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          ],
          crossOrigin: 'anonymous',
        }),
      }),
      vectorLayer,
    ],
  })

  const timeWidget = document.querySelector('as-time-series-widget')

  // load map data
  fetch(
    'https://gist.githubusercontent.com/tucan9389/ff4a03ddfa4ecb7e7630252ca8998173/raw/47b291c0ad4e0547d535ac9ac629c250dd703af7/%25E1%2584%2589%25E1%2585%25A5%25E1%2584%258B%25E1%2585%25AE%25E1%2586%25AF%25E1%2584%2590%25E1%2585%25B3%25E1%2586%25A8%25E1%2584%2587%25E1%2585%25A7%25E1%2586%25AF%25E1%2584%2589%25E1%2585%25B5%2520(%25E1%2584%258B%25E1%2585%25A1%25E1%2586%25AB%25E1%2584%2589%25E1%2585%25B5%25E1%2586%25B7%25E1%2584%258B%25E1%2585%25B5)%2520CCTV%2520%25E1%2584%2589%25E1%2585%25A5%25E1%2586%25AF%25E1%2584%258E%25E1%2585%25B5%2520%25E1%2584%2592%25E1%2585%25A7%25E1%2586%25AB%25E1%2584%2592%25E1%2585%25AA%25E1%2586%25BC.csv'
  )
    .then(response => response.text())
    .then(csv => {
      var features = []
      var prevIndex = csv.indexOf('\n') + 1 // scan past the header line
      var curIndex

      while ((curIndex = csv.indexOf('\n', prevIndex)) !== -1) {
        var line = csv.substr(prevIndex, curIndex - prevIndex).split(',')
        /*
        // console.log(line)
        0 "자치구",
        1 "안심 주소",
        2 "CCTV 용도",
        3 "위도",
        4 "경도",
        5 "CCTV 수량",
        6 "수정 일시"
        */

        prevIndex = curIndex + 1
        var coords = fromLonLat([parseFloat(line[4].replaceAll('"', '')), parseFloat(line[3].replaceAll('"', ''))])
        if (isNaN(coords[0]) || isNaN(coords[1])) {
          // guard against bad data
          continue
        }

        features.push(
          new Feature({
            date: new Date(line[6].replaceAll('"', '')), // remove trailing fraction in date
            depth: 4, //parseInt(line[3]),
            magnitude: parseInt(line[5].replaceAll('"', '')), // 2, // parseInt(line[4]),
            geometry: new Point(coords),
            eventId: curIndex // parseInt(line[11]),
          })
        )
      }

      vectorLayer.getSource().addFeatures(features)
      bindMapToTimeWidget(
        olMap,
        vectorLayer.getSource(),
        timeWidget,
        'date',
        (min, max) => {
          layerStyle.variables.min = min || -Infinity
          layerStyle.variables.max = max || Infinity
          olMap.render()
        }
      )
    })
}
