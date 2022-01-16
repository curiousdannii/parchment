# Build Iosevka with our custom options
docker run --rm -it \
    -v $(pwd)/iosevka-config.toml:/build/private-build-plans.toml \
    -v $(pwd)/iosevka:/build/dist/iosevka/woff2 \
    avivace/iosevka-build \
    woff2::iosevka