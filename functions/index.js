const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // 1. Intentar obtener coords de los parámetros de la URL
  let coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  // 2. Si no están ahí, buscarlos en el cuerpo (por si acaso)
  if (!coords && event.body) {
    try {
      const body = JSON.parse(event.body);
      coords = body.coords;
    } catch (e) {
      console.log("No se pudo parsear el body");
    }
  }

  // 3. Si sigue sin haber nada, devolvemos un error detallado
  if (!coords) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "No recibí el parámetro 'coords'", debug: event.queryStringParameters }) 
    };
  }

  const OSRM_URL = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(OSRM_URL);
    const route = response.data.routes[0];

    // Formato Esri
    const esriResponse = {
      geometryType: "esriGeometryPolyline",
      spatialReference: { wkid: 4326 },
      fields: [
        { name: "OBJECTID", type: "esriFieldTypeOID", alias: "ID" },
        { name: "Distancia_km", type: "esriFieldTypeDouble", alias: "Distancia (km)" },
        { name: "Tiempo_min", type: "esriFieldTypeDouble", alias: "Tiempo (min)" }
      ],
      features: [{
        attributes: { OBJECTID: 1, Distancia_km: (route.distance / 1000).toFixed(2), Tiempo_min: (route.duration / 60).toFixed(1) },
        geometry: { paths: [route.geometry.coordinates], spatialReference: { wkid: 4326 } }
      }]
    };

    return { statusCode: 200, headers, body: JSON.stringify(esriResponse) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error OSRM", detail: error.message }) };
  }
};
