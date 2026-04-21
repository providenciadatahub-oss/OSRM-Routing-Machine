const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  // Capturamos el parámetro 'coords' con seguridad
  const coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  if (!coords) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "No se recibieron coordenadas", recibido: event.queryStringParameters }) 
    };
  }

  try {
    const OSRM_URL = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await axios.get(OSRM_URL);
    const route = response.data.routes[0];

    // Formato Esri puro
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
      }]
    };

    return { statusCode: 200, headers, body: JSON.stringify(esriResponse) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
