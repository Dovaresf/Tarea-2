// Objeto mapa
var mapa = L.map("mapaid", {
    center: [10.56, -85.70],
    zoom: 14,
});

// Capa base Positron de Carto
positromap = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
    }
).addTo(mapa);

// Capa base de OSM
osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

// Capa base de ESRI World Imagery
esriworld = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
);

// Capas base
var mapasbase = {
    "Carto Positron": positromap,
    OpenStreetMap: osm,
    "ESRI WorldImagery": esriworld,
};

// Control de capas
control_capas = L.control
    .layers(mapasbase, null, { collapsed: false })
    .addTo(mapa);

// Control de escala
L.control.scale().addTo(mapa);

// Capa vectorial de curvas de nivel Bahía El Coco en formato GeoJSON
$.getJSON("datos/curvas_elcoco.geojson", function (geodata) {
    var capa_curvas = L.geoJson(geodata, {
        style: function (feature) {
            return { color: "black", weight: 1, fillOpacity: 0.0 };
        },
        onEachFeature: function (feature, layer) {
            var popupText =
                "<strong>Clase</strong>: " +
                feature.properties.Classes +
                "<br>" +
                "<strong>Profundidad</strong>: " +
                feature.properties.Value +
                " m" +
                "<br>" +
                "<strong>Longitud</strong>: " +
                feature.properties.Shape_Leng +
                " m";
            layer.bindPopup(popupText);
        },
    }).addTo(mapa);

    control_capas.addOverlay(capa_curvas, "Curvas de nivel");
});

// Capa raster Modelo Batimétrico Bahía El Coco
var url_to_geotiff_file = "datos/modelo_elcoco.tif";

fetch(url_to_geotiff_file)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
        parseGeoraster(arrayBuffer).then(georaster => {
            console.log("georaster:", georaster);

            var layer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.5,
                pixelValuesToColorFn: function (value) {
                    if (value <= 0) {
                        return "rgba(255, 255, 255, 0.0)";
                    } else if (value < 10) {
                        return "rgb(44, 123, 182)";
                    } else if (value < 20) {
                        return "rgb(255, 255, 191)";
                    } else if (value < 30) {
                        return "rgb(253, 174, 97)";
                    } else {
                        return "rgb(215, 25, 28)";
                    }
                },
                resolution: 250 // Parámetro para ajustar la resolución de visualización
            });
            layer.addTo(mapa);

            // Capa raster en control de capas
            control_capas.addOverlay(layer, "Modelo de interpolación de profundidades");

            // Evento onClick
            mapa.on("click", function (event) {
                var lat = event.latlng.lat;
                var lng = event.latlng.lng;
                var tmp = geoblaze.identify(georaster, [lng, lat]);

                // Borrar marcadores previos
                mapa.eachLayer(function (layer) {
                    if (layer instanceof L.Marker) {
                        mapa.removeLayer(layer);
                    }
                });

                // Marcador con ventana popup
                var marcador = L.marker([lat, lng])
                    .addTo(mapa)
                    .bindPopup("Profundidad: " + Math.round(tmp, 1) + " m")
                    .openPopup();
            });
        });
    });

// Capa vectorial de puntos batimetría convencional Bahía El Coco en formato GeoJSON
$.getJSON("datos/batimetria_convencional.geojson", function (geodata) {
    var capa_batimetria_convencional = L.geoJson(geodata, {
        pointToLayer: function (feature, latlng) {
            var icono = L.circleMarker(latlng, {
                radius: 4, // Tamaño del círculo
                fillColor: "#0000FF", // Color de relleno
                color: "#0000FF", // Color del borde
                weight: 1, // Grosor del borde
                opacity: 1, // Opacidad del borde
                fillOpacity: 0.7 // Opacidad del relleno
            });
            return icono;
        },
        onEachFeature: function (feature, layer) {
            var popupText =
                "<strong>ID punto</strong>: " +
                feature.properties.field_1 +
                "<br>" +
                "<strong>Profundidad</strong>: " +
                feature.properties.field_4 +
                " m";
                "<strong>Latitud</strong>: " +
                feature.properties.latitud +
                " °";
                "<strong>Longitud</strong>: " +
                feature.properties.longitud +
                " °";
            layer.bindPopup(popupText);
        },
    }).addTo(mapa);

    control_capas.addOverlay(capa_batimetria_convencional, "Puntos levantamiento batimétrico");

// Capa de puntos agrupados
var capa_batimetria_convencional_agrupados = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
});
capa_batimetria_convencional_agrupados.addLayer(capa_batimetria_convencional);

// Se añade la capa al mapa y al control de capas
capa_batimetria_convencional_agrupados.addTo(mapa);
control_capas.addOverlay(
    capa_batimetria_convencional_agrupados,
    "Registros agrupados por valores promedio de profundidad"
);
control_capas.addOverlay(capa_batimetria_convencional, "Registros individuales de profundidad");
});