const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. ENDPOINT DE INFORMACIÓN (Clave para que no diga "Incompatible")
// ArcGIS consulta esto para verificar que el servicio es de tipo 'Route'
app.get('/solve/NAServer/Route', (req, res) => {
    res.json({
        currentVersion: 10.81,
        serviceDescription: "Proxy OSRM para Providencia",
        capabilities: "Route",
        routeNetworkName: "OSRM_Network",
        supportedImageReturnTypes: "MIME+Data"
    });
});

// 2. EL HANDLER QUE INTEGRÓ TU LÓGICA
app.all('/solve/NAServer/Route/solve', async (req, res) => {
    const params = { ...req.query, ...req.body };
    let stops = params.stops;

    if (!stops) {
        return res.status(400).json({ error: { code: 400, message: "No se recibieron coordenadas (stops)." } });
    }

    try {
        // Parseamos los stops que envía ArcGIS
        const stopsData = typeof stops === 'string' ? JSON.parse(stops) : stops;
        
        // Convertimos a formato OSRM [lon, lat]
        const coords = stopsData.features.map(f => {
            return `${f.geometry.x.toFixed(6)},${f.geometry.y.toFixed(6)}`;
        }).join(';');

        // Tu lógica de OSRM con encodeURI
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${encodeURI(coords)}?overview=full&geometries=geojson`;
        const response = await axios.get(osrmUrl);
        
        if (!response.data.routes || response.data.routes.length === 0) {
            return res.status(404).json({ error: "Ruta no encontrada" });
        }

        const route = response.data.routes[0];

        // RESPUESTA COMPATIBLE CON EL WIDGET DE DIRECCIONES
        const nasResponse = {
            routes: {
                spatialReference: { wkid: 4326 },
                features: [{
                    attributes: { 
                        Name: "Ruta Providencia",
                        Distancia_km: (route.distance / 1000).toFixed(2), 
                        Tiempo_min: (route.duration / 60).toFixed(1) 
                    },
                    geometry: { 
                        paths: [route.geometry.coordinates], 
                        spatialReference: { wkid: 4326 } 
                    }
                }]
            }
        };

        res.json(nasResponse);

    } catch (error) {
        res.status(500).json({ error: { code: 500, message: error.message } });
    }
});

app.listen(PORT, () => console.log(`Servidor compatible con NAS activo en puerto ${PORT}`));
