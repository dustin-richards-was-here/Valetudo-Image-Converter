const path = require("path");
const fs = require("fs");

const FourColorTheoremSolver = require("./lib/map-color-finder");

console.info("Valetudo-Image-Converter");

if(process.argv.length !== 4) {
    console.info("\n");
    console.info("Usage: node app.js /path/to/map.json /path/to/output.ppm\n\n");
    process.exit(0);
}

let mapData;

const mapFilename = process.argv[2];
const outputFilename = process.argv[3];

try {
    mapData = require(mapFilename);
} catch(e) {
    console.error("Error while opening map file");
    process.exit(-1);
}
if(!mapData.__class === "ValetudoMap") {
    console.error("Invalid Map File");
    process.exit(-1);
}

if (mapData.metaData?.version === 2 && Array.isArray(mapData.layers)) {
    mapData.layers.forEach(layer => {
        if(layer.pixels.length === 0 && layer.compressedPixels.length !== 0) {
            for (let i = 0; i < layer.compressedPixels.length; i = i + 3) {
                const xStart = layer.compressedPixels[i];
                const y = layer.compressedPixels[i+1]
                const count = layer.compressedPixels[i+2]

                for(let j = 0; j < count; j++) {
                    layer.pixels.push(
                        xStart + j,
                        y
                    );
                }
            }
        }
    })
}

console.info("Calculating colors");
console.time("colorCalculation");
const colorFinder = new FourColorTheoremSolver(mapData.layers, 6);
console.timeEnd("colorCalculation");

let imgArr = Array(mapData.size.y);

for (let i = 0; i < mapData.size.y; i++)
{
    imgArr[i] = Array(mapData.size.x);

    for (let j = 0; j < mapData.size.x; j++)
    {
        imgArr[i][j] = [ 255, 255, 255 ];
    }
}

const colors = [
    [ 0xDF, 0x75, 0x99 ], // red
    [ 0xFF, 0xC7, 0x85 ], // yellow
    [ 0x72, 0xD6, 0xC9 ], // green
    [ 0x71, 0x89, 0xBF ], // blue
];

let maxX = 0;
let maxY = 0;
let minX = 9999999;
let minY = 9999999;
const margin = 20;

console.info("Drawing Map");
console.time("drawMap");
mapData.layers.forEach(layer => {

    for(let i = 0; i < layer.pixels.length ; i = i+2) {
        const x = layer.pixels[i];
        const y = layer.pixels[i+1];

        switch(layer.type) {
            case "floor":
                imgArr[y][x] = [0, 0, 255];
                break;
            case "segment":
                imgArr[y][x] = colors[colorFinder.getColor((layer.metaData.segmentId))];
                break;
            case "wall":
                imgArr[y][x] = [127, 127, 127];
                break;
        }

        if (x < minX)
            minX = x;

        if (x > maxX)
            maxX = x;

        if (y < minY)
            minY = y;

        if (y > maxY)
            maxY = y;
    }
});

minY -= margin;
maxY += margin;
minX -= margin;
maxX += margin;

cropWidth = maxX - minX + 1;
cropHeight = maxY - minY + 1;
console.timeEnd("drawMap");

console.info("Exporting");
console.time("export");
// export a binary PPM since it's easy to write one with no libraries
fd = fs.openSync(outputFilename, 'w');
fs.writeSync(fd, "P6\n");
fs.writeSync(fd, String(cropWidth) + "\n");
fs.writeSync(fd, String(cropHeight) + "\n");
fs.writeSync(fd, "255\n");

for (let i = minY; i < maxY + 1; i++)
{
    for (let j = minX; j < maxX + 1; j++)
    {
        fs.writeSync(fd, Buffer.from(imgArr[i][j]));
    }
}
console.timeEnd("export");

console.info("Rendered sucessfully");
