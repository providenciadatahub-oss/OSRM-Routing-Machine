const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// CORS configurado para aceptar todo lo que ArcGIS Online envíe
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. ENDPOINT DE VALIDACIÓN INICIAL (Raíz del servicio)
// El widget lo consulta para verificar la existencia del NAServer
app.get('/solve/NAServer/Route', (req, res) => {
    res.json({
        currentVersion: 10.81,
        fullVersion: "10.8.1",
        serviceDescription: "Servicio de Ruteo OSRM - Municipalidad de Providencia",
        isReadOnly: true,
        capabilities: "Route",
        routeNetworkName: "OSRM_Network",
        supportedQueryFormats: "JSON",
        maxRecordCount: 1000,
        units: "esriSRUnit_Meter",
        directionsLanguage: "es-ES"
    });
});

// 2. ENDPOINT DE CAPACIDADES (Info técnica del servicio)
app.get('/solve/NAServer/Route/info', (req, res) => {
    res.json({
        currentVersion: 10.81,
        serviceDescription: "Ruteo Dinámico Providencia",
        capabilities: "Route"
    });
});

// 3. EL SOLVE (El motor que integra tu lógica)
app.all('/solve/NAServer/Route/solve', async (req, res) => {
    // ArcGIS puede enviar por GET o POST
    const params = { ...req.query, ...req.body };
    const { stops } = params;

    if (!stops) {
        return res.status(400).json({ error: { code: 400, message: "No stops provided." } });
    }

    try {
        const stopsData = typeof stops === 'string' ? JSON.parse(stops) : stops;
        
        // Transformación para OSRM
        const coords = stopsData.features.map(f => {
            return `${f.geometry.x.toFixed(6)},${f.geometry.y.toFixed(6)}`;
        }).join(';');

        // Tu lógica OSRM con encodeURI
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${encodeURI(coords)}?overview=full&geometries=geojson`;
        const response = await axios.get(osrmUrl);
        const route = response.data.routes[0];

        // RESPUESTA COMPATIBLE CON EL WIDGET NATIVO
        const nasResponse = {
            routes: {
                spatialReference: { wkid: 4326, latestWkid: 4326 },
                features: [{
                    attributes: {
                        Name: "Ruta Providencia",
                        Total_Kilometers: (route.distance / 1000).toFixed(2),
                        Total_Minutes: (route.duration / 60).toFixed(1)
                    },
                    geometry: {
                        paths: [route.geometry.coordinates],
                        spatialReference: { wkid: 4326 }
                    }
                }]
            },
            messages: []
        };

        // Forzamos el tipo de contenido a JSON de ArcGIS
        res.setHeader('Content-Type', 'application/json');
        res.json(nasResponse);

    } catch (error) {
        res.status(500).json({ error: { code: 500, message: error.message } });
    }
});

app.listen(PORT, () => console.log(`Proxy NAS activo y compatible en puerto ${PORT}`));
