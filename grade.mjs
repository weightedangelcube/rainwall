#!/usr/bin/env zx
import "fs";

await $`rm -f cache.json`;
// await $`lutgen apply -p catppuccin-latte -l 8 -L 0.001 -P -r 21.5 ./orig/* -o ./graded`;
cd("./graded");

const files = await fs.promises.opendir(".");

let json = {};

// set up the data storage
let lightnessData = [];
for (var i = 0; i < 10; i += 2) {
  lightnessData.push({ lightness: i / 10, paths: [] });
}

let chromaData = [];
for (var i = 0; i < 10; i += 2) {
  chromaData.push({ chroma: i / 100, paths: [] });
}

let hueData = [];
for (var i = 0; i < 360; i += 90) {
  hueData.push({ hue: i, paths: [] });
}

// analyze the files
for await (const file of files) {
  const stat = await fs.promises.stat(file.name);
  if (stat.isFile()) {
    let output =
      await $`magick ${file.name} -colorspace Oklch -kmeans 10 -format "%c" histogram:info:`.then(
        (s) =>
          s.stdout
            .split("\n")
            .map((substr) => substr.trim())
            .filter((n) => n),
      );

    if (output.length < 5) {
      // do it again but with more violence
      console.log(
        `-kmeans 10 of ${file.name} didn't give enough colours, trying again with a higher value...`,
      );
      output =
        await $`magick ${file.name} -colorspace Oklch -kmeans 40 -format "%c" histogram:info:`.then(
          (s) =>
            s.stdout
              .split("\n")
              .map((substr) => substr.trim())
              .filter((n) => n),
        );
    }

    let colours = output.map((entry) => {
      let arr = entry.split(" ");
      arr.pop();
      // [# of pixels, oklab colour, hex code]
      return [parseInt(arr[0]), arr[1].replace(/[()]/g, "").split(","), arr[2]];
    });

    colours.sort((a, b) => b[0] - a[0]);

    const dominantColour = colours[0][1];
    console.log(
      `Got oklch(${dominantColour}) as dominant colour of ${file.name}!`,
    );
    const lightness = dominantColour[0];
    const chroma = dominantColour[1];
    const hue = dominantColour[2];

    lightnessData.forEach((n) => {
      let targetLightness = Math.floor(lightness * 5) / 5;
      if (n.lightness == targetLightness) {
        n.paths.push(file.name);
        return;
      }
    });

    chromaData.forEach((n) => {
      let targetChroma = Math.floor(chroma * 50) / 50;
      if (n.chroma == targetChroma) {
        n.paths.push(file.name);
        return;
      }
    });

    hueData.forEach((n) => {
      let targetHue = Math.floor(hue / 90) * 90;
      if (n.hue == targetHue) {
        n.paths.push(file.name);
        return;
      }
    });

    json["lightnessData"] = lightnessData;
    json["chromaData"] = chromaData;
    json["hueData"] = hueData;

    fs.writeFile("./cache.json", JSON.stringify(json), err => {})

    // past 0.3, the image is way too dark to have any discernable colour
  }
}


