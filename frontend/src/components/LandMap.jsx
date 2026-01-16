import { MapContainer, TileLayer, LayersControl, FeatureGroup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import L from 'leaflet'

// Fix for default Leaflet icon not finding images in Webpack/Vite environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fix for Leaflet Draw icons
window.type = ''; // Workaround for some react-leaflet-draw issues in strict mode

const center = [25.037, 121.564]; // Taipei Xinyi

export default function LandMap({ onAreaChange }) {
    const handleCreated = (e) => {
        const layer = e.layer;
        calculateAndNotifyArea(layer);
    }

    const handleEdited = (e) => {
        // Edit event returns layers that were edited
        e.layers.eachLayer(layer => {
            calculateAndNotifyArea(layer);
        });
    }

    const handleDeleted = () => {
        if (onAreaChange) onAreaChange(0);
    }

    const calculateAndNotifyArea = (layer) => {
        const latlngs = layer.getLatLngs();

        // Normalize: getLatLngs() may return nested arrays (e.g., polygons with holes, multipolygons)
        const normalizePolygons = (points) => {
            if (!Array.isArray(points) || !points.length) return [];

            // If this level already represents a ring (array of lat/lngs)
            if (points[0] && points[0].lat !== undefined && points[0].lng !== undefined) {
                return [[points]]; // single polygon, single ring
            }

            // If this level is a polygon with one or more rings
            if (
                Array.isArray(points[0]) &&
                points[0][0] &&
                points[0][0].lat !== undefined &&
                points[0][0].lng !== undefined
            ) {
                return [points];
            }

            // Otherwise recurse deeper (e.g., multipolygon structure)
            return points.flatMap(normalizePolygons);
        }

        const polygons = normalizePolygons(latlngs);
        if (!polygons.length) {
            if (onAreaChange) onAreaChange(0);
            return;
        }

        const area = polygons.reduce((sum, polygon) => {
            if (!Array.isArray(polygon)) return sum;
            return polygon.reduce((polySum, ring, ringIdx) => {
                if (!Array.isArray(ring) || !ring.length) return polySum;
                const areaVal = Math.abs(L.GeometryUtil.geodesicArea(ring));
                return ringIdx === 0 ? polySum + areaVal : polySum - areaVal; // subtract holes
            }, sum);
        }, 0);
        const normalizedArea = Math.max(area, 0);
        const areaStr = normalizedArea.toLocaleString(undefined, { maximumFractionDigits: 1 });

        layer.bindPopup(`面積約: ${areaStr} m²`).openPopup();
        if (onAreaChange) onAreaChange(normalizedArea);
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4 justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                    🗺️ 基地位置檢核 (Base Map)
                </div>
            </h3>
            <div style={{ height: '400px', width: '100%' }}>
                <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <LayersControl position="topright">
                        {/* Base Layer A: Electronic Map */}
                        <LayersControl.BaseLayer checked name="通用電子地圖 (EMAP)">
                            <TileLayer
                                url="https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}"
                                attribution='&copy; <a href="https://maps.nlsc.gov.tw/">NLSC</a>'
                            />
                        </LayersControl.BaseLayer>

                        {/* Base Layer B: Satellite (Photo2) */}
                        <LayersControl.BaseLayer name="正射影像圖 (PHOTO2)">
                            <TileLayer
                                url="https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}"
                                attribution='&copy; <a href="https://maps.nlsc.gov.tw/">NLSC</a>'
                            />
                        </LayersControl.BaseLayer>

                        {/* Overlay: Land Sect (Cadastral) */}
                        <LayersControl.Overlay name="段籍圖 (Land Sect)">
                            <TileLayer
                                url="https://wmts.nlsc.gov.tw/wmts/LANDSECT/default/GoogleMapsCompatible/{z}/{y}/{x}"
                                opacity={0.7}
                                attribution='&copy; <a href="https://maps.nlsc.gov.tw/">NLSC</a>'
                            />
                        </LayersControl.Overlay>
                    </LayersControl>

                    {/* Drawing Controls */}
                    <FeatureGroup>
                        <EditControl
                            position="topleft"
                            onCreated={handleCreated}
                            onEdited={handleEdited}
                            onDeleted={handleDeleted}
                            draw={{
                                rectangle: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                polyline: false,
                                polygon: {
                                    allowIntersection: false,
                                    showArea: true,
                                    shapeOptions: {
                                        color: 'red',
                                        fillColor: '#f03',
                                        fillOpacity: 0.4
                                    }
                                }
                            }}
                        />
                    </FeatureGroup>

                </MapContainer>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">圖資來源: 內政部國土測繪中心 (NLSC)</p>
        </div>
    )
}
