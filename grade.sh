#!/usr/bin/env bash

rm -r graded && mkdir -p graded/{morning,afternoon}/{0..3}

lutgen apply -p catppuccin-latte -l 8 -L 0.001 -P -r 21.5 ./orig/* -o ./graded

cd graded


for file in *; do
    if [ -f "$file" ]; then
        h=$(magick $file -colorspace HSI -channel r -separate +channel -format "%[fx:100*u.mean]\n" info:)

        if (( $(echo "$h < 40" | bc -l) )); then
            mv $file morning/$file
        else
            mv $file afternoon/$file
        fi
    fi
done

for file in */*; do
    if [ -f "$file" ]; then
        l=$(magick $file -colorspace LAB -channel r -separate +channel -format "%[fx:100*u.mean]\n" info:)

        if (( $(echo "$l < 50" | bc -l) )); then
            mv $file ${file%/*}/0/${file#*/}
        elif (( $(echo "$l < 60" | bc -l) )); then
            mv $file ${file%/*}/1/${file#*/}
        elif (( $(echo "$l < 70" | bc -l) )); then
            mv $file ${file%/*}/2/${file#*/}
        else
            mv $file ${file%/*}/3/${file#*/}
        fi
    fi
done
