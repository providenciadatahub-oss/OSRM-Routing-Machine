const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  const coords = event.queryStringParameters.coords;
  if (!coords) return { statusCode: 400, headers, body: JSON.stringify({ error: "Faltan coordenadas" }) };

  // Usamos el demo de OSRM. Si la muni levanta uno, cambias esta URL.
  const OSRM_URL = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(OSRM_URL);
    const route = response.data.routes[0];

    const esriResponse = {
      geometryType: "esriGeometryPolyline",
      spatialReference: { wkid: 4326 },
      fields: [
        { name: "OBJECTID", type: "esriFieldTypeOID", alias: "ID" },
        { name: "Distancia_km", type: "esriFieldTypeDouble", alias: "Distancia (km)" },
        { name: "Tiempo_min", type: "esriFieldTypeDouble", alias: "Tiempo (min)" }
      ],
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
      }]
    };

    return { statusCode: 200, headers, body: JSON.stringify(esriResponse) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
