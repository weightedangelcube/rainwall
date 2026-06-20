#!/usr/bin/env bash

# RULES:
# Eliminate golden first, it's the outlier
# LAB -> a greater than 50: golden
# The rest of the categories:
# LAB -> l less than 45:    night
# LAB -> l less than 60:    day
# LAB -> l all other:       noon
# Clear/overcast
# HSI -> s less than 10:   overcast
# HSI -> l else:           clear

rm -r graded && mkdir -p graded/{night,golden,day,noon}/{clear,overcast}

lutgen apply -p catppuccin-latte -l 8 -L 0.001 -P -r 21.5 ./orig/* -o ./graded

cd graded


for file in *; do
    if [ -f "$file" ]; then
        l=$(magick $file -colorspace Oklch -channel 0 -separate +channel -format "%[fx:100*u.mean]\n" info:)
        # c=$(magick $file -colorspace Oklch -channel 1 -separate +channel -format "%[fx:100*u.mean]\n" info:)
        # h=$(magick $file -colorspace Oklch -channel b -separate +channel -format "%[fx:u.mean]\n" info:)

        echo $l

        # if (( $(echo "$h > 285" | bc -l) ))  || (( $(echo "$h < 90" | bc -l) )) ; then
        #     echo $h
        #     mv $file golden/$file
        # fi
    fi
done



# for file in *; do
#     if [ -f "$file" ]; then
#         b=$(magick $file -colorspace LAB -channel b -separate +channel -format "%[fx:100*u.mean]\n" info:)
#         # l=$(magick $file -colorspace LAB -channel r -separate +channel -format "%[fx:100*u.mean]\n" info:)
#         # && (( $(echo "$l > 50" | bc -l) ))
#         a=$(magick $file -colorspace LAB -channel g -separate +channel -format "%[fx:100*u.mean]\n" info:)

#         if (( $(echo "$a > 51" | bc -l) )) && (( $(echo "$b > 47" | bc -l) )) ; then
#             mv $file golden/$file
#         fi

#         # for file in golden/*; do
#         #     if [ -f "$file" ]; then
#         #         if (( $(echo "$a < 55" | bc -l) )) && (( $(echo "$b < 55" | bc -l) )); then
#         #             mv $file ${file%/*}/overcast/${file#*/}
#         #         else
#         #             mv $file ${file%/*}/clear/${file#*/}
#         #         fi
#         #     fi
#         # done

#     fi
# done

# for file in *; do
#     if [ -f "$file" ]; then
#         l=$(magick $file -colorspace LAB -channel r -separate +channel -format "%[fx:100*u.mean]\n" info:)
#         if (( $(echo "$l < 50" | bc -l) )); then
#             mv $file night/$file
#         elif (( $(echo "$l < 60" | bc -l) )); then
#             mv $file day/$file
#         else
#             mv $file noon/$file
#         fi
#     fi
# done

# for file in */*; do
#     if [ -f "$file" ]; then
#         s=$(magick $file -colorspace HSI -channel g -separate +channel -format "%[fx:100*u.mean]\n" info:)

#         if (( $(echo "$s < 15" | bc -l) )); then
#             mv $file ${file%/*}/overcast/${file#*/}
#         else
#             mv $file ${file%/*}/clear/${file#*/}
#         fi
#     fi
# done
