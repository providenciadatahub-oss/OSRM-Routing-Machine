const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  // Extraemos las coordenadas con seguridad
  const coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  if (!coords) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "No se recibieron coordenadas" }) 
    };
  }

  try {
    // Usamos encodeURI para proteger la cadena de coordenadas
    const url = `https://router.project-osrm.org/route/v1/driving/${encodeURI(coords)}?overview=full&geometries=geojson`;
    const response = await axios.get(url);
    
    if (!response.data.routes || response.data.routes.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Ruta no encontrada" }) };
    }

    const route = response.data.routes[0];

    // Respuesta formateada para ArcGIS
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
