import {fromLonLat, toLonLat} from 'ol/proj.js';

/**
 * @const {string}
 */
const OSM_CH_ROUTED_FOOT_PROFILE_URL = 'https://routing.osm.ch/routed-foot/route/v1/driving';

/**
 * @const {string}
 */
const OSRM_DEFAULT_PROFILE_URL = 'https://router.project-osrm.org/route/v1/driving';

class OSRMRouter {

  /**
   * @param {Object} options
   * @property {ol.proj.Projection} options.mapProjection
   * @property {string} options.url The URL profile prefix to use, see *_PROFILE_URL.
   * @property {string} options.extraParams Parameters like access token.
   */
  constructor(options) {
    /**
     * @private
     * @type {string}
     */
    this.url_ = options.url;

    /**
     * @private
     * @type {number}
     */
    this.radius_ = options.radius || 10000;

    /**
     * @private
     * @type {ol.proj.Projection}
     */
    this.mapProjection_ = options.mapProjection;

    /**
     * @private
     * @type {string}
     */
    this.extraParams_ = options.extraParams;
  }

  /**
   * @param {ol.Feature} segment
   * @param {ol.Feature} pointFrom
   * @param {ol.Feature} pointTo
   * @return {Promise}
   */
  snapSegment(segment, pointFrom, pointTo) {
    const pointFromGeometry = /** @type {ol.geom.Point} */ (pointFrom.getGeometry());
    const pointToGeometry = /** @type {ol.geom.Point} */ (pointTo.getGeometry());
    const coordinates = [pointFromGeometry.getCoordinates(), pointToGeometry.getCoordinates()].map(coordinates => toLonLat(coordinates.slice(0, 2), this.mapProjection_));

    // [ [a,b] , [c,d] ] -> 'a,b;c,d'
    const coordinateString = coordinates.map(c => c.join(',')).join(';');
    const radiuses = coordinates.map(() => this.radius_).join(';');

    let url = `${this.url_}/${coordinateString}?radiuses=${radiuses}&geometries=geojson`;
    if (this.extraParams_) {
      url += `&${this.extraParams_}`;
    }
    return fetch(url)
      .then(response => response.json())
      .then((jsonResponse) => {
        console.assert(jsonResponse.code === 'Ok');
        console.assert(jsonResponse.routes.length === 1);
        const route = jsonResponse.routes[0];
        const segmentCoordinates = route.geometry.coordinates.map(coordinates => fromLonLat(coordinates, this.mapProjection_));
        const segmentGeometry = /** @type {ol.geom.LineString} */ (segment.getGeometry());

        segment.setProperties({
          snapped: true
        });

        segmentGeometry.setCoordinates(segmentCoordinates);

        pointFromGeometry.setCoordinates(segmentCoordinates[0]);
        pointToGeometry.setCoordinates(segmentCoordinates[segmentCoordinates.length - 1]);
        pointFrom.set('snapped', true);
        pointTo.set('snapped', true);
      });
  }

  /**
   * @param {string} url
   */
  setUrl(url) {
    this.url_ = url;
  }
}

export default OSRMRouter;

export {OSM_CH_ROUTED_FOOT_PROFILE_URL};

export {OSRM_DEFAULT_PROFILE_URL};
