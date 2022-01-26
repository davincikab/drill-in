const config = {
    iconUrl:'icons/pin.svg',
    statesRef:{
        "bretagne": [48.748945343432936, -6.229248046875001],
		"normandie": [50.24720490139267, -3.9221191406250004],
		"hauts_de_france": [51.16556659836182, .49438476562500006],
		"grand_est": [49.23912083246701, 4.801025390625001],
		"pays_de_la_loire": [47.17477833929906, -5.570068359375001],
		"centre_val_de_loire": [47.41322033016904, -.27465820312500006],
		"bourgogne-franche-comté": [47.41322033016904, 5.394287109375],
		"nouvelle_aquitaine": [45.583289756006316, -3.3947753906250004],
		"occitanie": [43.644025847699496, -.31860351562500006],
		"auvergne_rhone_alpes": [45.67548217560647, 4.053955078125001],
		"provence_alpes_cote_dazur": [44.040218713142146, 6.009521484375],
		"ile_de_france": [0, 0],
		"corse": [0, 0]
    }
};

const map = L.map('map', {
    center: [46.58150100708008, 2.4609055519104004],
    zoom:6,
	minZoom: 6,
	maxZoom: 12,
    doubleClickZoom:false,
    // dragging:false,
    scrollWheelZoom:false,
    maxBoundsViscosity:0,
    zoomControl:false
});

let points = [];
const zoomControl = L.control.zoom();
const resetBtn = document.getElementById("backBtn");
resetBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    resetView();
});

L.tileLayer("https://{s}.tile.openstreetmap.fr/openriverboatmap/{z}/{x}/{y}.png",
{
	attribution: "© OSM Contributors - tiles OpenRiverboatMap",
	transparent: !0,
	opacity: .7
})
.addTo(map);

// regions
// #7AB41D
// #318CE7
// #FFDD50
let tipIcon = L.divIcon({
    className:'',
    html:''
});

let tooltipMarker = L.marker([0,0], {
    icon:tipIcon
}).bindTooltip("")
// .addTo(map);

var activeRegion;
function getFillColor(feature) {
    let color = '#65768a';
    // '';

    if(activeRegion && activeRegion.properties['nom'] == feature.properties['nom']) {
        color = '#fff'
    }

    return color;
}


const regionsJson = L.geoJSON(null, {
    onEachFeature:function(feature, layer){
        layer.on('click', function(e) {
            console.log(e.latlng);

            if(activeRegion && activeRegion !== feature) {
                map.panTo(e.latlng);
                updateCountyPoints(feature);               
            } else {
                map.setZoomAround(e.latlng, 9);
                updateCountyPoints(feature);
            }
           
            activeRegion = feature;
            updateFillColor(e);
        });

        layer.on('mouseover', function(e) {
            // console.log(e.target.feature.properties);
            tooltipMarker.setLatLng(e.latlng).setTooltipContent(feature.properties.nom);
        });

        layer.on('mouseleave', function(e) {
            
        });
    },
    style:function(feature) {
        

        return {
            fillColor:getFillColor(feature),
            fillOpacity:0.8,
            color:'#ddd',
            weight:2,
            className:'county'
        }
    }
})
.addTo(map);

const pntIcons = L.icon({
    iconUrl: config.iconUrl,
	iconSize: this.L.point(12.47, 22)
});

const regionPoints = L.geoJSON(null, {
    onEachFeature:function(feature, layer) {
        // layer.bindPop
    },
    pointToLayer:function(feature, latLng) {
        let popupContent = getPopupContent(feature);

        return L.marker(latLng, {
            icon:pntIcons
        })
        .bindPopup(popupContent);
    }
})
.addTo(map);

function getPopupContent(feature) {
    let { count } = feature.properties;
    console.log("Popup");

    return `<div class="popup-content">
        <div class="content">
            <span class="state">${feature.properties.Title}</span>
            <div class="count-state"><font style="vertical-align: inherit;">
                <font style="vertical-align: inherit;">${count} ${count>1?"Bâtiments":"Bâtiment"}</font></font>
            </div>

            <div><b>Region</b><div>
            <div>${feature.properties.Region}</div>
            <div><b>Description</b><div>
            <div>${feature.properties.Description}</div>
        </div>
        <div>

        </div>
    </div>`
}

const divIcons = function(name, count) {
    const s = `<div style=""><span class="state">${name}</span><span>${count} ${count>1?"Bâtiments":"Bâtiment"}</span></div>`;

    return L.divIcon({
        html: s,
        className: "count-marker"
    });
}

const countPoints = L.geoJSON(null, {
    pointToLayer:function(feature, latLng) {
        let popupContent = ""

        return L.marker(latLng, {
            icon:divIcons(feature.properties.nom, feature.properties.count)
        })
    }
})
.addTo(map)

// load the geojson
fetch('https://davincikab.github.io/drill-in/county.geojson')
.then(res => res.json())
.then(data => {
    regionsJson.addData(data);
})
.catch(console.error)


// load the points
d3.csv('https://docs.google.com/spreadsheets/d/e/2PACX-1vTEF_IRgsIsNx2MGYj313bILCMJTwBACGLFloALbN8HJCAO-CgVx2QlwwYYECCTNZricqZrGcgGh1KM/pub?gid=0&single=true&output=csv')
.then(data => {
    points = data;   

    let pnts = updateCountsData(data);
    // console.log(pnts);

    let geoPnts = getPointGeojson(pnts);
    countPoints.addData(geoPnts);

    points = points.map(pnt => {
        let pt =  pnts.find(a => a.nom == pnt.Region.toLocaleLowerCase());

        if(pt) {
            pnt.count = pt.count;
        } else {
            pnt.count = 0;
        }

        return pnt;
    });
})
.catch(console.error);


function zoomToBounds(layer) {
    map.fitBounds(
        layer.getBounds()
    );
}

function updateCountsData(points) {
    console.log(points);

    return Object.keys(config.statesRef).map(state => {
        let [Latitude, Longitude] = config.statesRef[state];
        let pnts = points.filter(pnt => pnt.Region.toLowerCase() == state);;
        let count = pnts.length;

        return {
            count,
            nom:state.split('_').join(" "),
            Latitude,
            Longitude
        }
    })
}

function updateFillColor(e) {
    regionsJson.eachLayer(layer => {
        layer.getElement().classList.remove("active");
    });

    e.target.getElement().classList.add("active");
}

function getPointGeojson(items) {
    function getFeature(feature) {
        return {
            'type':'Feature',
            'geometry':{
                'type':'Point',
                'coordinates':[parseFloat(feature.Longitude), parseFloat(feature.Latitude)]
            },
            'properties':{...feature}
        }
    };

    return {
        'type':'FeatureCollection',
        'features':[...items.map(getFeature)]
    }
}

function updateCountyPoints(feature) {
    let data = points.filter(pnt => pnt.Region == feature.properties.nom);

    let pGeo = getPointGeojson(data);
    console.log(pGeo);

    regionPoints.clearLayers();
    regionPoints.addData(pGeo);
}

function resetView() {
    console.log("Reset View");
    map.setMinZoom(6);

    map.setView(
        [46.58150100708008, 2.4609055519104004],
        6
    );
    
    map.scrollWheelZoom.disable();

    regionPoints.clearLayers();
    regionsJson.eachLayer(layer => {
        layer.getElement().classList.remove("active");
    });

    activeRegion = null;
}

map.on('zoomend', function(e) {
    let zoom = map.getZoom();

    if(zoom > 6) {
        map.addControl(zoomControl);
        map.scrollWheelZoom.enable();
        map.setMinZoom(8);

        map.removeLayer(countPoints);
    } else {
        map.removeControl(zoomControl);
        map.addLayer(countPoints);
    }
});