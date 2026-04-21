const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Buscamos 'coords' en los parámetros de la URL
  const coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  if (!coords) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "Faltan coordenadas", debug: event.queryStringParameters }) 
    };
  }

  try {
    // Llamada a OSRM (Motor público)
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await axios.get(url);
    
    if (!response.data.routes || response.data.routes.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "No se encontró ruta" }) };
    }

    const route = response.data.routes[0];

    // Formato Esri JSON para ArcGIS
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
      body: JSON.stringify({ error: "Error OSRM", detalle: error.message }) 
    };
  }
};
