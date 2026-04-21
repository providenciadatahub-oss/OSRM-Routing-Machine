const axios = require('axios');

exports.handler = async (event) => {
  // Encabezados obligatorios para que ArcGIS y el navegador acepten la data
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  const coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  if (!coords) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "No se recibieron coordenadas" }) 
    };
  }

  try {
    // Conexión al motor OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(coords)}?overview=full&geometries=geojson`;
    const response = await axios.get(url);
    const route = response.data.routes[0];

    // Formateo estricto a Esri JSON
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
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: "Error en motor OSRM", detail: error.message }) 
    };
  }
};
