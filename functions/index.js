const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// Habilitamos CORS para que ArcGIS Online no bloquee la petición
app.use(cors());
app.use(express.json());

// Servir el visor por si quieres entrar a la URL directa
app.use(express.static('public'));

// EL ENDPOINT PARA EL WIDGET DE DIRECCIONES
app.all('/solve', async (req, res) => {
    // 1. Extraemos las coordenadas (stops para ArcGIS, coords para tu lógica previa)
    let coords = req.query.coords || req.query.stops;

    // Si viene de la herramienta Direcciones nativa, llegará como un JSON en 'stops'
    if (req.query.stops) {
        try {
            const stopsData = JSON.parse(req.query.stops);
            coords = stopsData.features.map(f => `${f.geometry.x},${f.geometry.y}`).join(';');
        } catch (e) {
            console.error("Error parseando stops de ArcGIS");
        }
    }

    if (!coords) {
        return res.status(400).json({ error: "No se recibieron coordenadas" });
    }

    try {
        // 2. Tu lógica original de OSRM con encodeURI
        const url = `https://router.project-osrm.org/route/v1/driving/${encodeURI(coords)}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        
        if (!response.data.routes || response.data.routes.length === 0) {
            return res.status(404).json({ error: "Ruta no encontrada" });
        }

        const route = response.data.routes[0];

        // 3. Tu estructura esriResponse integrada
        // Importante: ArcGIS Direcciones busca el objeto 'routes' o 'features' directamente
        const esriResponse = {
            geometryType: "esriGeometryPolyline",
            spatialReference: { wkid: 4326 },
            features: [{
                attributes: { 
                    OBJECTID: 1, 
                    Distancia_km: (route.distance / 1000).toFixed(2), 
                    Tiempo_min: (route.duration / 60).toFixed(1) 
                },
                geometry: { 
                    paths: [route.geometry.coordinates], 
                    spatialReference: { wkid: 4326 } 
                }
            }],
            // Añadimos este envoltorio para máxima compatibilidad con el widget nativo
            routes: {
                features: [{
                    attributes: { OBJECTID: 1 },
                    geometry: { paths: [route.geometry.coordinates], spatialReference: { wkid: 4326 } }
                }]
            }
        };

        res.status(200).json(esriResponse);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de ruteo Providencia corriendo en puerto ${PORT}`);
});
