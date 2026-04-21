const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  const coords = event.queryStringParameters ? event.queryStringParameters.coords : null;

  if (!coords) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Faltan coords" }) };
  }

  try {
    const response = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const route = response.data.routes[0];

    const esriResponse = {
      geometryType: "esriGeometryPolyline",
      spatialReference: { wkid: 4326 },
      features: [{
        attributes: { OBJECTID: 1, Distancia_km: (route.distance / 1000).toFixed(2), Tiempo_min: (route.duration / 60).toFixed(1) },
        geometry: { paths: [route.geometry.coordinates], spatialReference: { wkid: 4326 } }
      }]
    };

    return { statusCode: 200, headers, body: JSON.stringify(esriResponse) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
