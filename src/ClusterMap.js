import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';

export class ClusterMap {
    constructor({ containerId, method }) {
        const map = new maplibregl.Map({
            container: containerId, // container id
            renderWorldCopies: false,
            style: {
                version: 8,
                "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
                sources: {},
                layers: []
            },
            // style: 'https://demotiles.maplibre.org/style.json', // style URL
            center: [0, 0], // starting position [lng, lat]
            zoom: 1 // starting zoom
        });
        this.map = map 
        this.method = method
    }

    changeSelectedPoint(textToSelect) {
        this.map.setPaintProperty('points-layer', 'circle-color', [
            'case',
            ['==', ['get', 'text'], textToSelect],
            '#e74c3c', // Red for selected
            '#3887be'  // Blue for others
        ]);
    }

    visualizeCluster(cluster) {
        // const cluster = clusters[0]

        const embeddings = cluster.items.map(item => item.embedding);
        let projectedData = null

        if (this.method == 'umap') {
            const umap = new UMAP();
            projectedData = umap.fit(embeddings);
        } else {
            const pca = new PCA(embeddings, {
                scale: true,
                center: true
            });
            const { data } = pca.predict(embeddings, { nComponents: 2 });

            projectedData = data
        }
        

        const rect = {
            minLat: -50,    
            maxLat: 50,     
            minLng: -50,   
            maxLng: 50    
        }
        const latLngPoints = convertPCAToLatLng(projectedData, rect);
        
        const geojson = {
            "type": "FeatureCollection",
            "features": [
              {
                "type": "Feature",
                "properties": {},
                "geometry": {
                  "coordinates": [],
                  "type": "Point"
                }
              }
            ]
        }

        for (let i = 0; i < latLngPoints.length; i++) {
            const point = latLngPoints[i]
            const item = cluster.items[i]
            const text = item.content 
            const url = item.url

            geojson.features.push({
                "type": "Feature",
                "properties": {
                    text, url
                },
                "geometry": {
                  "coordinates": [ point.lng, point.lat ],
                  "type": "Point"
                }
              })
        }

        const map = this.map
        map.on('load', async () => {
            map.addSource('points', {
                type: 'geojson',
                data: geojson
            });

            // Add a symbol layer
            map.addLayer({
                id: 'points-layer',
                type: 'circle',
                source: 'points',
                // maxzoom: 5,
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#3887be',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            
            // Add a text layer for labels
            map.addLayer({
                id: 'point-labels',
                type: 'symbol',
                source: 'points',
                minzoom: 3,
                layout: {
                    'text-field': ['get', 'text'],
                    // 'text-font': ['Open Sans Regular'],
                    'text-offset': [0, 1],
                    'text-anchor': 'top'
                },
                paint: {
                    'text-color': '#000000',
                    // 'text-halo-color': '#ffffff',
                    // 'text-halo-width': 2
                }
            });

            function clickHandler(e) {
                const properties = e.features[0].properties;
                const url = properties.url
                
                window.open(url, '_blank');
            }
        
            map.on('click', 'points-layer', clickHandler);
            map.on('click', 'point-labels', clickHandler);
        })
    }
}

function convertPCAToLatLng(twoDimDataArray, boundingRect) {
    if (boundingRect == null) {
        boundingRect = {
            minLat: -50,    
            maxLat: 50,     
            minLng: -50,   
            maxLng: 50    
        }
    }
    // Extract all x and y values for normalization
    const xValues = twoDimDataArray.map(point => point[0]);
    const yValues = twoDimDataArray.map(point => point[1]);
    
    // Find min/max for normalization
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    const { minLat, maxLat, minLng, maxLng } = boundingRect;
    
    // Convert each point
    return twoDimDataArray.map(point => {
        // Normalize to 0-1
        const normalizedX = (point[0] - minX) / (maxX - minX);
        const normalizedY = (point[1] - minY) / (maxY - minY);
        
        // Convert to lat/lng
        const lng = minLng + (normalizedX * (maxLng - minLng));
        const lat = minLat + (normalizedY * (maxLat - minLat));
        
        return { lat, lng };
    });
}

function splitBoundingRectIntoQuadrants(boundingRect) {
    const { minLat, maxLat, minLng, maxLng } = boundingRect;
    
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    
    return [
        // Top-left
        { minLat: midLat, maxLat: maxLat, minLng: minLng, maxLng: midLng },
        // Top-right  
        { minLat: midLat, maxLat: maxLat, minLng: midLng, maxLng: maxLng },
        // Bottom-left
        { minLat: minLat, maxLat: midLat, minLng: minLng, maxLng: midLng },
        // Bottom-right
        { minLat: minLat, maxLat: midLat, minLng: midLng, maxLng: maxLng }
    ];
 }